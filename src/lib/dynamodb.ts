import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

const isDev = process.env.NODE_ENV === "development";
const region = process.env.AWS_REGION || "us-east-1";

export const dynamoClient = isDev
  ? new DynamoDBClient({
      region,
      endpoint: "http://localhost:8000",
      credentials: {
        accessKeyId: "fake",
        secretAccessKey: "fake",
      },
    })
  : new DynamoDBClient({
      region,
      credentials: awsCredentialsProvider({
        roleArn: process.env.AWS_ROLE_ARN!,
      }),
    });

export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    convertClassInstanceToMap: true,
    removeUndefinedValues: true,
  },
});

export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "PulseCart";
