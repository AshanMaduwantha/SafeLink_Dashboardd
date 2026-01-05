import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await pool.query(
      `SELECT id, membership_name, price_per_month, status, is_membership_enabled, created_at, updated_at
       FROM memberships WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    const row = result.rows[0];
    const membership = {
      id: row.id.toString(),
      name: row.membership_name,
      pricePerMonth: `$${row.price_per_month}/month`,
      status: row.status,
      enabled: row.status === "Active",
      isPromotionEnabled: row.is_membership_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ membership });
  } catch (error) {
    console.error("Error fetching membership:", error);
    return NextResponse.json(
      { error: "Failed to fetch membership" },
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
    const { name, pricePerMonth, status, enablePromotion } = body;

    if (!name || !pricePerMonth) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 },
      );
    }

    // Extract numeric value from price string
    const numericPrice = parseFloat(pricePerMonth.replace(/[^0-9.]/g, ""));

    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json(
        { error: "Invalid price format" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE memberships 
       SET membership_name = $1, price_per_month = $2, status = $3, is_membership_enabled = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, membership_name, price_per_month, status, is_membership_enabled, created_at, updated_at`,
      [name, numericPrice, status || "Active", enablePromotion || false, id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    const row = result.rows[0];
    const membership = {
      id: row.id.toString(),
      name: row.membership_name,
      pricePerMonth: `$${row.price_per_month}/month`,
      status: row.status,
      enabled: row.status === "Active",
      isPromotionEnabled: row.is_membership_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ membership });
  } catch (error) {
    console.error("Error updating membership:", error);
    return NextResponse.json(
      { error: "Failed to update membership" },
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
      "DELETE FROM memberships WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Membership not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Membership deleted successfully" });
  } catch (error) {
    console.error("Error deleting membership:", error);
    return NextResponse.json(
      { error: "Failed to delete membership" },
      { status: 500 },
    );
  }
}
