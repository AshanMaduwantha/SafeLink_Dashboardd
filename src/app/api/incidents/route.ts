import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import Incident from "@/models/Incident";

export async function GET(request: NextRequest) {
  try {
    await connectMongoDB();

    const searchParams = request.nextUrl.searchParams;
    const language = searchParams.get("language");
    const severity = searchParams.get("severity");
    const incidentType = searchParams.get("incidentType");

    const query: Record<string, string> = {};
    if (language && language !== "All Languages") query.language = language;
    if (severity && severity !== "All Severity") query.severity = severity;
    if (incidentType && incidentType !== "All Categories") {
      query.incidentType = incidentType;
    }

    const incidents = await Incident.find(query).sort({ dateTime: -1 }).lean();
    return NextResponse.json({ incidents });
  } catch (error) {
    console.error("Failed to fetch incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoDB();

    const body = await request.json();
    const {
      victim,
      dateTime,
      location,
      description,
      language,
      incidentType,
      severity,
    } = body;

    if (
      !victim ||
      !dateTime ||
      !location ||
      !description ||
      !incidentType ||
      !severity
    ) {
      return NextResponse.json(
        { error: "Missing required incident fields" },
        { status: 400 },
      );
    }

    const newIncident = await Incident.create({
      victim,
      dateTime: new Date(dateTime),
      location,
      description,
      language,
      incidentType,
      severity,
    });

    return NextResponse.json({ incident: newIncident }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: "Duplicate incident entry" },
        { status: 409 },
      );
    }

    console.error("Failed to create incident:", error);
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 },
    );
  }
}
