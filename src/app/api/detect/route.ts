import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videourl, location, datetime } = body as {
      videourl: string;
      location: string;
      datetime?: string;
    };
    const sanitizedVideoUrl = videourl?.trim();
    const sanitizedLocation = location?.trim();

    if (!sanitizedVideoUrl || !sanitizedLocation) {
      return NextResponse.json(
        { error: "videourl and location are required" },
        { status: 400 },
      );
    }

    const detectorUrl =
      process.env.PYTHON_DETECTOR_URL ?? "http://localhost:8010";

    const response = await fetch(`${detectorUrl}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videourl: sanitizedVideoUrl,
        location: sanitizedLocation,
        datetime,
      }),
      // Detection can take a few minutes for long videos
      // @ts-expect-error Node 18+ fetch supports signal/timeout via undici
      signal: AbortSignal.timeout(600_000),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Detector returned ${response.status}: ${text}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
      return NextResponse.json(
        {
          error:
            "Python detector service is not running. Start it with: python api_server.py",
        },
        { status: 503 },
      );
    }

    console.error("Detect route error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
