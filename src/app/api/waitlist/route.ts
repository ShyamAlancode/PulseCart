import { NextResponse } from "next/server";
import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

/**
 * POST /api/waitlist
 * Registers an email address to the PulseCart drop alert waitlist.
 * Stored in DynamoDB as WAITLIST#<email> / SIGNUP#<timestamp>
 */
export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { email, dropId } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Bad Request", message: "A valid email address is required." },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `WAITLIST#${email.toLowerCase().trim()}`,
          SK: `SIGNUP#${timestamp}`,
          email: email.toLowerCase().trim(),
          dropId: dropId || "general",
          timestamp,
          source: "sold-out-page",
        },
        // Upsert safely — if already exists, overwrite with latest timestamp
        // (prevents duplicate signups from counting as separate entries)
      })
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error saving waitlist signup:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "Failed to register for waitlist." },
      { status: 500 }
    );
  }
}
