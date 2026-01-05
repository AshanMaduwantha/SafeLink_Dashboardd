import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = await pool.connect();

  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateQuery = `
      UPDATE ratings 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, [status, id]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    const fetchQuery = `
      SELECT 
        r.id,
        r.enrollment_id,
        r.class_id,
        r.user_id,
        r.rating,
        r.description,
        r.status,
        r.created_at,
        r.updated_at,
        e.user_email,
        e.user_name,
        c.class_name as course
      FROM ratings r
      INNER JOIN enrollments e ON r.enrollment_id = e.id
      INNER JOIN classes c ON r.class_id = c.id
      WHERE r.id = $1
    `;

    const fetchResult = await client.query(fetchQuery, [id]);
    const row = fetchResult.rows[0];

    return NextResponse.json({
      id: row.id,
      email: row.user_email,
      userName: row.user_name,
      course: row.course,
      description: row.description,
      rating: parseFloat(row.rating),
      status: row.status,
      createdAt: row.created_at,
    });
  } catch (error) {
    console.error("Error updating rating:", error);
    return NextResponse.json(
      { error: "Failed to update rating" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
