import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        { error: "isActive must be a boolean value" },
        { status: 400 },
      );
    }

    const updateQuery = `
      UPDATE classes 
      SET is_active = $1, is_completed = CASE WHEN $1 = true THEN true ELSE is_completed END
      WHERE id = $2
      RETURNING id, class_name, is_active, is_completed
    `;

    const result = await pool.query(updateQuery, [isActive, classId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const updatedClass = result.rows[0];

    return NextResponse.json({
      success: true,
      class: {
        id: updatedClass.id,
        name: updatedClass.class_name,
        isActive: updatedClass.is_active,
        isCompleted: updatedClass.is_completed,
      },
    });
  } catch (error) {
    console.error("Error updating class status:", error);
    return NextResponse.json(
      { error: "Failed to update class status" },
      { status: 500 },
    );
  }
}
