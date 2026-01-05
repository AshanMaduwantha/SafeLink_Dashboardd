import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase, getFirebaseAuth } from "@/lib/config/firebase";
import { getFirestore } from "firebase-admin/firestore";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!id || (status !== "active" && status !== "inactive")) {
      return NextResponse.json(
        {
          message:
            "User ID and valid status ('active' or 'inactive') are required.",
        },
        { status: 400 },
      );
    }

    // Initialize Firebase Admin
    initializeFirebase();
    const auth = getFirebaseAuth();
    const db = getFirestore();

    // Auth update
    const disabled = status === "inactive";
    await auth.updateUser(id, { disabled });

    // Firestore update
    await db.collection("users").doc(id).update({
      status,
      disabled,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { message: "User status updated successfully." },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error updating user status:", error);
    return NextResponse.json(
      { message: `Failed to update user status: ${error.message}` },
      { status: 500 },
    );
  }
}
