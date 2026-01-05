import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { PricingSchema } from "@/lib/validations/classes/create-classes/Pricing.schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: classId } = await params;

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();

    const validatedData = PricingSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        {
          error: "Invalid pricing data",
          details: validatedData.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { classPrice, promotionId, membershipIds, classPackIds } =
      validatedData.data;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Fetch class_name
      const classQuery = "SELECT class_name FROM classes WHERE id = $1";
      const classResult = await client.query(classQuery, [classId]);
      if (classResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }
      const className = classResult.rows[0].class_name;

      const updateClassQuery = `
        UPDATE classes
        SET 
          class_price = $1,
          promotion_id = $2
        WHERE id = $3
        RETURNING id;
      `;
      const updateResult = await client.query(updateClassQuery, [
        classPrice,
        promotionId || null,
        classId,
      ]);

      if (updateResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Class not found or failed to update class pricing" },
          { status: 404 },
        );
      }

      await client.query("DELETE FROM class_memberships WHERE class_id = $1", [
        classId,
      ]);

      if (membershipIds && membershipIds.length > 0) {
        // Fetch membership names
        const membershipNames: { [key: string]: string } = {};
        if (membershipIds.length > 0) {
          const membershipQuery = `
            SELECT id, membership_name FROM memberships WHERE id = ANY($1::uuid[]);
          `;
          const membershipResult = await client.query(membershipQuery, [
            membershipIds,
          ]);
          membershipResult.rows.forEach((row) => {
            membershipNames[row.id] = row.membership_name;
          });
        }

        const insertMembershipValues = membershipIds
          .map((membershipId) => {
            const membershipName = membershipNames[membershipId] || "Unknown";
            return `('${classId}', '${membershipId}', '${className}', '${membershipName}')`;
          })
          .join(", ");

        const insertMembershipQuery = `
          INSERT INTO class_memberships (class_id, membership_id, class_name, membership_name)
          VALUES ${insertMembershipValues};
        `;
        await client.query(insertMembershipQuery);
      }

      // Handle Class Packs
      await client.query("DELETE FROM class_pack_classes WHERE class_id = $1", [
        classId,
      ]);

      if (classPackIds && classPackIds.length > 0) {
        const classPackNames: { [key: string]: string } = {};
        if (classPackIds.length > 0) {
          const classPackQuery = `
            SELECT id, pack_name FROM class_packs WHERE id = ANY($1::uuid[]);
          `;
          const classPackResult = await client.query(classPackQuery, [
            classPackIds,
          ]);
          classPackResult.rows.forEach((row) => {
            classPackNames[row.id] = row.pack_name;
          });
        }

        const insertClassPackValues = classPackIds
          .map((classPackId) => {
            const classPackName = classPackNames[classPackId] || "Unknown";
            return `('${classId}', '${classPackId}', '${className}', '${classPackName}')`;
          })
          .join(", ");

        const insertClassPackQuery = `
          INSERT INTO class_pack_classes (class_id, class_pack_id, class_name, pack_name)
          VALUES ${insertClassPackValues};
        `;
        await client.query(insertClassPackQuery);
      }

      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        message:
          "Class pricing, memberships, and class packs updated successfully",
        classId: classId,
      });
    } catch (dbError) {
      await client.query("ROLLBACK");
      console.error("Database transaction error:", dbError);
      return NextResponse.json(
        {
          error: "Failed to update class pricing, memberships, and class packs",
          details: (dbError as Error).message,
        },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating class pricing:", error);
    return NextResponse.json(
      { error: "Failed to update class pricing" },
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

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

    const getClassQuery =
      "SELECT image, overview_video FROM classes WHERE id = $1";
    const classResult = await pool.query(getClassQuery, [classId]);

    if (classResult.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const classData = classResult.rows[0];
    const urlsToDelete = [];

    if (classData.image && classData.image !== "") {
      urlsToDelete.push(classData.image);
    }
    if (classData.overview_video && classData.overview_video !== "") {
      urlsToDelete.push(classData.overview_video);
    }

    const deleteQuery = "DELETE FROM classes WHERE id = $1 RETURNING id";
    const result = await pool.query(deleteQuery, [classId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Failed to delete class" },
        { status: 500 },
      );
    }

    if (urlsToDelete.length > 0) {
      try {
        const { deleteFilesFromS3 } = await import("@/lib/utils/s3-upload");
        const deleteResult = await deleteFilesFromS3(urlsToDelete);

        if (deleteResult.success) {
          // console.log(`Deleted class files from S3: ${JSON.stringify(urlsToDelete)}`);
        } else {
          console.error(
            `Failed to delete class files from S3. Success: ${deleteResult.success}, Deleted: ${deleteResult.deletedCount}, Failed: ${deleteResult.failedCount}`,
          );
        }
      } catch (deleteError) {
        console.error("Error deleting files from S3:", deleteError);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting class:", error);
    return NextResponse.json(
      { error: "Failed to delete class" },
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

    if (!classId) {
      return NextResponse.json(
        { error: "Class ID is required" },
        { status: 400 },
      );
    }

    const query = `
      SELECT 
        id,
        class_name,
        class_description,
        course_instructor,
        class_price,
        is_active,
        is_completed,
        created_at,
        image,
        rating,
        overview_video,
        promotion_id
      FROM classes 
      WHERE id = $1
    `;

    const result = await pool.query(query, [classId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const classData = result.rows[0];

    return NextResponse.json({
      success: true,
      class: {
        id: classData.id,
        name: classData.class_name,
        description: classData.class_description,
        instructor: classData.course_instructor,
        price: classData.class_price,
        isActive: classData.is_active,
        isCompleted: classData.is_completed,
        createdAt: classData.created_at,
        image: classData.image,
        rating: classData.rating,
        overviewVideo: classData.overview_video,
        promotionId: classData.promotion_id,
        schedule: "Mon, Wed, Fri 9:00 AM",
      },
    });
  } catch (error) {
    console.error("Error fetching class:", error);
    return NextResponse.json(
      { error: "Failed to fetch class" },
      { status: 500 },
    );
  }
}
