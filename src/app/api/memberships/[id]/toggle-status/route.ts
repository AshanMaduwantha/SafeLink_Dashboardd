import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Enabled status must be a boolean" },
        { status: 400 },
      );
    }

    const newStatus = enabled ? "Active" : "Inactive";

    const result = await pool.query(
      `UPDATE memberships 
       SET status = $1, is_membership_enabled = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id, membership_name, price_per_month, status, is_membership_enabled, created_at, updated_at`,
      [newStatus, enabled, id],
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
      isMembershipEnabled: row.is_membership_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({ membership });
  } catch (error) {
    console.error("Error toggling membership status:", error);
    return NextResponse.json(
      { error: "Failed to toggle membership status" },
      { status: 500 },
    );
  }
}
