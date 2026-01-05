import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "";

    let query = `
      SELECT 
        id,
        title,
        content,
        image_url,
        publish_date,
        status,
        category,
        is_pinned,
        created_at,
        updated_at
      FROM latest_news 
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status !== "all") {
      query += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY is_pinned DESC, created_at DESC`;

    const result = await pool.query(query, queryParams);

    const publishedCountResult = await pool.query(
      `SELECT COUNT(*) as total FROM latest_news WHERE status = 'published'`,
    );
    const totalPublishedNews = parseInt(publishedCountResult.rows[0].total);

    const draftCountResult = await pool.query(
      `SELECT COUNT(*) as total FROM latest_news WHERE status = 'draft'`,
    );
    const totalDraftNews = parseInt(draftCountResult.rows[0].total);

    const news = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      image_url: row.image_url,
      publish_date: row.publish_date,
      status: row.status,
      category: row.category,
      is_pinned: row.is_pinned,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      news,
      totalPublishedNews,
      totalDraftNews,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      title,
      content,
      image_url,
      publish_date,
      status,
      category,
      is_pinned,
    } = body;

    const result = await pool.query(
      `INSERT INTO latest_news (
        title, content, image_url, 
        publish_date, status, category, is_pinned, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
      RETURNING *`,
      [
        title,
        content,
        image_url || null,
        publish_date,
        status,
        category,
        is_pinned || false,
      ],
    );

    return NextResponse.json({
      success: true,
      news: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating news:", error);
    return NextResponse.json(
      { error: "Failed to create news" },
      { status: 500 },
    );
  }
}
