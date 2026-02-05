import { NextResponse } from "next/server";
import { fetchActiveSessions, generateVideoSDKToken } from "@/lib/videosdk";

export async function GET() {
  try {
    const sessions = await fetchActiveSessions();
    const token = generateVideoSDKToken();
    const defaultMeetingId = process.env.VIDEOSDK_DEFAULT_MEETING_ID || "";

    return NextResponse.json({ sessions, token, defaultMeetingId });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
