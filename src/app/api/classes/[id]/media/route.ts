import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params;
    const body = await request.json();
    const { imageUrl, overviewVideoUrl, previousImageUrl, previousVideoUrl } =
      body;

    // Validate classId
    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

    // Check if class exists
    const classCheckQuery =
      "SELECT id, image, overview_video FROM classes WHERE id = $1";
    const classCheckResult = await pool.query(classCheckQuery, [classId]);

    if (classCheckResult.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const _existingClass = classCheckResult.rows[0];

    const updateQuery = `
      UPDATE classes 
      SET 
        image = COALESCE($1, image),
        overview_video = COALESCE($2, overview_video)
      WHERE id = $3
      RETURNING id, image, overview_video
    `;

    const result = await pool.query(updateQuery, [
      imageUrl,
      overviewVideoUrl,
      classId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to update class media" },
        { status: 500 },
      );
    }

    const updatedClass = result.rows[0];

    const urlsToDelete = [];
    if (previousImageUrl && previousImageUrl !== imageUrl) {
      urlsToDelete.push(previousImageUrl);
    }
    if (previousVideoUrl && previousVideoUrl !== overviewVideoUrl) {
      urlsToDelete.push(previousVideoUrl);
    }

    return NextResponse.json({
      success: true,
      class: {
        id: updatedClass.id,
        image: updatedClass.image,
        overviewVideo: updatedClass.overview_video,
      },
      urlsToDelete,
    });
  } catch (error) {
    console.error("Error updating class media:", error);
    return NextResponse.json(
      { error: "Failed to update class media" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params;

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

    const query = `
      SELECT 
        id,
        image,
        overview_video
      FROM classes 
      WHERE id = $1
    `;

    const result = await pool.query(query, [classId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const classData = result.rows[0];

    return NextResponse.json({
      success: true,
      class: {
        id: classData.id,
        image: classData.image,
        overviewVideo: classData.overview_video,
      },
    });
  } catch (error) {
    console.error("Error fetching class media:", error);
    return NextResponse.json(
      { error: "Failed to fetch class media" },
      { status: 500 },
    );
  }
}
