import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.NEXT_AWS_REGION,
  credentials: {
    accessKeyId: process.env.NEXT_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.NEXT_AWS_SECRET_ACCESS_KEY || "",
  },
});

async function uploadFileToS3(
  file: Buffer,
  fileName: string,
  fileType: string,
): Promise<string> {
  const bucketName = process.env.S3_DANCEY_MAIN_BUCKET_NAME;
  const profilePath = process.env.S3_DANCEY_MAIN_PROFILE_PATH;

  if (!bucketName || !profilePath) {
    throw new Error("S3 bucket name or profile path not configured.");
  }

  const params = {
    Bucket: bucketName,
    Key: `${profilePath}${fileName}`,
    Body: file,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return `https://${bucketName}.s3.${process.env.NEXT_AWS_REGION}.amazonaws.com/${profilePath}${fileName}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "File not found in form data" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedFileName = file.name.replace(/\s+/g, "_");
    const fileName = `${Date.now()}-${sanitizedFileName}`;
    const fileType = file.type;

    const s3Url = await uploadFileToS3(buffer, fileName, fileType);

    return NextResponse.json({ success: true, url: s3Url });
  } catch (error: any) {
    console.error("Error uploading file to S3:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload file to S3" },
      { status: 500 },
    );
  }
}
