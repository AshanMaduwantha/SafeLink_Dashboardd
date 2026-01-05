import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      `SELECT id, promotion_name, discount, start_date, end_date, status, is_enabled, created_at, updated_at
       FROM promotions WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 },
      );
    }

    const row = result.rows[0];
    const promotion = {
      id: row.id.toString(),
      promotion_name: row.promotion_name,
      discount: row.discount,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      is_enabled: row.is_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("Error fetching promotion:", error);
    return NextResponse.json(
      { error: "Failed to fetch promotion" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
      `UPDATE promotions
       SET promotion_name = $1, discount = $2, start_date = $3, end_date = $4, status = $5, is_enabled = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, promotion_name, discount, start_date, end_date, status, is_enabled, created_at, updated_at`,
      [
        promotion_name,
        discount,
        start_date,
        end_date,
        status || "Active",
        is_enabled || false,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 },
      );
    }

    const row = result.rows[0];
    const promotion = {
      id: row.id.toString(),
      promotion_name: row.promotion_name,
      discount: row.discount,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status,
      is_enabled: row.is_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ promotion });
  } catch (error) {
    console.error("Error updating promotion:", error);
    return NextResponse.json(
      { error: "Failed to update promotion" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      "DELETE FROM promotions WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Promotion not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Promotion deleted successfully" });
  } catch (error) {
    console.error("Error deleting promotion:", error);
    return NextResponse.json(
      { error: "Failed to delete promotion" },
      { status: 500 },
    );
  }
}
