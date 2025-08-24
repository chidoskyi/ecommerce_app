// src/app/api/sync-users/route.ts
import { getUser } from "@/lib/users";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Add logging helper for consistency
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(
    `[USER ${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

export async function GET() {
  log("📊 user GET endpoint hit");

  try {
    log("🔐 Getting authenticated user from Clerk...");
    const { userId } = await auth();

    if (!userId) {
      log("❌ Unauthorized: No userId from Clerk");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log("✅ Authenticated user:", { userId });

    log("🔍 Fetching user from database...");
    const { user } = await getUser("", userId);

    if (!user) {
      log("❌ User not found in database:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    log("✅ User fetched successfully:", {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
    });

    // Return user data (the getUser function returns all fields)
    return NextResponse.json(
      {
        user: {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
          dateOfBirth: user.dateOfBirth,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    log("❌ Error fetching user:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 }
    );
  }
}