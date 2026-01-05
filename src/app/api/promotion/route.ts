import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const client = await pool.connect();

    let query = "SELECT * FROM promotions";
    const countQuery = "SELECT COUNT(*) FROM promotions";
    const queryParams: (string | number)[] = [];
    const countQueryParams: (string | number)[] = [];
    let whereClause = "";

    if (search) {
      whereClause = ` WHERE promotion_name ILIKE $1 OR status ILIKE $1`;
      queryParams.push(`%${search}%`);
      countQueryParams.push(`%${search}%`);
    }

    query += `${whereClause} ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const promotionsResult = await client.query(query, queryParams);
    const countResult = await client.query(
      countQuery + whereClause,
      countQueryParams,
    );
    const totalItems = parseInt(countResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalItems / limit);

    client.release();

    return NextResponse.json({
      promotions: promotionsResult.rows,
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
    console.error("Error fetching promotions:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      promotion_name,
      discount,
      start_date,
      end_date,
      status,
      is_enabled,
    } = body;

    if (!promotion_name || !discount || !start_date || !end_date) {
      return NextResponse.json(
        {
          error:
            "Promotion name, discount, start date, and end date are required",
        },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO promotions (promotion_name, discount, start_date, end_date, status, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, promotion_name, discount, start_date, end_date, status, is_enabled, created_at, updated_at`,
      [
        promotion_name,
        discount,
        start_date,
        end_date,
        status || "Active",
        is_enabled || false,
      ],
    );

    const newPromotion = result.rows[0];
    const promotion = {
      id: newPromotion.id.toString(),
      promotion_name: newPromotion.promotion_name,
      discount: newPromotion.discount,
      start_date: newPromotion.start_date,
      end_date: newPromotion.end_date,
      status: newPromotion.status,
      is_enabled: newPromotion.is_enabled,
      createdAt: newPromotion.created_at,
      updatedAt: newPromotion.updated_at,
    };

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error("Error creating promotion:", error);
    return NextResponse.json(
      { error: "Failed to create promotion" },
      { status: 500 },
    );
  }
}
