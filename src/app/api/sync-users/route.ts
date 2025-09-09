// src/app/api/sync-users/route.ts
import { auth } from "@clerk/nextjs/server";
import { updateUser, getUser } from "@/lib/users";
import { NextRequest, NextResponse } from "next/server";
import { UserProfile } from "@/types/users";

// Add logging helper for consistency
function log<T>(message: string, data?: string | number | boolean | object | T) {
  const timestamp = new Date().toISOString();
  console.log(
    `[USER ${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

export async function POST(req: NextRequest) {
  log("🔄 Sync users POST endpoint hit");

  try {
    // Get the authenticated user from Clerk
    log("🔐 Getting authenticated user from Clerk...");
    const { userId } = await auth();

    if (!userId) {
      log("❌ Unauthorized: No userId from Clerk");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log("✅ Authenticated user:", { userId });

    // Parse the request body
    log("📄 Parsing request body...");
    const body = await req.json();
    const { firstName, lastName, phone, dateOfBirth, role } = body;

    log("Request body data:", {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      role,
    });

    // Validate dateOfBirth format if provided
    let parsedDateOfBirth = null;
    if (dateOfBirth) {
      log("📅 Validating dateOfBirth...");
      parsedDateOfBirth = new Date(dateOfBirth);
      if (isNaN(parsedDateOfBirth.getTime())) {
        log("❌ Invalid date format:", dateOfBirth);
        return NextResponse.json(
          { error: "Invalid date format" },
          { status: 400 }
        );
      }
      log("✅ Date validated:", parsedDateOfBirth);
    }

    // Check if user exists in database using helper function
    log("🔍 Checking if user exists in database...");
    const { user: existingUser } = await getUser("", userId);

    if (!existingUser) {
      log("❌ User not found in database:", userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    log("✅ Found existing user:", {
      id: existingUser.id,
      clerkId: existingUser.clerkId,
      email: existingUser.email,
    });

    // Prepare update data (only include database-managed fields)
    const updateData: UserProfile = {
      id: existingUser.id,
      email: existingUser.email,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      phone: null,
      avatar: null,
      role: "USER",
      status: "ACTIVE",
      emailVerified: false,
      dateOfBirth: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    // Only update fields that are provided and different from current values
    if (phone !== undefined && phone !== existingUser.phone) {
      log("📱 Phone update detected:", { old: existingUser.phone, new: phone });
      updateData.phone = phone || null;
    }

    if (dateOfBirth !== undefined) {
      const existingDateString = existingUser.dateOfBirth?.toISOString();
      const newDateString = parsedDateOfBirth?.toISOString();
      if (existingDateString !== newDateString) {
        log("📅 Date of birth update detected:", {
          old: existingDateString,
          new: newDateString,
        });
        updateData.dateOfBirth = parsedDateOfBirth;
      }
    }

    // Handle firstName and lastName updates
    if (firstName !== undefined && firstName !== existingUser.firstName) {
      log("👤 First name update detected:", {
        old: existingUser.firstName,
        new: firstName,
      });
      updateData.firstName = firstName || null;
    }

    if (lastName !== undefined && lastName !== existingUser.lastName) {
      log("👤 Last name update detected:", {
        old: existingUser.lastName,
        new: lastName,
      });
      updateData.lastName = lastName || null;
    }

    // Role updates should be restricted (maybe only admins can update roles)
    if (role !== undefined && role !== existingUser.role) {
      log("🔐 Role update detected:", { old: existingUser.role, new: role });

      // Add role validation here - you might want to check if the current user
      // has permission to update roles
      const validRoles = ["USER", "ADMIN", "MODERATOR"]; // Based on your UserRole enum
      if (validRoles.includes(role)) {
        // Additional check: Only allow role updates if user is admin or updating their own non-admin role
        if (existingUser.role === "ADMIN" || role === "USER") {
          updateData.role = role;
        } else {
          log("❌ Insufficient permissions for role update");
          return NextResponse.json(
            { error: "Insufficient permissions to update role" },
            { status: 403 }
          );
        }
      } else {
        log("❌ Invalid role provided:", role);
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
    }

    log("📝 Update data prepared:", updateData);

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      log("ℹ️ No changes detected, returning current user data");
      return NextResponse.json(
        {
          message: "No changes to update",
          user: {
            id: existingUser.id,
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            phone: existingUser.phone,
            dateOfBirth: existingUser.dateOfBirth,
            role: existingUser.role,
          },
        },
        { status: 200 }
      );
    }

    // Update user in database using the helper function
    log("🔄 Updating user in database...");
    const updatedUser = await updateUser(existingUser.id, updateData);

    log("✅ User database fields updated successfully:", {
      userId,
      updatedFields: Object.keys(updateData),
    });

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: {
          id: updatedUser?.user?.id,
          firstName: updatedUser?.user?.firstName,
          lastName: updatedUser?.user?.lastName,
          phone: updatedUser?.user?.phone,
          dateOfBirth: updatedUser?.user?.dateOfBirth,
          role: updatedUser?.user?.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    log("❌ Error updating user:", error);
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

// GET method to fetch current user data
export async function GET() {
  log("📊 Sync users GET endpoint hit");

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
