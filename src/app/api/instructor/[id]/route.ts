import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { getFirebaseAuth } from "@/lib/config/firebase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const client = await pool.connect();
    try {
      const query = `
        SELECT
          i.id,
          i.name,
          i.email,
          i.phone_number AS "phoneNumber",
          i.profile_photo_url AS "profilePhotoUrl",
          i.status,
          i.instructor_id,
          i.created_at AS "createdAt",
          COALESCE(
            ARRAY_AGG(c.id) FILTER (WHERE c.id IS NOT NULL),
            '{}'
          ) AS classes
        FROM
          instructors i
        LEFT JOIN
          instructor_classes ic ON i.id = ic.instructor_id
        LEFT JOIN
          classes c ON ic.class_id = c.id
        WHERE
          i.id = $1
        GROUP BY
          i.id
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { message: "Instructor not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { success: true, instructor: result.rows[0] },
        { status: 200 },
      );
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error fetching instructor:", error);
    return NextResponse.json(
      { message: "Failed to fetch instructor", error: error.message },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { classes } = await req.json();

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Delete existing class assignments for this instructor
      const deleteQuery = `
        DELETE FROM instructor_classes
        WHERE instructor_id = $1
      `;
      await client.query(deleteQuery, [id]);

      // 2. Insert new class assignments
      if (classes && Array.isArray(classes) && classes.length > 0) {
        const now = new Date();
        for (const classId of classes) {
          const insertQuery = `
            INSERT INTO instructor_classes (id, instructor_id, class_id, assigned_at)
            VALUES ($1, $2, $3, $4)
          `;
          await client.query(insertQuery, [uuidv4(), id, classId, now]);
        }
      }

      await client.query("COMMIT");

      return NextResponse.json(
        { message: "Instructor classes updated successfully" },
        { status: 200 },
      );
    } catch (error: any) {
      await client.query("ROLLBACK");
      console.error("Transaction failed, rolled back.", error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Error updating instructor:", error);
    return NextResponse.json(
      { message: "Failed to update instructor", error: error.message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get instructor details to fetch email and profile photo for deletion
    const getInstructorQuery = `SELECT email, profile_photo_url FROM instructors WHERE id = $1`;
    const instructorResult = await client.query(getInstructorQuery, [id]);

    if (instructorResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { message: "Instructor not found" },
        { status: 404 },
      );
    }

    const { email, profile_photo_url } = instructorResult.rows[0];

    // Delete related records from instructor_classes
    const deleteClassesQuery = `DELETE FROM instructor_classes WHERE instructor_id = $1`;
    await client.query(deleteClassesQuery, [id]);

    // Delete from instructors table
    const deleteInstructorQuery = `DELETE FROM instructors WHERE id = $1`;
    await client.query(deleteInstructorQuery, [id]);

    // Delete from Firebase Auth
    if (email) {
      try {
        const auth = await getFirebaseAuth();
        try {
          const user = await auth.getUserByEmail(email);
          if (user) {
            await auth.deleteUser(user.uid);
            // console.log(`Deleted Firebase user for email: ${email}`);
          }
        } catch (firebaseError: any) {
          if (firebaseError.code === "auth/user-not-found") {
            // console.log(`Firebase user not found for email: ${email}, skipping.`);
          } else {
            throw firebaseError;
          }
        }
      } catch (authError) {
        console.error("Error accessing Firebase Auth:", authError);
        throw new Error(
          "Failed to delete user from Firebase Auth. Database changes rolled back.",
        );
      }
    }

    // Delete profile photo from S3 if it exists
    if (profile_photo_url) {
      try {
        const { deleteFilesFromS3 } = await import("@/lib/utils/s3-upload");
        const deleteResult = await deleteFilesFromS3([profile_photo_url]);
        if (deleteResult.success) {
          // console.log(`Deleted profile photo from S3: ${profile_photo_url}`);
        } else {
          console.error(
            `Failed to delete profile photo from S3: ${profile_photo_url}`,
          );
        }
      } catch (s3Error) {
        console.error("Error deleting file from S3:", s3Error);
        // We don't want to fail the entire transaction if S3 deletion fails, just log it
      }
    }

    await client.query("COMMIT");

    return NextResponse.json(
      { message: "Instructor deleted successfully" },
      { status: 200 },
    );
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error deleting instructor:", error);
    return NextResponse.json(
      { message: "Failed to delete instructor", error: error.message },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
