import { NextResponse } from "next/server";
import { Pool } from "pg";

declare global {
  var __neonPool__: Pool | undefined;
}

function getNeonPool(): Pool {
  if (global.__neonPool__) return global.__neonPool__;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });
  global.__neonPool__ = pool;
  return pool;
}

export async function GET() {
  try {
    const pool = getNeonPool();
    const result = await pool.query<{
      id: number;
      location: string;
      time: string;
      videourl: string;
    }>(
      `SELECT id, location, time, videourl
       FROM incidents
       ORDER BY time DESC`,
    );

    return NextResponse.json({ incidents: result.rows });
  } catch (error) {
    console.error("Failed to fetch video incidents from NeonDB:", error);
    return NextResponse.json(
      { error: "Failed to fetch video incidents" },
      { status: 500 },
    );
  }
}
