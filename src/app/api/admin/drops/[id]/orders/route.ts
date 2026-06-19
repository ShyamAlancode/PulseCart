import { NextResponse } from "next/server";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // --- Auth Guard: session + role check ---
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "ADMIN" && userRole !== "seller") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // ----------------------------------------

    const { id: dropId } = await params;

    if (!dropId) {
      return NextResponse.json({ error: "Missing dropId" }, { status: 400 });
    }

    // Retrieve drop metadata to perform ownership check
    const { getDrop } = await import("@/lib/queries");
    const drop = await getDrop(dropId);
    if (!drop) {
      return NextResponse.json({ error: "Not Found", message: "Drop not found" }, { status: 404 });
    }

    // If caller is seller, verify they own the drop
    if (userRole === "seller") {
      const sessionUserId = (session.user as { id?: string }).id;
      if (sessionUserId !== drop.sellerId) {
        return NextResponse.json({ error: "Forbidden", message: "Access denied: You do not own this drop." }, { status: 403 });
      }
    }

    // Query GSI1 for all order records belonging to this drop
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

    const response = await docClient.send(command);
    const orders = response.Items || [];

    // Sort by timestamp descending (most recent first)
    const sortedOrders = orders.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(sortedOrders);
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error("[GetDropOrders] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: error.message },
      { status: 500 }
    );
  }
}
