import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const type = searchParams.get("type") || "upcoming"; // upcoming or ended

    const offset = (page - 1) * limit;

    // Check if checkin_date and checkin_time columns exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'class_checkins' 
      AND column_name IN ('checkin_date', 'checkin_time')
    `);

    const hasCheckinDate = columnCheck.rows.some(
      (row) => row.column_name === "checkin_date",
    );
    const hasCheckinTime = columnCheck.rows.some(
      (row) => row.column_name === "checkin_time",
    );

    // Build datetime comparison for upcoming/ended filter
    // If we have both date and time columns, combine them; otherwise use created_at
    let datetimeColumn: string;
    if (hasCheckinDate && hasCheckinTime) {
      datetimeColumn = `(COALESCE(cc.checkin_date, DATE(cc.created_at)) || ' ' || COALESCE(cc.checkin_time, TO_CHAR(cc.created_at, 'HH24:MI:SS')))::timestamp`;
    } else if (hasCheckinDate) {
      datetimeColumn = `COALESCE(cc.checkin_date, DATE(cc.created_at))::date`;
    } else {
      datetimeColumn = `cc.created_at`;
    }

    // Group check-ins by class_id to get unique classes
    let query = `
      SELECT 
        c.id AS class_id,
        c.class_name,
        c.image AS class_image,
        COUNT(cc.id) as checkin_count
      FROM classes c
      INNER JOIN class_checkins cc ON c.id = cc.class_id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(DISTINCT c.id) as total 
      FROM classes c
      INNER JOIN class_checkins cc ON c.id = cc.class_id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by upcoming or ended
    if (type === "upcoming") {
      query += ` AND ${datetimeColumn} >= NOW()`;
      countQuery += ` AND ${datetimeColumn} >= NOW()`;
    } else if (type === "ended") {
      query += ` AND ${datetimeColumn} < NOW()`;
      countQuery += ` AND ${datetimeColumn} < NOW()`;
    }

    if (status !== "all") {
      query += ` AND cc.checkin_status = $${paramIndex}`;
      countQuery += ` AND cc.checkin_status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      const searchCondition = ` AND c.class_name ILIKE $${paramIndex}`;
      query += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    query += ` GROUP BY c.id, c.class_name, c.image`;
    query += ` ORDER BY c.class_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const countResult = await pool.query(
      countQuery,
      queryParams.slice(0, queryParams.length - 2),
    );
    const totalItems = parseInt(countResult.rows[0].total);

    const result = await pool.query(query, queryParams);

    const classes = result.rows.map((row) => ({
      classId: row.class_id,
      className: row.class_name,
      classImage: row.class_image,
      checkinCount: parseInt(row.checkin_count),
    }));

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      classes,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error: any) {
    console.error("Error fetching classes with check-ins:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      detail: error?.detail,
    });
    return NextResponse.json(
      {
        error: "Failed to fetch classes with check-ins",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
