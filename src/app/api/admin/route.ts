import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { adminSchema } from "@/lib/validations/admin/admin.schema";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        id,
        name,
        email,
        phone_number,
        role,
        status,
        img_url,
        created_at,
        updated_at,
        last_login
      FROM admin_users
      WHERE 1=1
    `;

    let countQuery = `SELECT COUNT(*) as total FROM admin_users WHERE 1=1`;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      const searchCondition = `
        AND (name ILIKE $${paramIndex}
        OR email ILIKE $${paramIndex})
      `;
      query += searchCondition;
      countQuery += searchCondition;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const countResult = await db.query(
      countQuery,
      queryParams.slice(0, queryParams.length - 2),
    );

    const totalItems = parseInt(countResult.rows[0].total);

    const result = await db.query(query, queryParams);

    const activeAdminsCountResult = await db.query(
      `SELECT COUNT(*) as total FROM admin_users WHERE status = 'Active'`,
    );
    const totalActiveAdmins = parseInt(activeAdminsCountResult.rows[0].total);

    const inactiveAdminsCountResult = await db.query(
      `SELECT COUNT(*) as total FROM admin_users WHERE status = 'Inactive'`,
    );
    const totalInactiveAdmins = parseInt(
      inactiveAdminsCountResult.rows[0].total,
    );

    const admins = result.rows.map((row, index) => ({
      id: row.id,
      displayId: String(offset + index + 1).padStart(2, "0"),
      name: row.name,
      email: row.email,
      phone_number: row.phone_number,
      role: row.role,
      status: row.status,
      imgUrl: row.img_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      last_login: row.last_login,
    }));

    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      admins,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      totalActiveAdmins,
      totalInactiveAdmins,
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsedBody = adminSchema.parse(body);
    const { name, email, phone_number, role, status, password } = parsedBody;

    const existingAdminResult = await db.query(
      `SELECT id FROM admin_users WHERE email = $1`,
      [email],
    );

    if (existingAdminResult.rows.length > 0) {
      return NextResponse.json(
        { message: "Admin with this email already exists" },
        { status: 409 },
      );
    }

    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      const generatedPassword =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      hashedPassword = await bcrypt.hash(generatedPassword, 10);
    }

    const newAdminId = uuidv4();

    const newAdminResult = await db.query(
      `INSERT INTO admin_users (id, name, email, password, phone_number, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        newAdminId,
        name,
        email,
        hashedPassword,
        phone_number,
        role,
        status,
        new Date(),
        new Date(),
      ],
    );

    const newAdmin = newAdminResult.rows[0];

    return NextResponse.json(
      { message: "Admin created successfully", adminId: newAdmin.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { message: "Failed to create admin" },
      { status: 500 },
    );
  }
}
