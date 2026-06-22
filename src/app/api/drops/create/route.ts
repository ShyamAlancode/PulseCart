import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Get session and check role
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    const role = user?.role;

    // Support both "seller" and "ADMIN" (for testing sandbox credentials)
    if (!session || !user || (role !== "seller" && role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Only sellers can create drops." },
        { status: 403 }
      );
    }

    const sellerId = user.id || "seller-001";

    // 2. Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Bad Request", message: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      price,
      inventoryCount,
      startTime,
      endTime,
      imageUrl,
    } = body;

    // 3. Validate all fields present
    if (
      !title ||
      !description ||
      price === undefined ||
      inventoryCount === undefined ||
      !startTime ||
      !endTime ||
      !imageUrl
    ) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "Missing required fields: title, description, price, inventoryCount, startTime, endTime, imageUrl.",
        },
        { status: 400 }
      );
    }

    // 4. Generate unique identifiers
    const dropId = nanoid();
    const productId = nanoid();
    const createdAt = new Date().toISOString();

    // 5. Execute sharded atomic write transaction
    const transactItems: Array<{
      Put: {
        TableName: string;
        Item: Record<string, string | number | undefined>;
      };
    }> = [
      {
        // A. Drop Metadata
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `DROP#${dropId}`,
            SK: "METADATA",
            title,
            description,
            startTime,
            endTime,
            imageUrl,
            sellerId,
            status: "SCHEDULED",
            totalStock: Number(inventoryCount),
            GSI2PK: "DROP",
            GSI2SK: startTime,
          },
        },
      },
      {
        // C. Seller Drop Link
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `SELLER#${sellerId}`,
            SK: `DROP#${dropId}`,
            title,
            status: "SCHEDULED",
            createdAt,
          },
        },
      },
    ];

    // B. Distribute inventoryCount across 10 shards
    const count = Number(inventoryCount);
    const baseShare = Math.floor(count / 10);
    const remainder = count % 10;

    for (let shardId = 0; shardId < 10; shardId++) {
      const shardStock = baseShare + (shardId < remainder ? 1 : 0);
      transactItems.push({
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `DROP#${dropId}`,
            SK: `INVENTORY#${productId}#SHARD#${shardId}`,
            availableCount: shardStock,
            baseInventory: shardStock,
            price: Number(price),
            sku: dropId,
          },
        },
      });
    }

    const command = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await docClient.send(command);

    // 6. Return response
    return NextResponse.json(
      { success: true, dropId, productId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating drop:", error);
    const errMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: errMessage },
      { status: 500 }
    );
  }
}
