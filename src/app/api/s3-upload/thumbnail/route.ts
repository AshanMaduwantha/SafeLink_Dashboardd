import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  getS3Config,
  getS3PathConfig,
  generateS3Url,
} from "@/lib/utils/s3-upload";

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
  const s3Config = getS3Config();
  const pathConfig = getS3PathConfig();

  const params = {
    Bucket: s3Config.bucketName,
    Key: `${pathConfig.imagesPath}${fileName}`,
    Body: file,
    ContentType: fileType,
  };

  const command = new PutObjectCommand(params);
  await s3Client.send(command);

  return generateS3Url(
    s3Config.bucketName,
    s3Config.region,
    pathConfig.imagesPath,
    fileName,
  );
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
    const fileName = `${Date.now()}-${file.name}`;
    const fileType = file.type;

    const s3Url = await uploadFileToS3(buffer, fileName, fileType);

    return NextResponse.json({ success: true, url: s3Url });
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    return NextResponse.json(
      { error: "Failed to upload file to S3" },
      { status: 500 },
    );
  }
}
