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
  } catch (error) {
    const err = error as { name?: string };
    if (err.name === "ResourceNotFoundException") {
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

  const now = new Date();
  const createdAt = now.toISOString();

  // ─────────────────────────────────────────────────────────────────────────
  // Drop definitions — covers 4 distinct time states for a full catalog view
  // ─────────────────────────────────────────────────────────────────────────
  const drops = [
    {
      id: "drop-001",
      productId: "product-001",
      sku: "AM-001-BLK",
      title: "Limited Air Max Drop",
      description:
        "Only 50 pairs. Exclusive colourway, no restocks. Secured by DynamoDB atomic transactions — zero oversell, zero drama.",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop",
      sellerId: "seller-001",
      price: 1999,
      totalStock: 50,
      shards: 10,
      unitsPerShard: 5,
      // ACTIVE: started 5 minutes ago, ends in 25 minutes
      startTime: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
      endTime: new Date(now.getTime() + 25 * 60 * 1000).toISOString(),
    },
    {
      id: "drop-002",
      productId: "product-002",
      sku: "JP-002-WHT",
      title: "Phantom Jersey — Collector Edition",
      description:
        "100 jerseys, signed design series. Ships worldwide. Each checkout is an atomic DynamoDB transaction — first come, first served, mathematically guaranteed.",
      imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop",
      sellerId: "seller-001",
      price: 3499,
      totalStock: 100,
      shards: 10,
      unitsPerShard: 10,
      // UPCOMING: starts in 2 hours
      startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "drop-003",
      productId: "product-003",
      sku: "HS-003-GLD",
      title: "Aurora Hoodie — Midnight Gold",
      description:
        "Limited to 30 units globally. Heavyweight 400gsm fleece, embroidered. Drop window is 20 minutes. No waitlist restocks.",
      imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&h=600&fit=crop",
      sellerId: "seller-001",
      price: 4999,
      totalStock: 30,
      shards: 10,
      unitsPerShard: 3,
      // UPCOMING: starts in 24 hours
      startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 20 * 60 * 1000).toISOString(),
    },
    {
      id: "drop-004",
      productId: "product-004",
      sku: "WR-004-BLK",
      title: "Carbon Series Wristwatch",
      description:
        "20 units. Carbon fibre case, sapphire crystal. This drop has ended — a testament to what PulseCart enables: every unit sold, zero oversells.",
      imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=600&fit=crop",
      sellerId: "seller-001",
      price: 24999,
      totalStock: 20,
      shards: 10,
      unitsPerShard: 0, // ended + sold out
      // PAST: ended 3 hours ago
      startTime: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ];

  console.log(`Seeding ${drops.length} drops to local DynamoDB...`);

  for (const drop of drops) {
    const items = [
      // Drop METADATA record
      {
        PutRequest: {
          Item: {
            PK: `DROP#${drop.id}`,
            SK: "METADATA",
            title: drop.title,
            description: drop.description,
            startTime: drop.startTime,
            endTime: drop.endTime,
            imageUrl: drop.imageUrl,
            sellerId: drop.sellerId,
            status: "SCHEDULED",
            totalStock: drop.totalStock,
            GSI2PK: "DROP",
            GSI2SK: drop.startTime,
          },
        },
      },
      // Inventory SHARD records (10 shards each)
      ...Array.from({ length: drop.shards }).map((_, shardId) => ({
        PutRequest: {
          Item: {
            PK: `DROP#${drop.id}`,
            SK: `INVENTORY#${drop.productId}#SHARD#${shardId}`,
            availableCount: drop.unitsPerShard,
            baseInventory: drop.unitsPerShard,
            price: drop.price,
            sku: drop.sku,
          },
        },
      })),
      // SELLER relationship record
      {
        PutRequest: {
          Item: {
            PK: `SELLER#${drop.sellerId}`,
            SK: `DROP#${drop.id}`,
            title: drop.title,
            status: "SCHEDULED",
            createdAt,
          },
        },
      },
    ];

    // DynamoDB BatchWrite supports max 25 items — write in chunks
    const CHUNK_SIZE = 25;
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      const response = await docClient.send(
        new BatchWriteCommand({ RequestItems: { [TABLE_NAME]: chunk } })
      );
      if (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0) {
        console.error(`[${drop.id}] Some items failed to write:`, response.UnprocessedItems);
      }
    }

    console.log(`  ✓ Seeded ${drop.id}: "${drop.title}" (${drop.totalStock} units)`);
  }

  console.log("\nSEED COMPLETE: Local DynamoDB table seeded with 4 drops.");
  console.log("  drop-001 → ACTIVE (live now)");
  console.log("  drop-002 → UPCOMING (2 hours)");
  console.log("  drop-003 → UPCOMING (24 hours)");
  console.log("  drop-004 → ENDED (sold out)");
}

main();

