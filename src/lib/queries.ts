import { docClient, TABLE_NAME } from "./dynamodb";
import { GetCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

export interface DropMetadata {
  PK: string;
  SK: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  imageUrl: string;
  sellerId: string;
  status: string;
}

export interface InventoryItem {
  availableCount: number;
  price: number;
  sku: string;
}

export interface OrderItem {
  PK: string;
  SK: string;
  dropId: string;
  productId: string;
  status: string;
  total: number;
  timestamp: string;
  email: string;
  GSI1PK: string;
  GSI1SK: string;
}

export interface SellerDrop {
  PK: string;
  SK: string;
  title: string;
  status: string;
  createdAt: string;
}

/**
 * 1. getDrop: Fetches drop metadata
 */
export async function getDrop(dropId: string): Promise<DropMetadata | null> {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `DROP#${dropId}`,
      SK: "METADATA",
    },
  });

  try {
    const response = await docClient.send(command);
    return (response.Item as DropMetadata) || null;
  } catch (error) {
    console.error(`Error in getDrop for dropId ${dropId}:`, error);
    return null;
  }
}

/**
 * 2. getInventory: Fetches inventory status for a specific product in a drop
 */
export async function getInventory(
  dropId: string,
  productId: string
): Promise<InventoryItem | null> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `DROP#${dropId}`,
      ":sk": `INVENTORY#${productId}`,
    },
  });

  try {
    const response = await docClient.send(command);
    const items = response.Items || [];
    if (items.length === 0) return null;

    let availableCount = 0;
    let price = 0;
    let sku = "";

    for (const item of items) {
      availableCount += item.availableCount || 0;
      price = item.price || price;
      sku = item.sku || sku;
    }

    return {
      availableCount,
      price,
      sku,
    };
  } catch (error) {
    console.error(`Error in getInventory for dropId ${dropId}, productId ${productId}:`, error);
    return null;
  }
}

/**
 * 3. getDropsByStatus: Query GSI2 using status attribute as key
 */
export async function getDropsByStatus(status: string): Promise<DropMetadata[]> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "GSI2",
    KeyConditionExpression: "GSI2PK = :gsi2pk",
    ExpressionAttributeValues: {
      ":gsi2pk": status,
    },
  });

  try {
    const response = await docClient.send(command);
    return (response.Items as DropMetadata[]) || [];
  } catch (error) {
    console.error(`Error in getDropsByStatus for status ${status}:`, error);
    return [];
  }
}

/**
 * 4. getUserOrders: Retrieves order history for a specific user
 */
export async function getUserOrders(userId: string): Promise<OrderItem[]> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `USER#${userId}`,
      ":sk": "ORDER#",
    },
  });

  try {
    const response = await docClient.send(command);
    return (response.Items as OrderItem[]) || [];
  } catch (error) {
    console.error(`Error in getUserOrders for userId ${userId}:`, error);
    return [];
  }
}

/**
 * 5. getDropOrders: Retrieves successful checkouts for a drop using GSI1
 */
export async function getDropOrders(dropId: string): Promise<OrderItem[]> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)",
    ExpressionAttributeValues: {
      ":gsi1pk": `DROP#${dropId}`,
      ":gsi1sk": "ORDER#",
    },
    ScanIndexForward: false,
  });

  try {
    const response = await docClient.send(command);
    return (response.Items as OrderItem[]) || [];
  } catch (error) {
    console.error(`Error in getDropOrders for dropId ${dropId}:`, error);
    return [];
  }
}

/**
 * 6. getSellerDrops: Retrieves drops created by a specific seller
 */
export async function getSellerDrops(sellerId: string): Promise<SellerDrop[]> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `SELLER#${sellerId}`,
      ":sk": "DROP#",
    },
  });

  try {
    const response = await docClient.send(command);
    return (response.Items as SellerDrop[]) || [];
  } catch (error) {
    console.error(`Error in getSellerDrops for sellerId ${sellerId}:`, error);
    return [];
  }
}
