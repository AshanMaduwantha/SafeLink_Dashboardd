import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

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
      SELECT class_pack_id
      FROM class_pack_classes
      WHERE class_id = $1
    `;

    const result = await pool.query(query, [classId]);

    return NextResponse.json({
      success: true,
      classPacks: result.rows,
    });
  } catch (error) {
    console.error("Error fetching class packs for class:", error);
    return NextResponse.json(
      { error: "Failed to fetch class packs for class" },
      { status: 500 },
    );
  }
}
