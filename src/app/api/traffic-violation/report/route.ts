import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import { spawn } from "child_process";
import path from "path";
import { existsSync } from "fs";
import { getGridFS, getDb, TRAFFIC_VIOLATIONS_COLLECTION } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") ?? formData.get("photo") ?? formData.get("video");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "No file uploaded. Use form field 'file', 'photo', or 'video'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|mp4|mov|avi|webm)$/i)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use image or video." },
        { status: 400 }
      );
    }

    const location = (formData.get("location") as string)?.trim() || undefined;
    const vehicle = (formData.get("vehicle") as string)?.trim() || undefined;
    const category = (formData.get("category") as string)?.trim() || undefined;

    const modelsDir = process.env.MODELS_DIR;
    if (!modelsDir) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Server not configured for detection. Set MODELS_DIR to the path of the models folder (e.g. C:\\Users\\...\\Desktop\\models).",
        },
        { status: 503 }
      );
    }

    const ext = path.extname(file.name) || (file.type.startsWith("video/") ? ".mp4" : ".jpg");
    const safeName = `app_${Date.now()}${ext}`;
    const dataDir = path.join(modelsDir, "data");
    await mkdir(dataDir, { recursive: true });
    const savePath = path.join(dataDir, safeName);
    const relativePath = path.join("data", safeName);

    const bytes = await file.arrayBuffer();
    await writeFile(savePath, Buffer.from(bytes));

    const dashboardPublic = path.join(
      path.dirname(modelsDir),
      "safe_link_latest_dashboard",
      "SafeLink_Dashboardd",
      "public",
      "violations.json"
    );
    let existingSnapshot: { lastUpdated?: string; total?: number; violations?: unknown[]; platesBySource?: Record<string, string[]> } = { violations: [], platesBySource: {} };
    if (existsSync(dashboardPublic)) {
      try {
        existingSnapshot = JSON.parse(await readFile(dashboardPublic, "utf-8"));
      } catch {
        // keep empty
      }
    }

    const scriptPath = path.join(modelsDir, "detect_violations.py");
    // On Windows, "python" may not be on PATH when Node spawns; "py -3" (Python Launcher) often is
    const pythonCmd = process.env.PYTHON_PATH
      ? process.env.PYTHON_PATH
      : process.platform === "win32"
        ? "py -3"
        : "python";

    // Quote paths so the shell does not split on spaces (e.g. "C:\Users\PAMUDITHA JAYAKODY\...")
    const quotePath = (p: string) => (p.includes(" ") || p.includes('"') ? `"${p.replace(/"/g, '\\"')}"` : p);
    const scriptPathQuoted = quotePath(scriptPath);
    const relativePathQuoted = quotePath(relativePath);
    // Only quote python cmd if it looks like a path (contains \ or /), not "py -3"
    const pythonCmdQuoted = /[\\/]/.test(pythonCmd) ? quotePath(pythonCmd) : pythonCmd;

    const result = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
      const cmd = `${pythonCmdQuoted} ${scriptPathQuoted} ${relativePathQuoted}`;
      const proc = spawn(cmd, [], {
        cwd: modelsDir,
        shell: true,
      });
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (d) => (stdout += d.toString()));
      proc.stderr?.on("data", (d) => (stderr += d.toString()));
      proc.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
    });

    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout || "").trim();
      const detailShort = detail.length > 300 ? detail.slice(0, 300) + "…" : detail;
      return NextResponse.json(
        {
          success: false,
          error: detailShort ? `Detection script failed. ${detailShort}` : "Detection script failed.",
          detail,
        },
        { status: 500 }
      );
    }

    const exportPath = path.join(modelsDir, "violations_export.json");
    let newViolations: unknown[] = [];
    let newPlatesBySource: Record<string, string[]> = {};
    try {
      const raw = await readFile(exportPath, "utf-8");
      const data = JSON.parse(raw);
      newViolations = data.violations ?? [];
      newPlatesBySource = data.platesBySource ?? {};
    } catch {
      // use empty if file missing
    }

    let imageId: string | null = null;
    if (process.env.MONGODB_URI) {
      try {
        const buffer = Buffer.from(bytes);
        const bucket = await getGridFS();
        const uploadStream = bucket.openUploadStream(safeName, {
          contentType: file.type,
          metadata: { source: "report", originalName: file.name },
        });
        await new Promise<void>((resolve, reject) => {
          uploadStream.on("finish", () => resolve());
          uploadStream.on("error", reject);
          uploadStream.write(buffer);
          uploadStream.end();
        });
        imageId = uploadStream.id.toString();
        const db = await getDb();
        const col = db.collection(TRAFFIC_VIOLATIONS_COLLECTION);
        const maxDoc = await col.find().sort({ id: -1 }).limit(1).next();
        const nextId = maxDoc && typeof (maxDoc as { id?: number }).id === "number" ? (maxDoc as { id: number }).id + 1 : 1;
        const platesForSource = newPlatesBySource[safeName] ?? [];
        const docs = (newViolations as { className: string; confidence: number; detectedAt?: string }[]).map((v, i) => ({
          id: nextId + i,
          sourceFile: safeName,
          detectedAt: (v.detectedAt as string) || new Date().toISOString().replace("+00:00", "Z"),
          className: v.className,
          confidence: v.confidence,
          plates: platesForSource,
          imageId,
          ...(location !== undefined && { location }),
          ...(vehicle !== undefined && { vehicle }),
          ...(category !== undefined && { category }),
        }));
        if (docs.length) {
          await col.insertMany(docs);
        } else {
          await col.insertOne({
            id: nextId,
            sourceFile: safeName,
            detectedAt: new Date().toISOString().replace("+00:00", "Z"),
            className: "No violations detected",
            confidence: 0,
            plates: platesForSource,
            imageId,
            ...(location !== undefined && { location }),
            ...(vehicle !== undefined && { vehicle }),
            ...(category !== undefined && { category }),
          });
        }
      } catch (mongoErr) {
        console.error("MongoDB save failed:", mongoErr);
      }
    }

    // Merge new results into the snapshot we took before running the script (script overwrites the file)
    const existingViolations = (existingSnapshot.violations ?? []) as { id?: number }[];
    const maxId = existingViolations.length ? Math.max(...existingViolations.map((v) => v.id ?? 0)) : 0;
    const merged = (newViolations as { id?: number }[]).map((v, i) => ({ ...v, id: maxId + i + 1 }));
    const updated = {
      lastUpdated: new Date().toISOString().replace("+00:00", "Z"),
      total: (existingSnapshot.total ?? 0) + merged.length,
      violations: [...existingViolations, ...merged],
      platesBySource: { ...(existingSnapshot.platesBySource ?? {}), ...newPlatesBySource },
    };
    if (existsSync(path.dirname(dashboardPublic))) {
      await writeFile(dashboardPublic, JSON.stringify(updated, null, 2));
    }

    return NextResponse.json({
      success: true,
      message: "Report submitted. Violations (if any) will appear on the dashboard.",
      sourceFile: safeName,
      violations: newViolations,
    });
  } catch (e) {
    console.error("Report violation API error:", e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : "Upload failed." },
      { status: 500 }
    );
  }
}
