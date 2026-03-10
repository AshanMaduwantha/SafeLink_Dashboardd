import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

/**
 * Serve violation image by source filename.
 * Prefers the annotated image (with detection frames) from MODELS_DIR/results/predictions
 * when it exists; otherwise serves the original from MODELS_DIR/data.
 */
export async function GET(request: NextRequest) {
  const modelsDir = process.env.MODELS_DIR;
  if (!modelsDir) {
    return new NextResponse("MODELS_DIR not configured", { status: 503 });
  }
  const file = request.nextUrl.searchParams.get("file");
  if (!file || path.basename(file) !== file) {
    return new NextResponse("Invalid file parameter", { status: 400 });
  }
  const safeName = path.basename(file);
  const resolvedModelsDir = path.resolve(modelsDir);
  const predictionsDir = path.join(modelsDir, "results", "predictions");
  const dataDir = path.join(modelsDir, "data");
  const predictionsPath = path.resolve(path.join(predictionsDir, safeName));
  const dataPath = path.resolve(path.join(dataDir, safeName));

  if (!predictionsPath.startsWith(resolvedModelsDir) || !dataPath.startsWith(resolvedModelsDir)) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  // Prefer annotated image (with bounding boxes) if it exists (YOLO may save as .jpg when input is .jpeg)
  let pathToServe = dataPath;
  if (existsSync(predictionsPath)) {
    pathToServe = predictionsPath;
  } else {
    const base = path.join(predictionsDir, path.basename(safeName, path.extname(safeName)));
    const altExt = path.extname(safeName).toLowerCase() === ".jpeg" ? ".jpg" : ".jpeg";
    const altPath = path.resolve(base + altExt);
    if (altPath.startsWith(resolvedModelsDir) && existsSync(altPath)) pathToServe = altPath;
  }
  try {
    const buffer = await readFile(pathToServe);
    const ext = path.extname(pathToServe).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".gif"
          ? "image/gif"
          : ext === ".webp"
            ? "image/webp"
            : ext === ".jpeg" || ext === ".jpg"
              ? "image/jpeg"
              : "image/jpeg";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("File not found", { status: 404 });
  }
}
