import { auth } from "@/auth";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // 1. Get session and check role
    const session = await auth();
    const user = session?.user as any;
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
    } catch (err) {
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

    // 5. Execute 3-item atomic write transaction
    const command = new TransactWriteCommand({
      TransactItems: [
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
            },
          },
        },
        {
          // B. Drop Inventory
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `DROP#${dropId}`,
              SK: `INVENTORY#${productId}`,
              availableCount: Number(inventoryCount),
              baseInventory: Number(inventoryCount),
              price: Number(price),
              sku: dropId,
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
      ],
    });

    await docClient.send(command);

    // 6. Return response
    return NextResponse.json(
      { success: true, dropId, productId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating drop:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
