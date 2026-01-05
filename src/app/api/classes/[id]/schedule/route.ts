import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params;
    const body = await request.json();
    const { name, startTime, endTime, date } = body;

    // Validate required fields
    if (!name || !startTime || !endTime || !date) {
      return NextResponse.json(
        { error: "Missing required fields: name, startTime, endTime, date" },
        { status: 400 },
      );
    }

    // Check if class exists with retry logic
    const classCheckQuery = "SELECT id, schedule FROM classes WHERE id = $1";
    let classCheckResult;

    try {
      classCheckResult = await pool.query(classCheckQuery, [classId]);
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json(
        { error: "Database connection failed. Please try again." },
        { status: 503 },
      );
    }

    if (classCheckResult.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const existingSchedule = classCheckResult.rows[0].schedule || [];

    // Create new schedule entry
    const newScheduleEntry = {
      schedule_id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      startTime,
      endTime,
      date,
    };

    const updatedSchedule = [...existingSchedule, newScheduleEntry];

    const updateQuery = `
      UPDATE classes 
      SET schedule = $1
      WHERE id = $2
      RETURNING id, schedule
    `;

    let result;
    try {
      result = await pool.query(updateQuery, [
        JSON.stringify(updatedSchedule),
        classId,
      ]);
    } catch (dbError) {
      console.error("Database update error:", dbError);
      return NextResponse.json(
        { error: "Failed to update schedule. Please try again." },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Schedule added successfully",
      schedule: result.rows[0].schedule,
    });
  } catch (error) {
    console.error("Error adding schedule:", error);
    return NextResponse.json(
      { error: "Failed to add schedule" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params;
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");
    const body = await request.json();
    const { name, startTime, endTime, date } = body;

    // Validate required fields
    if (!scheduleId || !name || !startTime || !endTime || !date) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: scheduleId, name, startTime, endTime, date",
        },
        { status: 400 },
      );
    }

    // Check if class exists
    const classCheckQuery = "SELECT id, schedule FROM classes WHERE id = $1";
    const classCheckResult = await pool.query(classCheckQuery, [classId]);

    if (classCheckResult.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const existingSchedule = classCheckResult.rows[0].schedule || [];
    let scheduleFound = false;

    const updatedSchedule = existingSchedule.map((item: any) => {
      if (item.schedule_id === scheduleId) {
        scheduleFound = true;
        return {
          ...item,
          name,
          startTime,
          endTime,
          date,
        };
      }
      return item;
    });

    if (!scheduleFound) {
      return NextResponse.json(
        { error: "Schedule item not found" },
        { status: 404 },
      );
    }

    const updateQuery = `
      UPDATE classes 
      SET schedule = $1
      WHERE id = $2
      RETURNING id, schedule
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(updatedSchedule),
      classId,
    ]);

    return NextResponse.json({
      success: true,
      message: "Schedule updated successfully",
      schedule: result.rows[0].schedule,
    });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    // Check if class exists
    const classCheckQuery = "SELECT id, schedule FROM classes WHERE id = $1";
    const classCheckResult = await pool.query(classCheckQuery, [classId]);

    if (classCheckResult.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const schedule = classCheckResult.rows[0].schedule || [];

    let filteredSchedule = schedule;
    if (date) {
      filteredSchedule = schedule.filter((item: any) => item.date === date);
    }

    return NextResponse.json({
      success: true,
      schedule: filteredSchedule,
    });
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params;
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("scheduleId");

    if (!scheduleId) {
      return NextResponse.json(
        { error: "Schedule ID is required" },
        { status: 400 },
      );
    }

    const classCheckQuery = "SELECT id, schedule FROM classes WHERE id = $1";
    const classCheckResult = await pool.query(classCheckQuery, [classId]);

    if (classCheckResult.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const existingSchedule = classCheckResult.rows[0].schedule || [];

    const updatedSchedule = existingSchedule.filter(
      (item: any) => item.schedule_id !== scheduleId,
    );

    const updateQuery = `
      UPDATE classes 
      SET schedule = $1
      WHERE id = $2
      RETURNING id, schedule
    `;

    const result = await pool.query(updateQuery, [
      JSON.stringify(updatedSchedule),
      classId,
    ]);

    return NextResponse.json({
      success: true,
      message: "Schedule deleted successfully",
      schedule: result.rows[0].schedule,
    });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    return NextResponse.json(
      { error: "Failed to delete schedule" },
      { status: 500 },
    );
  }
}
