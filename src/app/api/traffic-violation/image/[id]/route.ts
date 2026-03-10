import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getGridFS, getDb } from "@/lib/mongodb";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.MONGODB_URI) {
    return new NextResponse("MongoDB not configured", { status: 503 });
  }
  const { id } = await params;
  if (!id) return new NextResponse("Missing id", { status: 400 });
  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return new NextResponse("Invalid id", { status: 400 });
  }
  try {
    const db = await getDb();
    const fileDoc = await db.collection("traffic_violation_files.files").findOne({ _id: objectId });
    const contentType = (fileDoc as { contentType?: string } | null)?.contentType || "image/jpeg";

    const bucket = await getGridFS();
    const stream = bucket.openDownloadStream(objectId);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", resolve);
      stream.on("error", reject);
    });
    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("GridFS download error:", e);
    return new NextResponse("Image not found", { status: 404 });
  }
}
