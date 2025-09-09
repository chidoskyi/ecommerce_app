// lib/auth.ts - Updated for Next.js 15 with RouteContext
import type { User, UserStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// Define the RouteContext type for Next.js App Router dynamic routes
export interface RouteContext<T extends Record<string, string | string[]> = Record<string, string>> {
  params: Promise<T>;
}

// Define comprehensive user interface
export interface AuthenticatedUser {
  id: string; // Database user ID
  clerkId: string; // Clerk user ID
  email: string;
  role: string;
  status: UserStatus;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  dateOfBirth: Date | null;
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define authenticated request interface
export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
  userId: string;
  dbUserId: string; 
  token?: string;
}

// Updated handlers for static routes (no dynamic segments)
export type StaticAuthenticatedHandler = (
  req: AuthenticatedRequest
) => Promise<NextResponse>;

export type StaticApiRouteHandler = (
  req: NextRequest
) => Promise<NextResponse>;

// Updated handlers for dynamic routes using RouteContext
export type DynamicAuthenticatedHandler<T extends Record<string, string | string[]> = Record<string, string>> = (
  req: AuthenticatedRequest,
  ctx: RouteContext<T>
) => Promise<NextResponse>;

export type DynamicApiRouteHandler<T extends Record<string, string | string[]> = Record<string, string>> = (
  req: NextRequest,
  ctx: RouteContext<T>
) => Promise<NextResponse>;

// Headers interface for better type safety
interface RequestHeaders {
  authorization: string | null;
  'x-auth-token': string | null;
  'x-user-id': string | null;
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
          token = await clerkAuth.getToken({ template: "default" });
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

      const headers: RequestHeaders = {
        authorization: req.headers.get("authorization"),
        'x-auth-token': req.headers.get("x-auth-token"),
        'x-user-id': req.headers.get("x-user-id")
      };

      console.log("Headers check:", {
        authorization: headers.authorization ? "EXISTS" : "MISSING",
        "x-auth-token": headers['x-auth-token'] ? "EXISTS" : "MISSING",
        "x-user-id": headers['x-user-id'] ? "EXISTS" : "MISSING",
      });

      // Extract token from headers
      if (headers.authorization?.startsWith("Bearer ")) {
        token = headers.authorization.substring(7);
        console.log("✅ Found token in Authorization header");
      } else if (headers['x-auth-token']) {
        token = headers['x-auth-token'];
        console.log("✅ Found token in x-auth-token header");
      }

      // Extract userId from headers if available
      if (headers['x-user-id']) {
        clerkUserId = headers['x-user-id'];
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
 * Helper function to attach user data to request
 */
function attachUserToRequest(req: NextRequest, user: User, token?: string): AuthenticatedRequest {
  const authenticatedReq = req as AuthenticatedRequest;
  
  authenticatedReq.user = {
    id: user.id, // Database ID
    clerkId: user.clerkId, // Clerk ID
    email: user.email,
    role: user.role,
    status: user.status,
    firstName: user.firstName || undefined,
    lastName: user.lastName || undefined,
    avatar: user.avatar || undefined,
    emailVerified: user.emailVerified,
    dateOfBirth: user.dateOfBirth,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
  
  authenticatedReq.userId = user.clerkId; // Alias for backward compatibility
  authenticatedReq.dbUserId = user.id; // Explicit database ID
  
  if (token) {
    authenticatedReq.token = token;
  }
  
  return authenticatedReq;
}

/**
 * Authentication middleware for STATIC routes (no dynamic segments)
 * Use this for routes like /api/users, /api/addresses, etc.
 */
export function requireAuth(handler: StaticAuthenticatedHandler): StaticApiRouteHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      console.log("🔐 RequireAuth middleware executing for static route...");

      const user = await getAuthFromRequest(req);

      if (user.status !== "ACTIVE") {
        console.error("❌ User account is not active:", user.status);
        return NextResponse.json(
          { error: "Account is not active" },
          { status: 401 }
        );
      }

      console.log("✅ User authenticated successfully:", user.email);

      // Try to get token for the request object
      let token: string | undefined;
      try {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        } else {
          const clerkAuth = auth();
          if (clerkAuth) {
            const clerkToken = await clerkAuth.getToken();
            token = clerkToken || undefined;
          }
        }
      } catch (tokenError) {
        console.warn("⚠️ Token attachment failed:", tokenError);
      }

      // Attach user data to request
      const authenticatedReq = attachUserToRequest(req, user, token);

      // Call the handler with authenticated request
      return handler(authenticatedReq);
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
  };
}

/**
 * Authentication middleware for DYNAMIC routes (with [param] segments) using RouteContext
 * Use this for routes like /api/users/[id], /api/addresses/[id], etc.
 */
export function requireAuthDynamic<T extends Record<string, string | string[]> = Record<string, string>>(
  handler: DynamicAuthenticatedHandler<T>
): DynamicApiRouteHandler<T> {
  return async (
    req: NextRequest,
    ctx: RouteContext<T>
  ): Promise<NextResponse> => {
    try {
      console.log("🔐 RequireAuth middleware executing for dynamic route...");

      const user = await getAuthFromRequest(req);

      if (user.status !== "ACTIVE") {
        console.error("❌ User account is not active:", user.status);
        return NextResponse.json(
          { error: "Account is not active" },
          { status: 401 }
        );
      }

      console.log("✅ User authenticated successfully:", user.email);

      // Try to get token for the request object
      let token: string | undefined;
      try {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        } else {
          const clerkAuth = auth();
          if (clerkAuth) {
            const clerkToken = await clerkAuth.getToken();
            token = clerkToken || undefined;
          }
        }
      } catch (tokenError) {
        console.warn("⚠️ Token attachment failed:", tokenError);
      }

      // Attach user data to request
      const authenticatedReq = attachUserToRequest(req, user, token);

      // Call the handler with authenticated request and RouteContext
      return handler(authenticatedReq, ctx);
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
  };
}

/**
 * Admin authentication middleware for STATIC routes (no dynamic segments)
 * Use this for routes like /api/admin/users, /api/admin/settings, etc.
 */
export function requireAdmin(handler: StaticAuthenticatedHandler): StaticApiRouteHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      console.log("🔐 RequireAdmin middleware executing for static route...");

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

      // Try to get token for the request object
      let token: string | undefined;
      try {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
          console.log("✅ Token retrieved from Authorization header");
        } else {
          const clerkAuth = auth();
          if (clerkAuth) {
            const clerkToken = await clerkAuth.getToken({
              template: "default",
            });
            token = clerkToken || undefined;
            console.log("✅ Token retrieved from Clerk auth");
          } else {
            console.warn("⚠️ No valid Clerk auth session available");
          }
        }
      } catch (tokenError) {
        console.warn("⚠️ Could not attach token to request:", tokenError);
      }

      // Attach user data to request
      const authenticatedReq = attachUserToRequest(req, user, token);

      // Call the handler with authenticated request
      return handler(authenticatedReq);
    } catch (error) {
      console.error("❌ Admin auth middleware error:", error);

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
  };
}

/**
 * Admin authentication middleware for DYNAMIC routes using RouteContext
 * Use this for routes like /api/admin/users/[id], /api/admin/orders/[id], etc.
 */
export function requireAdminDynamic<T extends Record<string, string | string[]> = Record<string, string>>(
  handler: DynamicAuthenticatedHandler<T>
): DynamicApiRouteHandler<T> {
  return async (
    req: NextRequest,
    ctx: RouteContext<T>
  ): Promise<NextResponse> => {
    try {
      console.log("🔐 RequireAdmin middleware executing for dynamic route...");

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

      // Try to get token for the request object
      let token: string | undefined;
      try {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
          console.log("✅ Token retrieved from Authorization header");
        } else {
          const clerkAuth = auth();
          if (clerkAuth) {
            const clerkToken = await clerkAuth.getToken({
              template: "default",
            });
            token = clerkToken || undefined;
            console.log("✅ Token retrieved from Clerk auth");
          } else {
            console.warn("⚠️ No valid Clerk auth session available");
          }
        }
      } catch (tokenError) {
        console.warn("⚠️ Could not attach token to request:", tokenError);
      }

      // Attach user data to request
      const authenticatedReq = attachUserToRequest(req, user, token);

      // Call the handler with authenticated request and RouteContext
      return handler(authenticatedReq, ctx);
    } catch (error) {
      console.error("❌ Admin auth middleware error:", error);

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
  };
}

/**
 * Role-based authentication middleware for STATIC routes (no dynamic segments)
 */
export function requireRoles(roles: string[]) {
  return function (handler: StaticAuthenticatedHandler): StaticApiRouteHandler {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        console.log(`🔐 RequireRoles middleware executing for roles:`, roles);

        const user = await getAuthFromRequest(req);

        if (user.status !== "ACTIVE") {
          return NextResponse.json(
            { error: "Account is not active" },
            { status: 401 }
          );
        }

        if (!roles.includes(user.role)) {
          console.error("❌ Insufficient role permissions:", {
            required: roles,
            actual: user.role,
          });

          return NextResponse.json(
            {
              error: "Insufficient permissions",
              message: "You do not have the required role to access this resource",
              requiredRoles: roles,
              userRole: user.role,
              timestamp: new Date().toISOString(),
            },
            { status: 403 }
          );
        }

        console.log("✅ Role access granted:", {
          email: user.email,
          role: user.role,
        });

        // Get token
        let token: string | undefined;
        try {
          const authHeader = req.headers.get("authorization");
          if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.substring(7);
          } else {
            const clerkAuth = auth();
            const clerkToken = await clerkAuth.getToken();
            token = clerkToken || undefined;
          }
        } catch (tokenError) {
          console.warn("⚠️ Token attachment failed:", tokenError);
        }

        // Attach user data to request
        const authenticatedReq = attachUserToRequest(req, user, token);

        return handler(authenticatedReq);
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
 * Role-based authentication middleware for DYNAMIC routes using RouteContext
 */
export function requireRolesDynamic<T extends Record<string, string | string[]> = Record<string, string>>(roles: string[]) {
  return function (handler: DynamicAuthenticatedHandler<T>): DynamicApiRouteHandler<T> {
    return async (
      req: NextRequest,
      ctx: RouteContext<T>
    ): Promise<NextResponse> => {
      try {
        console.log(`🔐 RequireRoles middleware executing for dynamic route with roles:`, roles);

        const user = await getAuthFromRequest(req);

        if (user.status !== "ACTIVE") {
          return NextResponse.json(
            { error: "Account is not active" },
            { status: 401 }
          );
        }

        if (!roles.includes(user.role)) {
          console.error("❌ Insufficient role permissions:", {
            required: roles,
            actual: user.role,
          });

          return NextResponse.json(
            {
              error: "Insufficient permissions",
              message: "You do not have the required role to access this resource",
              requiredRoles: roles,
              userRole: user.role,
              timestamp: new Date().toISOString(),
            },
            { status: 403 }
          );
        }

        console.log("✅ Role access granted:", {
          email: user.email,
          role: user.role,
        });

        // Get token
        let token: string | undefined;
        try {
          const authHeader = req.headers.get("authorization");
          if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.substring(7);
          } else {
            const clerkAuth = auth();
            const clerkToken = await clerkAuth.getToken();
            token = clerkToken || undefined;
          }
        } catch (tokenError) {
          console.warn("⚠️ Token attachment failed:", tokenError);
        }

        // Attach user data to request
        const authenticatedReq = attachUserToRequest(req, user, token);

        return handler(authenticatedReq, ctx);
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

/**
 * Type guard to check if request is authenticated
 */
export function isAuthenticatedRequest(req: NextRequest): req is AuthenticatedRequest {
  return 'user' in req && 'userId' in req && 'dbUserId' in req;
}

/**
 * Helper function to safely get user from authenticated request
 */
export function getUserFromRequest(req: NextRequest): AuthenticatedUser | null {
  if (isAuthenticatedRequest(req)) {
    return req.user;
  }
  return null;
}