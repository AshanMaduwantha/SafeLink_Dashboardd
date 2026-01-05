import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { status } = await req.json();

    const updateResult = await db.query(
      `UPDATE admin_users SET status = $1, updated_at = $2 WHERE id = $3 RETURNING id`,
      [status, new Date(), id],
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { message: "Admin not found or status not updated" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Admin status updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error toggling admin status:", error);
    return NextResponse.json(
      { message: "Error toggling admin status" },
      { status: 500 },
    );
  }
}
