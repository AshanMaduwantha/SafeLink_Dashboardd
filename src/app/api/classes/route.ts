import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "active";

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        id,
        class_name,
        class_description,
        class_price,
        is_active,
        is_completed,
        created_at,
        image,
        rating,
        course_instructor,
        schedule
      FROM classes 
      WHERE is_completed = true
    `;

    let countQuery = `SELECT COUNT(*) as total FROM classes WHERE is_completed = true`;

    if (status === "active") {
      query += ` AND is_active = true`;
      countQuery += ` AND is_active = true`;
    } else if (status === "inactive") {
      query += ` AND is_active = false`;
      countQuery += ` AND is_active = false`;
    }
    const queryParams: any[] = [];

    if (search) {
      const searchCondition = `
        AND (class_name ILIKE $1 
        OR class_description ILIKE $1 
        OR course_instructor ILIKE $1)
      `;
      query += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const countResult = await pool.query(
      countQuery,
      queryParams.slice(0, search ? 1 : 0),
    );
    const totalItems = parseInt(countResult.rows[0].total);

    const result = await pool.query(query, queryParams);

    const activeClassesCountResult = await pool.query(
      `SELECT COUNT(*) as total FROM classes WHERE is_completed = true AND is_active = true`,
    );
    const totalActiveClasses = parseInt(activeClassesCountResult.rows[0].total);

    const completedClassesCountResult = await pool.query(
      `SELECT COUNT(*) as total FROM classes WHERE is_completed = true AND is_active = false`,
    );
    const totalCompletedClasses = parseInt(
      completedClassesCountResult.rows[0].total,
    );

    const classes = result.rows.map((row, index) => ({
      id: row.id,
      displayId: String(offset + index + 1).padStart(2, "0"),
      name: row.class_name,
      description: row.class_description,
      instructor: row.course_instructor,
      price: row.class_price,
      isActive: row.is_active,
      isCompleted: row.is_completed,
      createdAt: row.created_at,
      image: row.image,
      rating: row.rating,
      schedule: row.schedule ? JSON.parse(JSON.stringify(row.schedule)) : [],
    }));

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      classes,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      totalActiveClasses,
      totalCompletedClasses,
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch classes" },
      { status: 500 },
    );
  }
}
