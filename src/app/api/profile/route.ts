import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;

    const result = await pool.query(
      `SELECT id, email, name, role, img_url, phone_number, created_at, updated_at
       FROM admin_users
       WHERE email = $1`,
      [userEmail],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];
    const [firstName, ...lastNameParts] = user.name
      ? user.name.split(" ")
      : ["", ""];
    const lastName = lastNameParts.join(" ");

    return NextResponse.json({
      id: user.id.toString(),
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      role: user.role,
      avatarUrl: user.img_url,
      phoneNumber: user.phone_number,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const body = await request.json();
    const { firstName, lastName, phoneNumber, avatarUrl } = body;

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 },
      );
    }

    const fullName = `${firstName} ${lastName || ""}`.trim();

    let query = `UPDATE admin_users SET name = $1, updated_at = NOW()`;
    const queryParams = [fullName];
    let paramIndex = 2;

    if (phoneNumber !== undefined) {
      query += `, phone_number = $${paramIndex}`;
      queryParams.push(phoneNumber);
      paramIndex++;
    }

    if (avatarUrl !== undefined) {
      query += `, img_url = $${paramIndex}`;
      queryParams.push(avatarUrl);
      paramIndex++;
    }

    query += ` WHERE email = $${paramIndex} RETURNING id, email, name, role, img_url, phone_number, created_at, updated_at`;
    queryParams.push(userEmail);

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = result.rows[0];
    const [updatedFirstName, ...updatedLastNameParts] = updatedUser.name
      ? updatedUser.name.split(" ")
      : ["", ""];
    const updatedLastName = updatedLastNameParts.join(" ");

    return NextResponse.json({
      id: updatedUser.id.toString(),
      email: updatedUser.email,
      firstName: updatedFirstName,
      lastName: updatedLastName,
      role: updatedUser.role,
      avatarUrl: updatedUser.img_url,
      phoneNumber: updatedUser.phone_number,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 },
    );
  }
}
