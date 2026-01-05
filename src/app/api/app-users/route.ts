import { NextRequest, NextResponse } from "next/server";
import { initializeFirebase, getFirebaseApp } from "@/lib/config/firebase";

export async function GET(request: NextRequest) {
  try {
    initializeFirebase();
    const app = getFirebaseApp();
    const db = app.firestore();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    const offset = (page - 1) * limit;

    // Simple query - only needs one index (role + createdAt)
    const query = db.collection("users").where("role", "==", "app user");

    // Get total count
    const countSnapshot = await query.get();
    const totalItems = countSnapshot.size;

    // Get paginated data
    const snapshot = await query.limit(limit).offset(offset).get();

    // Transform users
    let users = snapshot.docs.map((doc) => {
      const userData = doc.data();
      return {
        uid: doc.id,
        title: userData.title || "N/A",
        name: userData.name || "N/A",
        email: userData.email || "N/A",
        phone: userData.phone || "-",
        provider: userData.provider || "N/A",
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
      };
    });

    // Apply search in JavaScript (avoids needing another index)
    if (search) {
      users = users.filter(
        (user) =>
          user.name.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()),
      );
    }

    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
      totalUsers: totalItems,
    });
  } catch (error) {
    console.error("Error fetching users from Firestore:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
