import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let query = `
      SELECT 
        id,
        class_name,
        class_description,
        course_instructor,
        created_at,
        image,
        overview_video,
        schedule,
        class_price
      FROM classes 
      WHERE is_completed = false
    `;

    const queryParams: any[] = [];

    if (search) {
      query += ` AND (class_name ILIKE $1 OR class_description ILIKE $1 OR course_instructor ILIKE $1)`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at ASC`;

    const result = await pool.query(query, queryParams);

    const incompleteClasses = result.rows.map((row) => {
      let lastStep = 0;

      if (row.class_name && row.class_description && row.course_instructor) {
        lastStep = 1;
      }

      if (
        row.image &&
        row.image !== "" &&
        row.overview_video &&
        row.overview_video !== ""
      ) {
        lastStep = 2;
      }

      if (
        row.schedule &&
        Array.isArray(row.schedule) &&
        row.schedule.length > 0
      ) {
        lastStep = 3;
      }

      if (row.class_price && row.class_price > 0) {
        lastStep = 4;
      }

      return {
        id: row.id,
        className: row.class_name,
        description: row.class_description,
        instructorName: row.course_instructor,
        createdAt: row.created_at,
        lastStep: lastStep,
      };
    });

    return NextResponse.json({
      success: true,
      classes: incompleteClasses,
    });
  } catch (error) {
    console.error("Error fetching incomplete classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch incomplete classes" },
      { status: 500 },
    );
  }
}
