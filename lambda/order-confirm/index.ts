/**
 * AWS Lambda Stream Processor for PulseCart
 * Runtime: Node.js 20.x (TypeScript)
 * 
 * --- BUILD & PACKAGING INSTRUCTIONS ---
 * 1. Navigate to this directory in your terminal:
 *    cd lambda/order-confirm
 * 
 * 2. Install dependencies:
 *    npm install
 * 
 * 3. Build the TypeScript files:
 *    npm run build
 *    (This compiles index.ts into dist/index.js)
 * 
 * 4. Package for AWS Lambda:
 *    Create a zip file containing the 'dist' folder and the 'node_modules' folder.
 *    For example:
 *      zip -r lambda.zip dist node_modules
 * 
 * 5. Deploy:
 *    Upload 'lambda.zip' directly to your Lambda function via the AWS Console or AWS CLI:
 *    aws lambda update-function-code --function-name PulseCartStreamProcessor --zip-file fileb://lambda.zip
 */

import { DynamoDBStreamEvent, Handler } from "aws-lambda";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Initialize the Amazon SES client. 
// Handlers run on container warm starts, reusing this client instance.
const ses = new SESClient({ region: process.env.AWS_REGION || "us-east-1" });

export const handler: Handler<DynamoDBStreamEvent, { statusCode: number; body: string }> = async (event: DynamoDBStreamEvent) => {
  console.log(`[StreamProcessor] Received DynamoDB stream event with ${event.Records.length} records.`);
  
  let processedCount = 0;

  for (const record of event.Records) {
    try {
      // 1. Filter for only INSERT events
      if (record.eventName !== "INSERT") {
        console.log(`[StreamProcessor] Skipping record (Event ID: ${record.eventID}) - Event is ${record.eventName}, not INSERT.`);
        continue;
      }

      const newImageRaw = record.dynamodb?.NewImage;
      if (!newImageRaw) {
        console.log(`[StreamProcessor] Skipping record (Event ID: ${record.eventID}) - NewImage is missing.`);
        continue;
      }

      // 2. Unmarshall DynamoDB JSON to standard JavaScript attributes
      const item = unmarshall(newImageRaw as any);

      // 3. Filter for only ORDER# items (check that the SK starts with "ORDER#")
      if (!item.SK || typeof item.SK !== "string" || !item.SK.startsWith("ORDER#")) {
        console.log(`[StreamProcessor] Skipping record (Event ID: ${record.eventID}) - SK does not start with ORDER#.`);
        continue;
      }

      // 4. Extract required fields: orderId, userId, dropId, total, timestamp, buyer email
      const orderId = item.SK.replace(/^ORDER#/, "") || "unknown-order";
      const userId = (item.PK && typeof item.PK === "string") ? item.PK.replace(/^USER#/, "") : "unknown-user";
      const dropId = item.dropId || "unknown-drop";
      const total = item.total !== undefined ? Number(item.total) : 0;
      const timestamp = item.timestamp || new Date().toISOString();
      const buyerEmail = item.email || "unknown@example.com";

      console.log(`[StreamProcessor] Processing ORDER confirmation: OrderId=${orderId}, UserId=${userId}, DropId=${dropId}, Total=${total}, BuyerEmail=${buyerEmail}`);

      // 5. Send order confirmation email using SES
      const fromEmail = process.env.FROM_EMAIL;
      if (!fromEmail) {
        throw new Error("FROM_EMAIL environment variable is not defined. Cannot send confirmation email.");
      }

      const emailParams = {
        Source: fromEmail,
        Destination: {
          ToAddresses: [buyerEmail], // Dynamic recipient email
        },
        Message: {
          Subject: {
            Data: `Your PulseCart order is confirmed — ${orderId}`,
          },
          Body: {
            Text: {
              Data: [
                `Hi there,`,
                ``,
                `Your order has been successfully placed and secured on PulseCart!`,
                ``,
                `--------------------------------------------`,
                `Order Details:`,
                `--------------------------------------------`,
                `Order ID:      ${orderId}`,
                `User ID:       ${userId}`,
                `Drop ID:       ${dropId}`,
                `Total Price:   ₹ ${(total / 100).toFixed(2)}`,
                `Timestamp:     ${timestamp}`,
                `Status:        CONFIRMED`,
                `--------------------------------------------`,
                ``,
                `Thank you for support.`,
                `PulseCart Team`
              ].join("\n"),
            },
          },
        },
      };

      await ses.send(new SendEmailCommand(emailParams));
      console.log(`[StreamProcessor] Confirmation email sent successfully for OrderId: ${orderId}`);
      processedCount++;
    } catch (err: any) {
      console.error(`[StreamProcessor] Failed to process stream record (Event ID: ${record.eventID}):`, err);
    }
  }

  return {
    statusCode: 200,
    body: `processed ${processedCount} records`,
  };
};
