import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(_request: NextRequest) {
  try {
    console.warn("🔍 Debug endpoint called");

    // Check environment variables
    const envCheck = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "SET" : "NOT SET",
      NODE_ENV: process.env.NODE_ENV,
      PGHOST: process.env.PGHOST,
      PGUSER: process.env.PGUSER,
      PGDATABASE: process.env.PGDATABASE,
      PGPORT: process.env.PGPORT,
    };

    console.warn("Environment variables:", envCheck);

    // Test database connection
    let dbStatus = "unknown";
    try {
      await pool.query("SELECT 1");
      dbStatus = "connected";
      console.warn("✅ Database connection successful");
    } catch (dbError) {
      dbStatus = "failed";
      console.error("❌ Database connection failed:", dbError);
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: {
        status: dbStatus,
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
