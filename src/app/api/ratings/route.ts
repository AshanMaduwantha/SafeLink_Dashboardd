import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getServerSession(authOptions);

    // Check if user is admin
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = `
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
    `;

    const params: any[] = [];

    if (status) {
      query += ` WHERE r.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await client.query(query, params);

    const transformedRatings = result.rows.map((row) => ({
      id: row.id,
      email: row.user_email,
      userName: row.user_name,
      course: row.course,
      description: row.description,
      rating: parseFloat(row.rating),
      status: row.status,
      createdAt: row.created_at,
      enrollmentId: row.enrollment_id,
      classId: row.class_id,
      userId: row.user_id,
    }));

    return NextResponse.json(transformedRatings);
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
