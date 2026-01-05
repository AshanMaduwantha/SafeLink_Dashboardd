import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(_request: NextRequest) {
  try {
    // Get only active classes for selection in modal
    const result = await pool.query(
      `
      SELECT 
        id,
        class_name,
        class_description,
        course_instructor,
        class_price,
        is_active
      FROM classes 
      WHERE is_completed = true AND is_active = true
      ORDER BY class_name
    `,
    );

    const classes = result.rows.map((row) => ({
      id: row.id,
      name: row.class_name,
      description: row.class_description,
      instructor: row.course_instructor,
      // Coerce numeric to number; Postgres numeric comes as string via node-postgres
      price:
        row.class_price !== null && row.class_price !== undefined
          ? Number(row.class_price)
          : null,
      isActive: row.is_active,
    }));

    return NextResponse.json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error("Error fetching available classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch available classes" },
      { status: 500 },
    );
  }
}
