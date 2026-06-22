import { docClient, TABLE_NAME } from "./dynamodb";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
  totalStock?: number;
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

export interface AggregatedInventory {
  availableCount: number;
  baseInventory: number;
  price: number;
  SK: string;
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
 * 2.5. getAggregatedInventory: Fetches and aggregates inventory status across all shards for a drop
 */
export async function getAggregatedInventory(
  dropId: string
): Promise<AggregatedInventory | null> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": `DROP#${dropId}`,
      ":sk": "INVENTORY#",
    },
  });

  try {
    const response = await docClient.send(command);
    const items = response.Items || [];
    if (items.length === 0) return null;

    const aggregated = {
      availableCount: 0,
      baseInventory: 0,
      price: items[0].price || 0,
      SK: items[0].SK,
    };

    for (const item of items) {
      aggregated.availableCount += item.availableCount || 0;
      aggregated.baseInventory += item.baseInventory || 0;
    }

    return aggregated;
  } catch (error) {
    console.error(`Error in getAggregatedInventory for dropId ${dropId}:`, error);
    return null;
  }
}

/**
 * 3. getAllDrops: Query GSI2 using a static "DROP" key to retrieve all drops, sorted chronologically by startTime (GSI2SK)
 */
export async function getAllDrops(): Promise<DropMetadata[]> {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "GSI2",
    KeyConditionExpression: "GSI2PK = :gsi2pk",
    ExpressionAttributeValues: {
      ":gsi2pk": "DROP",
    },
  });

  try {
    const response = await docClient.send(command);
    return (response.Items as DropMetadata[]) || [];
  } catch (error) {
    console.error("Error in getAllDrops:", error);
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
