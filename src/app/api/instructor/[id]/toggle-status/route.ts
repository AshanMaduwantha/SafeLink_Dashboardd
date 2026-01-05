import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase, getFirebaseAuth } from "@/lib/config/firebase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (typeof status !== "boolean") {
      return NextResponse.json(
        { message: "Invalid status provided." },
        { status: 400 },
      );
    }

    initializeFirebase();
    const auth = getFirebaseAuth();

    await auth.updateUser(id, {
      disabled: !status,
    });

    return NextResponse.json(
      { message: "Instructor status updated successfully." },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating instructor status:", error);
    return NextResponse.json(
      { message: `Failed to update instructor status: ${error.message}` },
      { status: 500 },
    );
  }
}
