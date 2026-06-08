import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fake",
    secretAccessKey: "fake",
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "PulseCart";

async function main() {
  const args = process.argv.slice(2);
  const isReset = args.includes("--reset");

  if (isReset) {
    console.log("Resetting inventory for drop-001 / product-001 back to 50...");
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: "DROP#drop-001",
        SK: "INVENTORY#product-001",
        availableCount: 50,
        baseInventory: 50,
        price: 1999,
        sku: "AM-001-BLK",
      },
    });
    try {
      await docClient.send(command);
      console.log("SUCCESS: Reset availableCount to 50.");
      return;
    } catch (error) {
      console.error("Failed to reset inventory:", error);
      process.exit(1);
    }
  }

  console.log("Seeding drop-001 to local DynamoDB...");

  const now = new Date();
  const startTime = new Date(now.getTime() + 2 * 60 * 1000).toISOString();
  const endTime = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const createdAt = now.toISOString();

  const command = new BatchWriteCommand({
    RequestItems: {
      [TABLE_NAME]: [
        {
          PutRequest: {
            Item: {
              PK: "DROP#drop-001",
              SK: "METADATA",
              title: "Limited Air Max Drop",
              description: "Only 50 pairs. No restocks.",
              startTime,
              endTime,
              imageUrl: "https://placehold.co/600x400",
              sellerId: "seller-001",
              status: "SCHEDULED",
              totalStock: 50,
            },
          },
        },
        ...Array.from({ length: 10 }).map((_, shardId) => ({
          PutRequest: {
            Item: {
              PK: "DROP#drop-001",
              SK: `INVENTORY#product-001#SHARD#${shardId}`,
              availableCount: 5,
              baseInventory: 5,
              price: 1999,
              sku: "AM-001-BLK",
            },
          },
        })),
        {
          PutRequest: {
            Item: {
              PK: "SELLER#seller-001",
              SK: "DROP#drop-001",
              title: "Limited Air Max Drop",
              status: "SCHEDULED",
              createdAt,
            },
          },
        },
      ],
    },
  });

  try {
    const response = await docClient.send(command);
    
    // Check for unprocessed items
    if (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0) {
      console.error("Some items failed to write:", JSON.stringify(response.UnprocessedItems));
    } else {
      console.log("SUCCESS: Wrote DROP#drop-001 METADATA item.");
      console.log("SUCCESS: Wrote DROP#drop-001 INVENTORY#product-001 item.");
      console.log("SUCCESS: Wrote SELLER#seller-001 DROP#drop-001 connection item.");
      console.log("Local DynamoDB table seeded successfully!");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
}

main();
