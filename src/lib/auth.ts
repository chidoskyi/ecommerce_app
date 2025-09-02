// lib/auth.ts - Updated middleware with both user.id and clerkId
import type { User } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string; // Database user ID
    clerkId: string; // Clerk user ID
    email: string;
    role: string;
    status: string;
    // Add other user fields as needed
  };
  userId?: string; // Alias for clerkId (backward compatibility)
  dbUserId?: string; // Explicit database user ID
  token?: string;
}

/**
 * Enhanced function to get authenticated user from request
 */
export async function getAuthFromRequest(req?: NextRequest): Promise<User> {
  try {
    console.log("🔍 Starting authentication process...");

    let clerkUserId: string | null = null;
    let token: string | null = null;

    // Method 1: Try Clerk server-side auth first
    try {
      const clerkAuth = auth();
      clerkUserId = clerkAuth.userId;

      if (clerkUserId) {
        console.log("✅ Found userId from Clerk server auth:", clerkUserId);

        // Get token from Clerk
        try {
          token = await clerkAuth.getToken({ template: "_apptoken" });
          console.log("Token from Clerk:", token ? "EXISTS" : "NULL");
        } catch (tokenError) {
          console.warn("⚠️ Could not get token from Clerk:", tokenError);
        }
      }
    } catch (clerkError) {
      console.warn("⚠️ Clerk server auth not available:", clerkError);
    }

    // Method 2: Try extracting from request headers if no Clerk auth
    if (!clerkUserId && req) {
      console.log("🔍 Trying to extract auth from request headers...");

      const authHeader = req.headers.get("authorization");
      const customTokenHeader = req.headers.get("x-auth-token");
      const userIdHeader = req.headers.get("x-user-id");

      console.log("Headers check:", {
        authorization: authHeader ? "EXISTS" : "MISSING",
        "x-auth-token": customTokenHeader ? "EXISTS" : "MISSING",
        "x-user-id": userIdHeader ? "EXISTS" : "MISSING",
      });

      // Extract token from headers
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
        console.log("✅ Found token in Authorization header");
      } else if (customTokenHeader) {
        token = customTokenHeader;
        console.log("✅ Found token in x-auth-token header");
      }

      // Extract userId from headers if available
      if (userIdHeader) {
        clerkUserId = userIdHeader;
        console.log("✅ Found userId in x-user-id header:", clerkUserId);
      }
    }

    if (!clerkUserId) {
      console.error("❌ No user ID found in Clerk session or headers");
      throw new Error("Unauthorized - Please log in");
    }

    console.log("🔍 Fetching user from database with clerkId:", clerkUserId);

    // Find the user in your Prisma DB by Clerk's userId
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      console.error("❌ User not found in database for clerkId:", clerkUserId);
      throw new Error("User not found - Please complete registration");
    }

    console.log("✅ User found in database:", {
      id: user.id, // Database ID
      clerkId: user.clerkId, // Clerk ID
      email: user.email,
      role: user.role,
      status: user.status,
    });

    return user;
  } catch (error) {
    console.error("❌ Authentication error:", error);
    throw error;
  }
}

/**
 * Enhanced requireAuth middleware with both user.id and clerkId
 */
export function requireAuth(
  handler: (
    req: NextRequest,
    context: { params?: Record<string, string> }
  ) => Promise<NextResponse>
): (
  req: NextRequest,
  context: { params?: Record<string, string> }
) => Promise<NextResponse>;

export function requireAuth(req: NextRequest): Promise<NextResponse | null>;

export function requireAuth(
  handlerOrReq:
    | ((
        req: NextRequest,
        context: { params?: Record<string, string> }
      ) => Promise<NextResponse>)
    | NextRequest
): any {
  if (typeof handlerOrReq === "function") {
    const handler = handlerOrReq;
    return async (
      req: NextRequest,
      context: { params?: Record<string, string> } = {}
    ) => {
      const authResult = await requireAuth(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      return handler(req, context);
    };
  }

  const req = handlerOrReq;
  return (async () => {
    try {
      console.log("🔐 RequireAuth middleware executing...");

      const user = await getAuthFromRequest(req);

      if (user.status !== "ACTIVE") {
        console.error("❌ User account is not active:", user.status);
        return NextResponse.json(
          { error: "Account is not active" },
          { status: 401 }
        );
      }

      console.log("✅ User authenticated successfully:", user.email);

      // Attach comprehensive user info to request object
      const authenticatedReq = req as any;
      authenticatedReq.user = {
        id: user.id, // Database ID
        clerkId: user.clerkId, // Clerk ID
        email: user.email,
        role: user.role,
        status: user.status,
        // Add other fields as needed
      };
      authenticatedReq.userId = user.clerkId; // Alias for backward compatibility
      authenticatedReq.dbUserId = user.id; // Explicit database ID

      // Try to get token for the request object
      try {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          authenticatedReq.token = authHeader.substring(7);
        } else {
          const clerkAuth = auth();
          if (clerkAuth) {
            authenticatedReq.token = await clerkAuth.getToken();
          }
        }
      } catch (tokenError) {
        console.warn("⚠️ Token attachment failed:", tokenError);
      }

      return null; // Auth successful
    } catch (error) {
      console.error("❌ Auth middleware error:", error);

      if (error instanceof Error) {
        if (error.message.includes("Unauthorized")) {
          return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
          );
        }
        if (error.message.includes("User not found")) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 401 }
          );
        }
      }

      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 }
      );
    }
  })();
}

/**
 * Enhanced requireAdmin middleware with token support
 */
// Overloaded function signatures for different usage patterns
export function requireAdmin(
  handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse>;
export function requireAdmin(req: NextRequest): Promise<NextResponse | null>;
export function requireAdmin(
  handlerOrReq: ((req: NextRequest) => Promise<NextResponse>) | NextRequest
): any {
  // If it's a function (handler), return higher-order function
  if (typeof handlerOrReq === "function") {
    const handler = handlerOrReq;
    return async (req: NextRequest) => {
      const adminResult = await requireAdmin(req);
      if (adminResult instanceof NextResponse) {
        return adminResult;
      }
      return handler(req);
    };
  }

  // If it's a request, perform admin check directly
  const req = handlerOrReq;
  return (async () => {
    try {
      console.log("🔐 RequireAdmin middleware executing...");

      // Use the enhanced getAuthFromRequest function
      const user = await getAuthFromRequest(req);

      if (user.status !== "ACTIVE") {
        console.error("❌ Admin user account is not active:", user.status);
        return NextResponse.json(
          {
            error: "Account is not active",
            status: user.status,
            timestamp: new Date().toISOString(),
          },
          { status: 401 }
        );
      }

      // Check admin role
      if (user.role !== "ADMIN" && user.role !== "MODERATOR") {
        console.error("❌ Insufficient permissions:", {
          required: ["ADMIN", "MODERATOR"],
          actual: user.role,
        });
        return NextResponse.json(
          {
            error: "Admin access required",
            message: "Insufficient permissions to access this resource",
            requiredRoles: ["ADMIN", "MODERATOR"],
            userRole: user.role,
            timestamp: new Date().toISOString(),
          },
          { status: 403 }
        );
      }

      console.log("✅ Admin access granted:", {
        email: user.email,
        role: user.role,
      });

      // Attach user to request object
      const authenticatedReq = req as any;
      authenticatedReq.user = user;
      authenticatedReq.userId = user.clerkId;

      // Try to get token for the request object
      try {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          authenticatedReq.token = authHeader.substring(7);
          console.log("✅ Token retrieved from Authorization header");
        } else {
          const clerkAuth = auth();
          if (clerkAuth && clerkAuth.getToken) {
            authenticatedReq.token = await clerkAuth.getToken({
              template: "_apptoken",
            });
            console.log("✅ Token retrieved from Clerk auth");
          } else {
            console.warn("⚠️ No valid Clerk auth session available");
          }
        }
      } catch (tokenError) {
        console.warn("⚠️ Could not attach token to request:", tokenError);
      }

      return null; // No error, auth successful
    } catch (error) {
      console.error("❌ Admin auth middleware error:", error);

      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes("Unauthorized")) {
          return NextResponse.json(
            {
              error: "Authentication required",
              message: "Please log in to access this resource",
              timestamp: new Date().toISOString(),
            },
            { status: 401 }
          );
        }
        if (error.message.includes("User not found")) {
          return NextResponse.json(
            {
              error: "User not found",
              message: "Please complete your registration",
              timestamp: new Date().toISOString(),
            },
            { status: 401 }
          );
        }
      }

      return NextResponse.json(
        {
          error: "Authentication failed",
          message: "An error occurred during authentication",
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      );
    }
  })();
}

/**
 * Enhanced checkModerator function with better error handling
 */
export async function checkModerator(
  req: NextRequest
): Promise<NextResponse | null> {
  console.log("🔐 CheckModerator middleware executing...");

  const authResponse = await requireAuth(req);
  if (authResponse) return authResponse;

  const user = (req as any).user;
  if (user?.role !== "ADMIN" && user?.role !== "MODERATOR") {
    console.error("❌ Insufficient moderator permissions:", {
      required: ["ADMIN", "MODERATOR"],
      actual: user?.role,
    });

    return NextResponse.json(
      {
        error: "Moderator access required",
        message: "Insufficient permissions to access this resource",
        requiredRoles: ["ADMIN", "MODERATOR"],
        userRole: user?.role,
        timestamp: new Date().toISOString(),
      },
      { status: 403 }
    );
  }

  console.log("✅ Moderator access granted:", {
    email: user?.email,
    role: user?.role,
  });
  return null;
}

/**
 * Helper function to create role-based middleware
 */
export function requireRoles(roles: string[]) {
  return function (
    handler: (req: NextRequest) => Promise<NextResponse>
  ): (req: NextRequest) => Promise<NextResponse> {
    return async (req: NextRequest) => {
      try {
        console.log(`🔐 RequireRoles middleware executing for roles:`, roles);

        // First check authentication
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) {
          return authResult;
        }

        // Then check roles
        const user = (req as any).user;
        if (!user || !roles.includes(user.role)) {
          console.error("❌ Insufficient role permissions:", {
            required: roles,
            actual: user?.role,
          });

          return NextResponse.json(
            {
              error: "Insufficient permissions",
              message:
                "You do not have the required role to access this resource",
              requiredRoles: roles,
              userRole: user?.role,
              timestamp: new Date().toISOString(),
            },
            { status: 403 }
          );
        }

        console.log("✅ Role access granted:", {
          email: user.email,
          role: user.role,
        });
        return handler(req);
      } catch (error) {
        console.error("❌ Role middleware error:", error);
        return NextResponse.json(
          {
            error: "Authorization failed",
            message: "An error occurred during authorization",
            timestamp: new Date().toISOString(),
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Utility function to get current user for API routes
 */
export async function getCurrentAuthUser(
  req?: NextRequest
): Promise<User | null> {
  try {
    return await getAuthFromRequest(req);
  } catch (error) {
    console.error("Error getting current auth user:", error);
    return null;
  }
}
