import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        cp.id,
        cp.pack_name,
        cp.is_active,
        cp.price,
        cp.created_at,
        COUNT(cpc.class_id) as class_count
      FROM class_packs cp
      LEFT JOIN class_pack_classes cpc ON cp.id = cpc.class_pack_id
    `;

    let countQuery = `SELECT COUNT(*) as total FROM class_packs`;

    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status === "active") {
      conditions.push(`cp.is_active = true`);
    } else if (status === "inactive") {
      conditions.push(`cp.is_active = false`);
    }

    if (search) {
      conditions.push(`cp.pack_name ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      const whereClause = conditions.join(" AND ");
      query += ` WHERE ${whereClause}`;
      countQuery += ` WHERE ${whereClause}`;
    }

    query += ` GROUP BY cp.id, cp.pack_name, cp.is_active, cp.created_at`;
    query += ` ORDER BY cp.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const countResult = await pool.query(
      countQuery,
      queryParams.slice(0, search ? 1 : 0),
    );
    const totalItems = parseInt(countResult.rows[0].total);

    const result = await pool.query(query, queryParams);

    // Fetch classes for each pack
    const classPacks = await Promise.all(
      result.rows.map(async (row) => {
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
          [row.id],
        );

        return {
          id: row.id,
          packName: row.pack_name,
          isActive: row.is_active,
          price: row.price != null ? parseFloat(row.price) : null,
          createdAt: row.created_at,
          classCount: parseInt(row.class_count) || 0,
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
        };
      }),
    );

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      classPacks,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching class packs:", error);
    return NextResponse.json(
      { error: "Failed to fetch class packs" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packName, classIds, isActive, isDiscountEnabled, discountPercent } =
      body;

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

      // Compute price from selected classes
      const pricesResult = await client.query(
        `SELECT COALESCE(SUM(class_price), 0) AS total_price FROM classes WHERE id = ANY($1::uuid[])`,
        [classIds],
      );
      const totalPrice: number =
        parseFloat(pricesResult.rows[0].total_price) || 0;
      const safeDiscount = Math.min(
        100,
        Math.max(0, parseFloat(isDiscountEnabled ? (discountPercent ?? 0) : 0)),
      );
      const finalPrice = Math.max(
        0,
        +(totalPrice * (1 - safeDiscount / 100)).toFixed(2),
      );

      // Insert class pack with computed price
      const packResult = await client.query(
        `INSERT INTO class_packs (pack_name, is_active, price) VALUES ($1, $2, $3) RETURNING id, pack_name, is_active, price, created_at`,
        [packName.trim(), isActive ?? true, finalPrice],
      );

      const packId = packResult.rows[0].id;

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

      // Insert class pack relationships
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
          packName: packResult.rows[0].pack_name,
          isActive: packResult.rows[0].is_active,
          price:
            packResult.rows[0].price != null
              ? parseFloat(packResult.rows[0].price)
              : null,
          createdAt: packResult.rows[0].created_at,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error creating class pack:", error);
    return NextResponse.json(
      { error: "Failed to create class pack" },
      { status: 500 },
    );
  }
}
