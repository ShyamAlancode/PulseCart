import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "fake",
    secretAccessKey: "fake",
  },
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertClassInstanceToMap: true,
    removeUndefinedValues: true,
  },
});
const TABLE_NAME = "PulseCart";

async function ensureTableExists() {
  const describeCommand = new DescribeTableCommand({ TableName: TABLE_NAME });
  try {
    const desc = await client.send(describeCommand);
    // Check if table contains GSI2 index. If not, recreate it.
    const hasGSI2 = desc.Table?.GlobalSecondaryIndexes?.some(gsi => gsi.IndexName === "GSI2");
    if (!hasGSI2) {
      console.log("GSI2 index is missing. Deleting and recreating local table...");
      await client.send(new DeleteTableCommand({ TableName: TABLE_NAME }));
      // wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      throw { name: "ResourceNotFoundException" };
    }
    console.log(`Table ${TABLE_NAME} exists and is configured correctly.`);
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`Table ${TABLE_NAME} does not exist or was deleted. Creating it...`);
      const createCommand = new CreateTableCommand({
        TableName: TABLE_NAME,
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
          { AttributeName: "GSI1PK", AttributeType: "S" },
          { AttributeName: "GSI1SK", AttributeType: "S" },
          { AttributeName: "GSI2PK", AttributeType: "S" },
          { AttributeName: "GSI2SK", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "GSI1",
            KeySchema: [
              { AttributeName: "GSI1PK", KeyType: "HASH" },
              { AttributeName: "GSI1SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
          {
            IndexName: "GSI2",
            KeySchema: [
              { AttributeName: "GSI2PK", KeyType: "HASH" },
              { AttributeName: "GSI2SK", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        ],
        BillingMode: "PAY_PER_REQUEST",
      });
      await client.send(createCommand);
      console.log(`SUCCESS: Created table ${TABLE_NAME} with GSI1 and GSI2.`);
      // Wait a moment for active status
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      throw error;
    }
  }
}

async function main() {
  await ensureTableExists();

  const args = process.argv.slice(2);
  const isReset = args.includes("--reset");

  if (isReset) {
    console.log("Resetting inventory for drop-001 / product-001 back to 50 across 10 shards...");
    try {
      // Clean old legacy non-sharded row if it exists
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: "DROP#drop-001",
          SK: "INVENTORY#product-001",
        }
      }));

      // Set shards back to 5 each (total 50)
      for (let shardId = 0; shardId < 10; shardId++) {
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: "DROP#drop-001",
            SK: `INVENTORY#product-001#SHARD#${shardId}`,
            availableCount: 5,
            baseInventory: 5,
            price: 1999,
            sku: "AM-001-BLK",
          },
        }));
      }
      console.log("SUCCESS: Reset inventory shards successfully.");
      return;
    } catch (error) {
      console.error("Failed to reset inventory shards:", error);
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
              GSI2PK: "SCHEDULED",
              GSI2SK: startTime,
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
    if (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0) {
      console.error("Some items failed to write:", JSON.stringify(response.UnprocessedItems));
    } else {
      console.log("Local DynamoDB table seeded successfully with GSI2 indices!");
    }
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
}

main();
