import { NextResponse } from "next/server";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dropId } = await params;

    if (!dropId) {
      return NextResponse.json({ error: "Missing dropId parameter" }, { status: 400 });
    }

    // Single query fetches all records in the partition: METADATA and INVENTORY#DEFAULT
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `DROP#${dropId}`,
      },
    });

    const response = await docClient.send(command);
    const items = response.Items || [];

    if (items.length === 0) {
      return NextResponse.json({ error: "Drop not found" }, { status: 404 });
    }

    const metadataItem = items.find((item) => item.SK === "METADATA");
    const inventoryItem = items.find((item) => item.SK.startsWith("INVENTORY#"));

    if (!metadataItem) {
      return NextResponse.json({ error: "Drop metadata not found" }, { status: 404 });
    }

    // Merge metadata details and inventory status
    const dropData = {
      id: dropId,
      title: metadataItem.title,
      description: metadataItem.description,
      price: metadataItem.price,
      imageUrl: metadataItem.imageUrl,
      startTime: metadataItem.startTime,
      endTime: metadataItem.endTime,
      status: metadataItem.status,
      totalStock: metadataItem.totalStock,
      availableCount: inventoryItem ? inventoryItem.availableCount : 0,
    };

    return NextResponse.json(dropData);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("[GetDrop] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
