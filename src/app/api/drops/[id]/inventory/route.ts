import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dropId } = await params;
    
    if (!dropId) {
      return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
    }

    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `DROP#${dropId}`,
        ":sk": "INVENTORY#",
      },
    });
    
    const response = await docClient.send(command);
    const items = response.Items || [];
    
    if (items.length === 0) {
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }

    const totalAvailable = items.reduce((sum, item) => sum + (item.availableCount || 0), 0);
    return NextResponse.json({ availableCount: totalAvailable });
  } catch (error) {
    console.error("Error fetching live inventory:", error);
    const errMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: "Internal Server Error", message: errMessage }, { status: 500 });
  }
}
