import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getS3Config,
  getS3PathConfig,
  generateS3Url,
} from "@/lib/utils/s3-upload";

export async function POST(request: NextRequest) {
  try {
    const s3Config = getS3Config();
    const pathConfig = getS3PathConfig();

    if (!s3Config.bucketName) {
      console.error("S3 BUCKET_NAME is undefined");
      return NextResponse.json(
        { error: "S3 bucket configuration is missing" },
        { status: 500 },
      );
    }

    const { fileName, fileType, fileSize } = await request.json();

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "fileName and fileType are required" },
        { status: 400 },
      );
    }

    // Validate file size
    const maxFileSize = 500 * 1024 * 1024;
    if (fileSize && fileSize > maxFileSize) {
      return NextResponse.json(
        { error: "File size exceeds 500MB limit" },
        { status: 400 },
      );
    }

    // Create S3 client
    const s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    // Generate unique file key with timestamp
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const fileKey = `${pathConfig.videosPath}${uniqueFileName}`;

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: fileKey,
      ContentType: fileType,
    });

    // Generate pre-signed URL (valid for 1 hour)
    // @ts-expect-error - Type mismatch between AWS SDK packages due to nested @smithy/types versions
    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600,
    });

    // Generate the final S3 URL where the file will be accessible
    const finalUrl = generateS3Url(
      s3Config.bucketName,
      s3Config.region,
      pathConfig.videosPath,
      uniqueFileName,
    );

    return NextResponse.json({
      presignedUrl,
      finalUrl,
      fileKey: uniqueFileName,
    });
  } catch (error) {
    console.error("Detailed error in presign API:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: "Failed to generate upload URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
