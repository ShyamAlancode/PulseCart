import { NextResponse } from "next/server";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dropId } = await params;

    if (!dropId) {
      return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
    }

    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `DROP#${dropId}`,
        SK: "INVENTORY#DEFAULT",
      },
    });

    const response = await docClient.send(command);
    
    if (!response.Item) {
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }

    return NextResponse.json({
      availableCount: response.Item.availableCount,
      baseInventory: response.Item.baseInventory,
      price: response.Item.price,
    });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("[GetStock] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
