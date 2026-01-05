import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  getS3Config,
  getS3PathConfig,
  generateS3Url,
} from "@/lib/utils/s3-upload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const s3Config = getS3Config();
    const pathConfig = getS3PathConfig();
    const s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    const fileExtension = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `${pathConfig.newsImagesPath}${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
      Bucket: s3Config.bucketName,
      Key: filePath,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    const fileUrl = generateS3Url(
      s3Config.bucketName,
      s3Config.region,
      pathConfig.newsImagesPath,
      fileName,
    );

    return NextResponse.json({
      success: true,
      url: fileUrl,
      fileName: fileName,
      uploadUrl: fileUrl,
    });
  } catch (error) {
    console.error("Error uploading news image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
