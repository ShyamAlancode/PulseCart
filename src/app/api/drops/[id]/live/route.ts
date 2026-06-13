import { docClient, TABLE_NAME } from "@/lib/dynamodb";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export const runtime = "nodejs"; // Edge not viable — @vercel/functions/oidc is Node.js-only
export const maxDuration = 300;  // TODO: evaluate Edge runtime migration post-hackathon
export const dynamic = "force-dynamic";

/**
 * GET /api/drops/[id]/live
 * Establishes a Server-Sent Events (SSE) connection that streams live inventory counts.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dropId } = await params;
    if (!dropId) {
      return new Response("Missing dropId", { status: 400 });
    }

    const encoder = new TextEncoder();

    // Helper to query all shards for a specific drop's inventory and sum them
    const queryInventory = async (): Promise<number> => {
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
      return items.reduce((sum, item) => sum + (item.availableCount || 0), 0);
    };

    const stream = new ReadableStream({
      async start(controller) {
        let lastCount = -1;

        const sendUpdate = (count: number) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ availableCount: count })}\n\n`)
          );
        };

        // Query instantly on startup
        try {
          const initialCount = await queryInventory();
          lastCount = initialCount;
          sendUpdate(initialCount);
        } catch (err) {
          console.error("Error fetching initial SSE count:", err);
        }

        // Setup interval to poll DynamoDB and detect changes
        const intervalId = setInterval(async () => {
          try {
            const currentCount = await queryInventory();
            if (currentCount !== lastCount) {
              lastCount = currentCount;
              sendUpdate(currentCount);
            }
          } catch (err) {
            console.error("Error querying DynamoDB in SSE loop:", err);
          }
        }, 1000);

        // Keep-alive heartbeat to prevent proxy timeouts
        const heartbeatId = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"));
          } catch (err) {
            console.error("Error sending SSE heartbeat:", err);
          }
        }, 15000);

        // Close cleanly on client disconnect
        request.signal.addEventListener("abort", () => {
          clearInterval(intervalId);
          clearInterval(heartbeatId);
          try {
            controller.close();
          } catch {
            // Already closed
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Prevents Nginx/Cloudflare buffering SSE
      },
    });
  } catch (error) {
    console.error("Error setting up SSE live inventory stream:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
