import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { className, description, instructorName, classId } = body;

    if (!className || !description || !instructorName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: className, description, instructorName",
        },
        { status: 400 },
      );
    }

    let result;

    if (classId) {
      const updateQuery = `
        UPDATE classes 
        SET 
          class_name = $1,
          class_description = $2,
          course_instructor = $3
        WHERE id = $4
        RETURNING id, class_name, class_description, course_instructor, created_at
      `;

      result = await pool.query(updateQuery, [
        className,
        description,
        instructorName,
        classId,
      ]);

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }
    } else {
      const insertQuery = `
        INSERT INTO classes (class_name, class_description, course_instructor, is_active, is_completed, created_at, image, rating)
        VALUES ($1, $2, $3, false, false, CURRENT_TIMESTAMP, '', 0.0)
        RETURNING id, class_name, class_description, course_instructor, created_at
      `;

      result = await pool.query(insertQuery, [
        className,
        description,
        instructorName,
      ]);
    }

    const savedClass = result.rows[0];

    return NextResponse.json({
      success: true,
      class: {
        id: savedClass.id,
        className: savedClass.class_name,
        description: savedClass.class_description,
        instructorName: savedClass.course_instructor,
        createdAt: savedClass.created_at,
      },
    });
  } catch (error) {
    console.error("Error saving class draft:", error);
    return NextResponse.json(
      { error: "Failed to save class draft" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("id");

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

    const query = `
      SELECT 
        id,
        class_name,
        class_description,
        course_instructor,
        created_at,
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
        className: classData.class_name,
        description: classData.class_description,
        instructorName: classData.course_instructor,
        createdAt: classData.created_at,
        image: classData.image,
        overviewVideo: classData.overview_video,
      },
    });
  } catch (error) {
    console.error("Error fetching class draft:", error);
    return NextResponse.json(
      { error: "Failed to fetch class draft" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("id");

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

    const query = `
      DELETE FROM classes 
      WHERE id = $1 AND is_active = false
      RETURNING id
    `;

    const result = await pool.query(query, [classId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Class not found or cannot be deleted" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting class draft:", error);
    return NextResponse.json(
      { error: "Failed to delete class draft" },
      { status: 500 },
    );
  }
}
