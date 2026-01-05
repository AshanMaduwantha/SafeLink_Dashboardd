import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "URLs array is required" },
        { status: 400 },
      );
    }

    const { deleteFilesFromS3 } = await import("@/lib/utils/s3-upload");
    const result = await deleteFilesFromS3(urls);

    return NextResponse.json({
      success: result.success,
      message: `Deleted ${result.deletedCount} files successfully${result.failedCount > 0 ? `, ${result.failedCount} failed` : ""}`,
      results: [],
    });
  } catch (error) {
    console.error("Error deleting files from S3:", error);
    return NextResponse.json(
      { error: "Failed to delete files from S3" },
      { status: 500 },
    );
  }
}
