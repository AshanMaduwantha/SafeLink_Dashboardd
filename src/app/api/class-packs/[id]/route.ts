import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: packId } = await params;

    if (!packId) {
      return NextResponse.json(
        { error: "Class pack ID is required" },
        { status: 400 },
      );
    }

    // Get pack details
    const packResult = await pool.query(
      `SELECT id, pack_name, is_active, price, created_at FROM class_packs WHERE id = $1`,
      [packId],
    );

    if (packResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Class pack not found" },
        { status: 404 },
      );
    }

    const pack = packResult.rows[0];

    // Get classes in this pack
    const classesResult = await pool.query(
      `
      SELECT 
        c.id,
        c.class_name,
        c.class_description,
        c.course_instructor,
        c.class_price,
        c.is_active,
        c.image,
        c.rating,
        c.schedule
      FROM class_pack_classes cpc
      JOIN classes c ON cpc.class_id = c.id
      WHERE cpc.class_pack_id = $1
      ORDER BY c.class_name
    `,
      [packId],
    );

    return NextResponse.json({
      success: true,
      classPack: {
        id: pack.id,
        packName: pack.pack_name,
        isActive: pack.is_active,
        price: pack.price != null ? parseFloat(pack.price) : null,
        createdAt: pack.created_at,
        classes: classesResult.rows.map((classRow) => ({
          id: classRow.id,
          name: classRow.class_name,
          description: classRow.class_description,
          instructor: classRow.course_instructor,
          price: classRow.class_price,
          isActive: classRow.is_active,
          image: classRow.image,
          rating: classRow.rating,
          schedule: classRow.schedule
            ? JSON.parse(JSON.stringify(classRow.schedule))
            : [],
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching class pack:", error);
    return NextResponse.json(
      { error: "Failed to fetch class pack" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: packId } = await params;
    const body = await request.json();
    const { packName, classIds, isActive, isDiscountEnabled, discountPercent } =
      body;

    if (!packId) {
      return NextResponse.json(
        { error: "Class pack ID is required" },
        { status: 400 },
      );
    }

    if (!packName || !packName.trim()) {
      return NextResponse.json(
        { error: "Pack name is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json(
        { error: "At least one class must be selected" },
        { status: 400 },
      );
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Determine if classIds actually changed; if not, keep existing price
      const existingIdsResult = await client.query(
        `SELECT class_id FROM class_pack_classes WHERE class_pack_id = $1`,
        [packId],
      );
      const existingIds = new Set(
        existingIdsResult.rows.map((r: any) => r.class_id),
      );
      const incomingIds = new Set(classIds as string[]);
      const sameSize = existingIds.size === incomingIds.size;
      const sameMembers =
        sameSize && [...existingIds].every((id) => incomingIds.has(id));

      let updateResult;
      if (sameMembers) {
        // Only update name/status; preserve price
        updateResult = await client.query(
          `UPDATE class_packs SET pack_name = $1, is_active = $2 WHERE id = $3 RETURNING id, pack_name, is_active, price`,
          [packName.trim(), isActive ?? true, packId],
        );
      } else {
        // Classes changed → recompute price (apply discount if provided)
        const pricesResult = await client.query(
          `SELECT COALESCE(SUM(class_price), 0) AS total_price FROM classes WHERE id = ANY($1::uuid[])`,
          [classIds],
        );
        const totalPrice: number =
          parseFloat(pricesResult.rows[0].total_price) || 0;
        const safeDiscount = Math.min(
          100,
          Math.max(
            0,
            parseFloat(isDiscountEnabled ? (discountPercent ?? 0) : 0),
          ),
        );
        const finalPrice = Math.max(
          0,
          +(totalPrice * (1 - safeDiscount / 100)).toFixed(2),
        );

        updateResult = await client.query(
          `UPDATE class_packs SET pack_name = $1, is_active = $2, price = $3 WHERE id = $4 RETURNING id, pack_name, is_active, price`,
          [packName.trim(), isActive ?? true, finalPrice, packId],
        );
      }

      if (updateResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Class pack not found" },
          { status: 404 },
        );
      }

      // Get class names for the selected classes
      const classNamesResult = await client.query(
        `SELECT id, class_name FROM classes WHERE id = ANY($1::uuid[])`,
        [classIds],
      );

      if (classNamesResult.rows.length !== classIds.length) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Some selected classes not found" },
          { status: 400 },
        );
      }

      // Delete existing relationships
      await client.query(
        `DELETE FROM class_pack_classes WHERE class_pack_id = $1`,
        [packId],
      );

      // Insert new relationships
      for (const classRow of classNamesResult.rows) {
        await client.query(
          `INSERT INTO class_pack_classes (class_id, class_pack_id, class_name, pack_name) 
           VALUES ($1, $2, $3, $4)`,
          [classRow.id, packId, classRow.class_name, packName.trim()],
        );
      }

      await client.query("COMMIT");

      return NextResponse.json({
        success: true,
        classPack: {
          id: packId,
          packName: updateResult.rows[0].pack_name,
          isActive: updateResult.rows[0].is_active,
          price:
            updateResult.rows[0].price != null
              ? parseFloat(updateResult.rows[0].price)
              : null,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating class pack:", error);
    return NextResponse.json(
      { error: "Failed to update class pack" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: packId } = await params;

    if (!packId) {
      return NextResponse.json(
        { error: "Class pack ID is required" },
        { status: 400 },
      );
    }

    // Delete pack (cascade will delete relationships)
    const result = await pool.query(
      `DELETE FROM class_packs WHERE id = $1 RETURNING id, pack_name`,
      [packId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Class pack not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Class pack deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting class pack:", error);
    return NextResponse.json(
      { error: "Failed to delete class pack" },
      { status: 500 },
    );
  }
}
