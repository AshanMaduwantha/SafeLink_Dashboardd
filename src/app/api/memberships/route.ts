import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        membership_name,
        price_per_month,
        status,
        is_membership_enabled,
        created_at,
        updated_at
      FROM memberships 
      ORDER BY created_at DESC
    `);

    const memberships = result.rows.map((row) => ({
      id: row.id.toString(),
      name: row.membership_name,
      pricePerMonth: `$${row.price_per_month}/month`,
      status: row.status,
      enabled: row.status === "Active",
      isMembershipEnabled: row.is_membership_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ memberships });
  } catch (error) {
    console.error("Error fetching memberships:", error);
    return NextResponse.json(
      { error: "Failed to fetch memberships" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, pricePerMonth, enableMembership, status } = body;

    // Validate required fields
    if (!name || !pricePerMonth) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 },
      );
    }

    const numericPrice = parseFloat(pricePerMonth.replace(/[^0-9.]/g, ""));

    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json(
        { error: "Invalid price format" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO memberships (membership_name, price_per_month, status, is_membership_enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING id, membership_name, price_per_month, status, is_membership_enabled, created_at, updated_at`,
      [name, numericPrice, status || "Active", enableMembership || false],
    );

    const newMembership = result.rows[0];
    const membership = {
      id: newMembership.id.toString(),
      name: newMembership.membership_name,
      pricePerMonth: `$${newMembership.price_per_month}/month`,
      status: newMembership.status,
      enabled: newMembership.status === "Active",
      isMembershipEnabled: newMembership.is_membership_enabled,
      createdAt: newMembership.created_at,
      updatedAt: newMembership.updated_at,
    };

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    console.error("Error creating membership:", error);
    return NextResponse.json(
      { error: "Failed to create membership" },
      { status: 500 },
    );
  }
}
