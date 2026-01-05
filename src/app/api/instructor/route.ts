import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase, getFirebaseAuth } from "@/lib/config/firebase";
import pool from "@/lib/db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      let query = `
        SELECT
          i.id,
          i.name,
          i.email,
          i.phone_number AS "phoneNumber",
          i.profile_photo_url AS "profilePhotoUrl",
          i.status,
          i.instructor_id,
          i.created_at AS "createdAt",
          ARRAY_AGG(DISTINCT jsonb_build_object(
            'id', c.id,
            'name', c.class_name, -- Corrected from c.name
            'description', c.class_description, -- Corrected from c.description
            'schedule', c.schedule -- Directly include the schedule JSONB column
          )) FILTER (WHERE c.id IS NOT NULL) AS classes
        FROM
          instructors i
        LEFT JOIN
          instructor_classes ic ON i.id = ic.instructor_id
        LEFT JOIN
          classes c ON ic.class_id = c.id
      `;

      let countQuery = `
        SELECT COUNT(DISTINCT i.id)
        FROM instructors i
      `;

      const queryParams: (string | number)[] = [];
      const countParams: (string | number)[] = [];
      const whereClauses: string[] = [];
      const countWhereClauses: string[] = [];

      if (search) {
        whereClauses.push("i.name ILIKE $? OR i.email ILIKE $?");
        queryParams.push(`%${search}%`, `%${search}%`);
        countWhereClauses.push("name ILIKE $? OR email ILIKE $?");
        countParams.push(`%${search}%`, `%${search}%`);
      }

      if (whereClauses.length > 0) {
        let paramIndex = 0;
        query += ` WHERE ${whereClauses.join(" AND ").replace(/\$\?/g, () => `$${(paramIndex += 1)}`)}`;
        paramIndex = 0;
        countQuery += ` WHERE ${countWhereClauses.join(" AND ").replace(/\$\?/g, () => `$${(paramIndex += 1)}`)}`;
      }

      query += `
        GROUP BY
          i.id, i.name, i.email, i.profile_photo_url, i.status,i.instructor_id, i.created_at
        ORDER BY
          i.created_at DESC
        OFFSET $${queryParams.length + 1} LIMIT $${queryParams.length + 2};
      `;
      queryParams.push(offset, limit);

      const instructorsResult = await client.query(query, queryParams);
      const totalItemsResult = await client.query(countQuery, countParams);

      const totalItems = parseInt(totalItemsResult.rows[0].count, 10);
      const totalPages = Math.ceil(totalItems / limit);

      return NextResponse.json(
        {
          success: true,
          instructors: instructorsResult.rows,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
        { status: 200 },
      );
    } catch (dbError) {
      console.error("Database query failed:", dbError);
      return NextResponse.json(
        {
          message: "Failed to fetch instructors",
          error: (dbError as Error).message,
        },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error fetching instructors:", error);
    return NextResponse.json(
      { message: "Failed to fetch instructors", error: error.message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    initializeFirebase();
    const auth = getFirebaseAuth();

    const {
      name,
      email,
      phoneNumber,
      password,
      profilePhotoUrl,
      autoGeneratePassword,
      classes,
    } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const instructorId = uuidv4();
    const now = new Date();

    const client = await pool.connect();
    let userRecord;

    try {
      await client.query("BEGIN");

      const existingInstructor = await client.query(
        "SELECT id FROM instructors WHERE email = $1",
        [email],
      );
      if (existingInstructor.rows.length > 0) {
        await client.query("ROLLBACK");
        // client.release() is handled in finally block
        return NextResponse.json(
          { message: "Email already in use" },
          { status: 409 },
        );
      }

      const insertInstructorQuery = `
        INSERT INTO instructors (id, name, email, phone_number, profile_photo_url, password_hash, auto_generate_password, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;
      await client.query(insertInstructorQuery, [
        instructorId,
        name,
        email,
        phoneNumber,
        profilePhotoUrl,
        hashedPassword,
        autoGeneratePassword,
        true,
        now,
        now,
      ]);

      if (classes && classes.length > 0) {
        for (const classId of classes) {
          const insertInstructorClassQuery = `
            INSERT INTO instructor_classes (id, instructor_id, class_id, assigned_at)
            VALUES ($1, $2, $3, $4)
          `;
          await client.query(insertInstructorClassQuery, [
            uuidv4(),
            instructorId,
            classId,
            now,
          ]);
        }
      }

      if (password.length < 6) {
        throw new Error(
          "Password must be at least 6 characters long for Firebase",
        );
      }

      userRecord = await auth.createUser({
        uid: instructorId,
        email,
        password,
        displayName: name,
        photoURL: profilePhotoUrl,
      });

      await auth.setCustomUserClaims(instructorId, {
        role: "instructor",
        premium: true,
      });

      await client.query("COMMIT");

      return NextResponse.json(
        { message: "Instructor created successfully", uid: userRecord.uid },
        { status: 201 },
      );
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Transaction failed, rolled back.", error);

      if (error.code === "auth/email-already-exists") {
        return NextResponse.json(
          { message: "Email already in use in Firebase Authentication" },
          { status: 409 },
        );
      }
      if (error.message.includes("Password must be at least 6 characters")) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }

      return NextResponse.json(
        {
          message: "Failed to create instructor due to Firebase error",
          error: error.message,
        },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error creating instructor:", error);
    return NextResponse.json(
      { message: "Failed to create instructor", error: error.message },
      { status: 500 },
    );
  }
}
