import { nanoid } from "nanoid";
import { docClient, TABLE_NAME } from "./dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

export interface CheckoutParams {
  dropId: string;
  productId: string;
  userId: string;
  email?: string;
  price?: number;
}

export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  reason?: "SOLD_OUT" | "ERROR";
  error?: string;
}

/**
 * createOrder: Atomic transaction checkout to decrement inventory and create an order record.
 */
export async function createOrder({
  dropId,
  productId,
  userId,
  email = "unknown@example.com",
  price = 0,
}: CheckoutParams): Promise<CheckoutResult> {
  const orderId = nanoid();
  const timestamp = new Date().toISOString();

  let candidateShards = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  while (candidateShards.length > 0) {
    const randIndex = Math.floor(Math.random() * candidateShards.length);
    const shardId = candidateShards[randIndex];

    const command = new TransactWriteCommand({
      TransactItems: [
        {
          // 1. Decrement inventory count on this shard if stock is available (> 0) and price matches (TOCTOU race protection)
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: `DROP#${dropId}`,
              SK: `INVENTORY#${productId}#SHARD#${shardId}`,
            },
            UpdateExpression: "SET availableCount = availableCount - :one",
            ConditionExpression: "availableCount > :zero AND price = :expectedPrice",
            ExpressionAttributeValues: {
              ":one": 1,
              ":zero": 0,
              ":expectedPrice": price,
            },
          },
        },
        {
          // 2. Write the user order record
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${userId}`,
              SK: `ORDER#${orderId}`,
              dropId,
              productId,
              status: "CONFIRMED",
              total: price,
              timestamp,
              email,
              GSI1PK: `DROP#${dropId}`,
              GSI1SK: `ORDER#${timestamp}#${orderId}`,
            },
          },
        },
        {
          // 3. Write an idempotency token to prevent duplicate checkout for this user + drop combination
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `USER#${userId}`,
              SK: `IDEMPOTENCY#${dropId}`,
              orderId,
              timestamp,
            },
            ConditionExpression: "attribute_not_exists(PK)",
          },
        },
      ],
    });

    try {
      await docClient.send(command);
      return { success: true, orderId };
    } catch (error: any) {
      if (error.name === "TransactionCanceledException") {
        const reasons = error.CancellationReasons || [];
        
        // Check for idempotency check failure first
        const idempotencyFailed = reasons[2]?.Code === "ConditionalCheckFailed";
        if (idempotencyFailed) {
          return {
            success: false,
            reason: "ERROR",
            error: "Duplicate checkout request detected. You have already purchased this item.",
          };
        }

        const inventoryFailed = reasons[0]?.Code === "ConditionalCheckFailed";
        if (inventoryFailed) {
          // Shard is empty or price mismatched.
          // We remove the shard and try another shard (if price mismatched, all will fail and exit loop)
          candidateShards = candidateShards.filter((s) => s !== shardId);
          continue;
        }
      }

      return {
        success: false,
        reason: "ERROR",
        error: error.message || "An unknown error occurred during transaction execution.",
      };
    }
  }

  // If we exhausted all shards, verify if it was a price change or actually sold out
  const { getInventory } = await import("./queries");
  const currentInventory = await getInventory(dropId, productId);
  if (currentInventory && currentInventory.price !== price) {
    return {
      success: false,
      reason: "ERROR",
      error: `Price changed during checkout (expected ₹${(price / 100).toFixed(2)}, got ₹${(currentInventory.price / 100).toFixed(2)}). Please try again.`,
    };
  }

  return { success: false, reason: "SOLD_OUT" };
}
