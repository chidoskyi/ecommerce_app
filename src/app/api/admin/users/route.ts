// src/app/api/admin/users/route.ts
import { requireAdmin } from "@/lib/auth";
import { getUser, deleteUser, updateUser, getAllUsers} from "@/lib/users";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Add logging helper for consistency
function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(
    `[USER ${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

// Helper function to parse query parameters
function parseQueryParams(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const offset = (page - 1) * limit;

  // Sorting
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = searchParams.get('sortOrder')?.toLowerCase() === 'asc' ? 'asc' : 'desc';

  // Filters
  const filters: Record<string, any> = {};
  
  // Status filter
  const status = searchParams.get('status');
  if (status) {
    filters.status = status;
  }

  // Role filter
  const role = searchParams.get('role');
  if (role) {
    filters.role = role;
  }

  // Email verified filter
  const emailVerified = searchParams.get('emailVerified');
  if (emailVerified !== null) {
    filters.emailVerified = emailVerified === 'true';
  }

  // Date range filters
  const createdAfter = searchParams.get('createdAfter');
  const createdBefore = searchParams.get('createdBefore');
  const lastLoginAfter = searchParams.get('lastLoginAfter');
  const lastLoginBefore = searchParams.get('lastLoginBefore');

  if (createdAfter || createdBefore) {
    filters.createdAt = {};
    if (createdAfter) filters.createdAt.gte = new Date(createdAfter);
    if (createdBefore) filters.createdAt.lte = new Date(createdBefore);
  }

  if (lastLoginAfter || lastLoginBefore) {
    filters.lastLoginAt = {};
    if (lastLoginAfter) filters.lastLoginAt.gte = new Date(lastLoginAfter);
    if (lastLoginBefore) filters.lastLoginAt.lte = new Date(lastLoginBefore);
  }

  // Search query (searches across multiple fields)
  const search = searchParams.get('search');
  if (search) {
    filters.search = search.trim();
  }

  // Specific field filters
  const email = searchParams.get('email');
  if (email) {
    filters.email = email;
  }

  const firstName = searchParams.get('firstName');
  if (firstName) {
    filters.firstName = firstName;
  }

  const lastName = searchParams.get('lastName');
  if (lastName) {
    filters.lastName = lastName;
  }

  const phone = searchParams.get('phone');
  if (phone) {
    filters.phone = phone;
  }

  // Fields to include/exclude
  const fields = searchParams.get('fields');
  const includeFields = fields ? fields.split(',').map(f => f.trim()) : null;

  const excludeFields = searchParams.get('excludeFields');
  const excludeFieldsList = excludeFields ? excludeFields.split(',').map(f => f.trim()) : null;

  return {
    pagination: { page, limit, offset },
    sorting: { sortBy, sortOrder },
    filters,
    fields: { include: includeFields, exclude: excludeFieldsList }
  };
}

// Helper function to filter user fields
function filterUserFields(user: any, includeFields?: string[] | null, excludeFields?: string[] | null) {
  const allFields = {
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
  };

  // If includeFields is specified, only include those fields
  if (includeFields && includeFields.length > 0) {
    const filteredFields: any = {};
    includeFields.forEach(field => {
      if (field in allFields) {
        filteredFields[field] = allFields[field as keyof typeof allFields];
      }
    });
    return filteredFields;
  }

  // If excludeFields is specified, exclude those fields
  if (excludeFields && excludeFields.length > 0) {
    const filteredFields = { ...allFields };
    excludeFields.forEach(field => {
      delete filteredFields[field as keyof typeof filteredFields];
    });
    return filteredFields;
  }

  return allFields;
}

export async function GET(request: NextRequest) {
  log("📊 Users GET endpoint hit");

  try {
    // Apply admin middleware for listing all users
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    log("🔐 Getting authenticated user from Clerk...");
    const { userId } = await auth();

    if (!userId) {
      log("❌ Unauthorized: No userId from Clerk");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if this is a single user request
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');
    
    if (targetUserId) {
      // Single user request
      log("🔍 Fetching single user:", { targetUserId });
      const { user } = await getUser("", targetUserId);

      if (!user) {
        log("❌ User not found:", targetUserId);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const { fields } = parseQueryParams(request);
      const filteredUser = filterUserFields(user, fields.include, fields.exclude);

      log("✅ User fetched successfully:", { id: user.id });

      return NextResponse.json({ user: filteredUser }, { status: 200 });
    }

    // Multiple users request with filters
    log("📋 Parsing query parameters...");
    const { pagination, sorting, filters, fields } = parseQueryParams(request);
    
    log("🔍 Query parameters:", {
      pagination,
      sorting,
      filters: Object.keys(filters),
      fields
    });

    // Get users with filters (assuming getAllUsers function supports these parameters)
    log("🔍 Fetching users from database...");
    const result = await getAllUsers({
      ...pagination,
      ...sorting,
      filters,
    });

    if (!result.success) {
      log("❌ Error fetching users:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to fetch users" },
        { status: 500 }
      );
    }

    const { users, total, totalPages } = result;

    // Filter fields for each user
    const filteredUsers = users.map((user: any) => 
      filterUserFields(user, fields.include, fields.exclude)
    );

    log("✅ Users fetched successfully:", {
      count: users.length,
      total,
      page: pagination.page,
      totalPages
    });

    // Return paginated response
    return NextResponse.json(
      {
        users: filteredUsers,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
        sorting: {
          sortBy: sorting.sortBy,
          sortOrder: sorting.sortOrder,
        },
        filters: Object.keys(filters).length > 0 ? filters : null,
      },
      { status: 200 }
    );

  } catch (error) {
    log("❌ Error fetching users:", error);
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

export async function PUT(request: NextRequest) {
  log("📝 User PUT endpoint hit");

  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    log("🔐 Getting authenticated user from Clerk...");
    const { userId } = await auth();

    if (!userId) {
      log("❌ Unauthorized: No userId from Clerk");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log("✅ Authenticated user:", { userId });

    // Parse request body
    log("📋 Parsing request body...");
    const body = await request.json();
    
    // Define updatable fields (excluding read-only fields like id, createdAt, etc.)
    const updatableFields = [
      'email',
      'firstName', 
      'lastName',
      'phone',
      'avatar',
      'dateOfBirth',
      'role',
      'status',
      'emailVerified'
    ];

    // Filter out non-updatable fields and undefined values
    const updateData: Record<string, any> = {};
    Object.keys(body).forEach(key => {
      if (updatableFields.includes(key) && body[key] !== undefined) {
        updateData[key] = body[key];
      }
    });

    log("🔍 Fields to update:", updateData);

    // Validate that we have at least one field to update
    if (Object.keys(updateData).length === 0) {
      log("❌ No valid fields provided for update");
      return NextResponse.json(
        { error: "No valid fields provided for update" }, 
        { status: 400 }
      );
    }

    // Get the user ID from query params or use current user
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId') || userId;

    log("🎯 Target user ID for update:", { targetUserId });

    // Check if user exists before updating
    log("🔍 Checking if user exists...");
    
    // FIXED: Determine if targetUserId is a clerkId or internal database ID
    // Clerk IDs start with 'user_' followed by alphanumeric characters
    // Internal MongoDB IDs are 24-character hex strings
    const isClerkId = targetUserId.startsWith('user_');
    const isInternalId = /^[0-9a-fA-F]{24}$/.test(targetUserId);
    
    let existingUser;
    if (isClerkId) {
      // Search by clerkId
      log(`🔎 Detected Clerk ID format: ${targetUserId}`);
      const result = await getUser(undefined, targetUserId);
      existingUser = result.user;
    } else if (isInternalId) {
      // Search by internal database ID
      log(`🔎 Detected internal database ID format: ${targetUserId}`);
      const result = await getUser(targetUserId, undefined);
      existingUser = result.user;
    } else {
      // Try both approaches as fallback
      log(`🔎 Unknown ID format, trying both approaches: ${targetUserId}`);
      let result = await getUser(targetUserId, undefined);
      if (!result.user) {
        result = await getUser(undefined, targetUserId);
      }
      existingUser = result.user;
    }
    
    if (!existingUser) {
      log("❌ User not found:", targetUserId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    log("✅ User found:", {
      id: existingUser.id,
      clerkId: existingUser.clerkId,
      email: existingUser.email
    });

    // Perform the update - use the internal ID (existingUser.id) not the targetUserId
    log("🔄 Updating user...");
    const { user: updatedUser } = await updateUser(existingUser.id, updateData);

    if (!updatedUser) {
      log("❌ Failed to update user");
      return NextResponse.json(
        { error: "Failed to update user" }, 
        { status: 500 }
      );
    }

    log("✅ User updated successfully:", {
      id: updatedUser.id,
      updatedFields: Object.keys(updateData)
    });

    // Return updated user data
    return NextResponse.json(
      {
        message: "User updated successfully",
        user: {
          id: updatedUser.id,
          clerkId: updatedUser.clerkId,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          avatar: updatedUser.avatar,
          dateOfBirth: updatedUser.dateOfBirth,
          role: updatedUser.role,
          status: updatedUser.status,
          emailVerified: updatedUser.emailVerified,
          lastLoginAt: updatedUser.lastLoginAt,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
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

// Add this temporary route to help debug
export async function DELETE(request: NextRequest) {
  log("🗑️ User DELETE endpoint hit");

  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    log("🔐 Getting authenticated user from Clerk...");
    const { userId } = await auth();

    if (!userId) {
      log("❌ Unauthorized: No userId from Clerk");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user ID from query params
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');

    if (!targetUserId) {
      log("❌ No userId provided for deletion");
      return NextResponse.json(
        { error: "User ID is required" }, 
        { status: 400 }
      );
    }

    log("🎯 Target user ID for deletion:", { targetUserId });

    // Check if user exists before deleting
    log("🔍 Checking if user exists...");
    
    // FIXED: Proper ID detection logic (same as PUT endpoint)
    const isClerkId = targetUserId.startsWith('user_');
    const isInternalId = /^[0-9a-fA-F]{24}$/.test(targetUserId);
    
    let existingUser;
    if (isClerkId) {
      // Search by clerkId
      log(`🔎 Detected Clerk ID format: ${targetUserId}`);
      const result = await getUser(undefined, targetUserId);
      existingUser = result.user;
    } else if (isInternalId) {
      // Search by internal database ID
      log(`🔎 Detected internal database ID format: ${targetUserId}`);
      const result = await getUser(targetUserId, undefined);
      existingUser = result.user;
    } else {
      // Try both approaches as fallback
      log(`🔎 Unknown ID format, trying both approaches: ${targetUserId}`);
      let result = await getUser(targetUserId, undefined);
      if (!result.user) {
        result = await getUser(undefined, targetUserId);
      }
      existingUser = result.user;
    }
    
    if (!existingUser) {
      log("❌ User not found:", targetUserId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    log("✅ User found for deletion:", {
      id: existingUser.id,
      clerkId: existingUser.clerkId,
      email: existingUser.email
    });

    // Perform the deletion - use the internal ID (existingUser.id)
    log("🗑️ Deleting user...");
    const result = await deleteUser(existingUser.id);

    if (!result.success) {
      log("❌ Failed to delete user:", result.error);
      return NextResponse.json(
        { error: "Failed to delete user" }, 
        { status: 500 }
      );
    }

    log("✅ User deleted successfully:", { 
      deletedId: existingUser.id,
      deletedClerkId: existingUser.clerkId 
    });

    return NextResponse.json(
      { 
        message: "User deleted successfully",
        deletedUser: {
          id: existingUser.id,
          clerkId: existingUser.clerkId,
          email: existingUser.email
        }
      },
      { status: 200 }
    );

  } catch (error) {
    log("❌ Error deleting user:", error);
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