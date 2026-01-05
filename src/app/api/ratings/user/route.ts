import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { enrollmentId, rating, description } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const enrollmentQuery = `
      SELECT id, class_id, user_id, status 
      FROM enrollments 
      WHERE id = $1 AND user_id = $2
    `;

    const enrollmentResult = await client.query(enrollmentQuery, [
      enrollmentId,
      session.user.id,
    ]);

    if (enrollmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Invalid enrollment or enrollment not found" },
        { status: 404 },
      );
    }

    const enrollment = enrollmentResult.rows[0];

    if (enrollment.status !== "active") {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Can only rate active enrollments" },
        { status: 400 },
      );
    }

    // Check if rating already exists
    const existingRatingQuery = `
      SELECT id FROM ratings WHERE enrollment_id = $1
    `;

    const existingRatingResult = await client.query(existingRatingQuery, [
      enrollmentId,
    ]);

    if (existingRatingResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "You have already rated this class" },
        { status: 400 },
      );
    }

    // Create rating
    const insertQuery = `
      INSERT INTO ratings (enrollment_id, class_id, user_id, rating, description, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const insertResult = await client.query(insertQuery, [
      enrollmentId,
      enrollment.class_id,
      session.user.id,
      rating,
      description || null,
      "pending",
    ]);

    await client.query("COMMIT");

    const newRating = insertResult.rows[0];

    return NextResponse.json(
      {
        id: newRating.id,
        enrollmentId: newRating.enrollment_id,
        classId: newRating.class_id,
        userId: newRating.user_id,
        rating: parseFloat(newRating.rating),
        description: newRating.description,
        status: newRating.status,
        createdAt: newRating.created_at,
      },
      { status: 201 },
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating rating:", error);

    if ((error as any).code === "23505") {
      return NextResponse.json(
        { error: "You have already rated this class" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create rating" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

// Get user's own ratings
export async function GET(_request: NextRequest) {
  const client = await pool.connect();

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = `
      SELECT 
        r.id,
        r.enrollment_id,
        r.class_id,
        r.rating,
        r.description,
        r.status,
        r.created_at,
        c.class_name as course,
        c.image as course_image
      FROM ratings r
      INNER JOIN classes c ON r.class_id = c.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `;

    const result = await client.query(query, [session.user.id]);

    const ratings = result.rows.map((row) => ({
      id: row.id,
      enrollmentId: row.enrollment_id,
      classId: row.class_id,
      course: row.course,
      courseImage: row.course_image,
      rating: parseFloat(row.rating),
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
    }));

    return NextResponse.json(ratings);
  } catch (error) {
    console.error("Error fetching user ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
