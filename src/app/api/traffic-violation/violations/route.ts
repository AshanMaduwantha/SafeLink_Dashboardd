import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getDb, TRAFFIC_VIOLATIONS_COLLECTION } from "@/lib/mongodb";

async function getJsonFallback() {
  try {
    const p = path.join(process.cwd(), "public", "violations.json");
    const raw = await readFile(p, "utf-8");
    const data = JSON.parse(raw);
    const violations = (data.violations ?? []).map((v: { sourceFile?: string; imageUrl?: string; [k: string]: unknown }) => ({
      ...v,
      imageUrl:
        v.imageUrl ??
        (v.sourceFile ? `/api/traffic-violation/image/by-name?file=${encodeURIComponent(v.sourceFile)}` : undefined),
    }));
    return NextResponse.json({
      lastUpdated: data.lastUpdated ?? null,
      total: data.total ?? 0,
      violations,
      platesBySource: data.platesBySource ?? {},
      source: "json",
    });
  } catch {
    return NextResponse.json(
      { lastUpdated: null, total: 0, violations: [], platesBySource: {}, source: "json" },
      { status: 200 }
    );
  }
}

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return getJsonFallback();
  }
  try {
    const db = await getDb();
    const col = db.collection(TRAFFIC_VIOLATIONS_COLLECTION);
    const cursor = col.find({}).sort({ id: 1 });
    const violations = await cursor.toArray();
    const list = violations.map((v) => {
      const imageId = v.imageId != null ? String(v.imageId) : null;
      const sourceFile = v.sourceFile;
      // Prefer by-name so we serve annotated image (with detection frames) from results/predictions when available
      const imageUrl = sourceFile
        ? `/api/traffic-violation/image/by-name?file=${encodeURIComponent(sourceFile)}`
        : imageId
          ? `/api/traffic-violation/image/${imageId}`
          : undefined;
      return {
        id: v.id,
        sourceFile,
        detectedAt: v.detectedAt,
        className: v.className,
        confidence: v.confidence,
        plates: v.plates ?? [],
        imageUrl,
        imageId: imageId ?? undefined,
        location: v.location ?? undefined,
        vehicle: v.vehicle ?? undefined,
        category: v.category ?? undefined,
      };
    });
    const platesBySource: Record<string, string[]> = {};
    list.forEach((v) => {
      if (v.sourceFile && v.plates?.length) platesBySource[v.sourceFile] = v.plates;
    });
    const lastDoc = violations[violations.length - 1];
    return NextResponse.json({
      lastUpdated: lastDoc?.detectedAt ?? null,
      total: list.length,
      violations: list,
      platesBySource,
      source: "mongodb",
    });
  } catch (e) {
    console.error("MongoDB violations fetch error:", e);
    return getJsonFallback();
  }
}
