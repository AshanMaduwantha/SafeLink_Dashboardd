import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
  try {
    const { classId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "upcoming";

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

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

    // Build date and time selection based on column existence
    const dateColumn = hasCheckinDate
      ? `COALESCE(cc.checkin_date, DATE(cc.created_at))`
      : `DATE(cc.created_at)`;
    const timeColumn = hasCheckinTime
      ? `COALESCE(cc.checkin_time, TO_CHAR(cc.created_at, 'HH24:MI:SS'))`
      : `TO_CHAR(cc.created_at, 'HH24:MI:SS')`;

    let datetimeColumn: string;
    if (hasCheckinDate && hasCheckinTime) {
      datetimeColumn = `(COALESCE(cc.checkin_date, DATE(cc.created_at)) || ' ' || COALESCE(cc.checkin_time, TO_CHAR(cc.created_at, 'HH24:MI:SS')))::timestamp`;
    } else if (hasCheckinDate) {
      datetimeColumn = `COALESCE(cc.checkin_date, DATE(cc.created_at))::date`;
    } else {
      datetimeColumn = `cc.created_at`;
    }

    let query = `
      SELECT 
        cc.id,
        cc.enrollment_id,
        cc.class_id,
        cc.user_id,
        ${dateColumn} as checkin_date,
        ${timeColumn} as checkin_time,
        cc.checkin_status,
        cc.schedule_id,
        cc.created_at,
        c.class_name,
        c.image AS class_image,
        c.schedule AS class_schedule,
        e.user_name,
        e.user_email,
        e.user_phone,
        e.status AS enrollment_status
      FROM class_checkins cc
      LEFT JOIN classes c ON cc.class_id = c.id
      LEFT JOIN enrollments e ON cc.enrollment_id = e.id
      WHERE cc.class_id = $1
    `;

    const queryParams: any[] = [classId];

    // Filter by upcoming or ended
    if (type === "upcoming") {
      query += ` AND ${datetimeColumn} >= NOW()`;
    } else if (type === "ended") {
      query += ` AND ${datetimeColumn} < NOW()`;
    }

    query += ` ORDER BY ${dateColumn} DESC, ${timeColumn} DESC`;

    const result = await pool.query(query, queryParams);

    const checkIns = result.rows.map((row) => {
      // Find schedule by schedule_id
      let scheduleTime = null;
      if (row.schedule_id && row.class_schedule) {
        const schedules = Array.isArray(row.class_schedule)
          ? row.class_schedule
          : [];
        const matchedSchedule = schedules.find(
          (s: any) => s.schedule_id === row.schedule_id,
        );
        if (
          matchedSchedule &&
          matchedSchedule.startTime &&
          matchedSchedule.endTime
        ) {
          scheduleTime = {
            startTime: matchedSchedule.startTime,
            endTime: matchedSchedule.endTime,
          };
        }
      }

      return {
        id: row.id,
        enrollmentId: row.enrollment_id,
        classId: row.class_id,
        userId: row.user_id,
        checkinDate: row.checkin_date,
        checkinTime: row.checkin_time,
        checkinStatus: row.checkin_status,
        scheduleId: row.schedule_id,
        scheduleTime: scheduleTime,
        createdAt: row.created_at,
        className: row.class_name,
        classImage: row.class_image,
        userName: row.user_name,
        userEmail: row.user_email,
        userPhone: row.user_phone,
        enrollmentStatus: row.enrollment_status,
      };
    });

    return NextResponse.json({
      checkIns,
      className: checkIns[0]?.className || null,
    });
  } catch (error: any) {
    console.error("Error fetching check-ins for class:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch check-ins for class",
        details: error?.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
