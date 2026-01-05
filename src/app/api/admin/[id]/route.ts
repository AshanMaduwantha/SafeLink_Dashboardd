import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { adminSchema } from "@/lib/validations/admin/admin.schema";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const parsedBody = adminSchema.partial().parse(body);
    const { name, email, phone_number, role, status, password } = parsedBody;

    const existingAdminResult = await db.query(
      `SELECT id FROM admin_users WHERE email = $1 AND id != $2`,
      [email, id],
    );

    if (existingAdminResult.rows.length > 0) {
      return NextResponse.json(
        { message: "Admin with this email already exists" },
        { status: 409 },
      );
    }

    const setClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = COALESCE($${paramIndex++}, name)`);
      queryParams.push(name);
    }
    if (email !== undefined) {
      setClauses.push(`email = COALESCE($${paramIndex++}, email)`);
      queryParams.push(email);
    }
    if (phone_number !== undefined) {
      setClauses.push(
        `phone_number = COALESCE($${paramIndex++}, phone_number)`,
      );
      queryParams.push(phone_number);
    }
    if (role !== undefined) {
      setClauses.push(`role = COALESCE($${paramIndex++}, role)`);
      queryParams.push(role);
    }
    if (status !== undefined) {
      setClauses.push(`status = COALESCE($${paramIndex++}, status)`);
      queryParams.push(status);
    }
    if (password !== undefined && password !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      setClauses.push(`password = $${paramIndex++}`);
      queryParams.push(hashedPassword);
    }

    setClauses.push(`updated_at = $${paramIndex++}`);
    queryParams.push(new Date());

    if (setClauses.length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 },
      );
    }

    const updateQuery = `
      UPDATE admin_users
      SET
        ${setClauses.join(",\n")}
      WHERE id = $${paramIndex++}
      RETURNING id;
    `;
    queryParams.push(id);

    const result = await db.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Admin updated successfully", adminId: result.rows[0].id },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating admin:", error);
    return NextResponse.json(
      { message: "Failed to update admin" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const result = await db.query(
      `DELETE FROM admin_users WHERE id = $1 RETURNING id`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Admin not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Admin deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting admin:", error);
    return NextResponse.json(
      { message: "Failed to delete admin" },
      { status: 500 },
    );
  }
}
