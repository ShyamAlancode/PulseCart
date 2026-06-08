import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const isDev = process.env.NODE_ENV === "development";
const region = process.env.AWS_REGION || "us-east-1";
const bucketName = process.env.S3_BUCKET_NAME;

// Initialize S3 Client matching the DynamoDB credential resolution
const s3Client = isDev
  ? new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "fake",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "fake",
      },
    })
  : new S3Client({
      region,
      credentials: awsCredentialsProvider({
        roleArn: process.env.AWS_ROLE_ARN!,
      }),
    });

/**
 * GET: Checks configuration. If S3 is active, returns a presigned URL.
 * Otherwise, returns { localFallback: true } indicating local upload is required.
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");
    const contentType = searchParams.get("contentType");

    if (!filename || !contentType) {
      return NextResponse.json({ error: "Missing filename or contentType query parameters" }, { status: 400 });
    }

    if (!bucketName) {
      // Return local fallback signal if S3 bucket isn't configured
      return NextResponse.json({ localFallback: true });
    }

    const uniqueId = nanoid();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `uploads/${uniqueId}-${cleanFilename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    // Generate signed PUT URL valid for 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      localFallback: false,
      uploadUrl,
      publicUrl,
    });
  } catch (error) {
    console.error("Error generating presigned upload URL:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: "Internal Server Error", message: msg }, { status: 500 });
  }
}

/**
 * POST: Fallback for local development when S3 is not configured.
 * Saves the file directly to `public/uploads/`.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueId = nanoid();
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${uniqueId}-${cleanFilename}`;
    const filePath = path.join(uploadDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error("Error saving local file upload:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: "Internal Server Error", message: msg }, { status: 500 });
  }
}
