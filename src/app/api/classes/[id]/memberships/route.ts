import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  _request: NextRequest,
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

    const result = await pool.query(
      `SELECT membership_id FROM class_memberships WHERE class_id = $1`,
      [classId],
    );

    return NextResponse.json({ memberships: result.rows });
  } catch (error) {
    console.error("Error fetching class memberships:", error);
    return NextResponse.json(
      { error: "Failed to fetch class memberships" },
      { status: 500 },
    );
  }
}
