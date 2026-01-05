import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const result = await pool.query(`SELECT * FROM latest_news WHERE id = $1`, [
      id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }

    return NextResponse.json({
      news: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
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

    if (
      Object.prototype.hasOwnProperty.call(body, "is_pinned") &&
      Object.keys(body).length === 1
    ) {
      const result = await pool.query(
        `UPDATE latest_news SET 
          is_pinned = $1,
          updated_at = NOW()
        WHERE id = $2 
        RETURNING *`,
        [body.is_pinned, id],
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: "News not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        news: result.rows[0],
      });
    }

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
      `UPDATE latest_news SET 
        title = $1, 
        content = $2, 
        image_url = $3, 
        publish_date = $4, 
        status = $5, 
        category = $6, 
        is_pinned = $7,
        updated_at = NOW()
      WHERE id = $8 
      RETURNING *`,
      [
        title,
        content,
        image_url || null,
        publish_date,
        status,
        category,
        is_pinned || false,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      news: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating news:", error);
    return NextResponse.json(
      { error: "Failed to update news" },
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

    // Get news details to fetch image_url before deletion
    const getNewsQuery = `SELECT image_url FROM latest_news WHERE id = $1`;
    const newsResult = await pool.query(getNewsQuery, [id]);

    if (newsResult.rows.length === 0) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }

    const { image_url } = newsResult.rows[0];

    const result = await pool.query(
      `DELETE FROM latest_news WHERE id = $1 RETURNING *`,
      [id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }

    // Delete image from S3 if it exists
    if (image_url) {
      try {
        const { deleteFilesFromS3 } = await import("@/lib/utils/s3-upload");
        const deleteResult = await deleteFilesFromS3([image_url]);
        if (deleteResult.success) {
          // console.log(`Deleted news image from S3: ${image_url}`);
        } else {
          console.error(`Failed to delete news image from S3: ${image_url}`);
        }
      } catch (s3Error) {
        console.error("Error deleting file from S3:", s3Error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "News deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting news:", error);
    return NextResponse.json(
      { error: "Failed to delete news" },
      { status: 500 },
    );
  }
}
