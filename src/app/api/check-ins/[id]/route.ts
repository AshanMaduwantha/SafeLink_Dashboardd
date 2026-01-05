import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Check-in ID is required" },
        { status: 400 },
      );
    }

    // Update checkin_status - toggle between true and false
    // The status column is varchar(10), so we'll use 'true' or 'false' as string
    const updateQuery = `
      UPDATE class_checkins 
      SET checkin_status = $1
      WHERE id = $2
      RETURNING id, checkin_status
    `;

    // Convert boolean status to string since column is varchar
    const statusValue = status ? "true" : "false";

    const result = await pool.query(updateQuery, [statusValue, id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Check-in not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      checkIn: {
        id: result.rows[0].id,
        checkinStatus: result.rows[0].checkin_status,
      },
    });
  } catch (error: any) {
    console.error("Error updating check-in status:", error);
    return NextResponse.json(
      { error: "Failed to update check-in status", details: error?.message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Check-in ID is required" },
        { status: 400 },
      );
    }

    const deleteQuery = `
      DELETE FROM class_checkins 
      WHERE id = $1
      RETURNING id
    `;

    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Check-in not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Check-in deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting check-in:", error);
    return NextResponse.json(
      { error: "Failed to delete check-in", details: error?.message },
      { status: 500 },
    );
  }
}
