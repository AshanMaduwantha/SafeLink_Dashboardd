import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        e.user_id,
        e.user_name,
        e.user_email,
        e.user_phone,
        e.status AS enrollment_status,
        c.id AS class_id,
        c.class_name,
        c.is_active AS class_is_active
      FROM enrollments e
      LEFT JOIN classes c ON e.class_id = c.id
      WHERE LOWER(e.status) = 'active'
      ORDER BY e.user_name, c.class_name;
    `);

    const rawEnrolledData = result.rows;

    const enrolledClassesMap = new Map();

    rawEnrolledData.forEach((row) => {
      if (!enrolledClassesMap.has(row.user_id)) {
        enrolledClassesMap.set(row.user_id, {
          userId: row.user_id,
          name: row.user_name,
          email: row.user_email,
          phone: row.user_phone,
          isActive: row.enrollment_status?.toLowerCase() === "active",
          enrolledClasses: [],
        });
      }
      const userData = enrolledClassesMap.get(row.user_id);
      if (row.class_id && row.class_name) {
        userData.enrolledClasses.push({
          id: row.class_id.toString(),
          name: row.class_name,
          isActive: row.class_is_active,
        });
      }
      userData.enrolledClassesCount = userData.enrolledClasses.length;
    });

    const enrolledClasses = Array.from(enrolledClassesMap.values());
    const totalEnrolledClasses = enrolledClasses.length;

    return NextResponse.json({ enrolledClasses, totalEnrolledClasses });
  } catch (error) {
    console.error("Error fetching enrolled classes:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrolled classes" },
      { status: 500 },
    );
  }
}
