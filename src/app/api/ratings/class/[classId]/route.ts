import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
  const { classId } = await params;
  const client = await pool.connect();

  try {
    const query = `
      SELECT 
        r.id,
        r.rating,
        r.description,
        r.created_at,
        e.user_name
      FROM ratings r
      INNER JOIN enrollments e ON r.enrollment_id = e.id
      WHERE r.class_id = $1 AND r.status = 'approved'
      ORDER BY r.created_at DESC
    `;

    const result = await client.query(query, [classId]);

    const ratings = result.rows.map((row) => ({
      id: row.id,
      userName: row.user_name,
      rating: parseFloat(row.rating),
      description: row.description,
      createdAt: row.created_at,
    }));

    const avgQuery = `
      SELECT AVG(rating) as average, COUNT(*) as count
      FROM ratings
      WHERE class_id = $1 AND status = 'approved'
    `;

    const avgResult = await client.query(avgQuery, [classId]);
    const stats = avgResult.rows[0];

    return NextResponse.json({
      ratings,
      average: stats.average ? parseFloat(stats.average).toFixed(1) : null,
      count: parseInt(stats.count),
    });
  } catch (error) {
    console.error("Error fetching class ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
