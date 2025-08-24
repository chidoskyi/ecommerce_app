// lib/auth.ts
import type { User } from "@prisma/client";
import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from "./auth";


export interface AuthenticatedRequest extends Request {
  user?: User
}

// Overloaded function signatures for different usage patterns
export function requireAuth(handler: (req: NextRequest) => Promise<NextResponse>): (req: NextRequest) => Promise<NextResponse>;
export function requireAuth(req: NextRequest): Promise<NextResponse | null>;
export function requireAuth(handlerOrReq: ((req: NextRequest) => Promise<NextResponse>) | NextRequest): any {
  // If it's a function (handler), return higher-order function
  if (typeof handlerOrReq === 'function') {
    const handler = handlerOrReq;
    return async (req: NextRequest) => {
      const authResult = await requireAuth(req);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      return handler(req);
    };
  }

  // If it's a request, perform auth check directly
  const req = handlerOrReq;
  return (async () => {
    try {
      // Use the centralized getAuthenticatedUser function
      const user = await getAuthFromRequest();

      if (user.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Account is not active' },
          { status: 401 }
        );
      }

      // Attach user to request object
      (req as any).user = user;

      return null; // No error, auth successful

    } catch (error) {
      console.error('Auth middleware error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
        if (error.message === 'User not found') {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 401 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  })();
}

// Overloaded function signatures for different usage patterns
export function requireAdmin(handler: (req: NextRequest) => Promise<NextResponse>): (req: NextRequest) => Promise<NextResponse>;
export function requireAdmin(req: NextRequest): Promise<NextResponse | null>;
export function requireAdmin(handlerOrReq: ((req: NextRequest) => Promise<NextResponse>) | NextRequest): any {
  // If it's a function (handler), return higher-order function
  if (typeof handlerOrReq === 'function') {
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
      // Use the centralized getAuthenticatedUser function
      const user = await getAuthFromRequest();

      if (user.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Account is not active' },
          { status: 401 }
        );
      }

      // Check admin role
      if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      // Attach user to request object
      (req as any).user = user;

      return null; // No error, auth successful

    } catch (error) {
      console.error('Admin auth middleware error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message === 'Unauthorized') {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }
        if (error.message === 'User not found') {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 401 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  })();
}



export async function checkModerator(req: NextRequest): Promise<NextResponse | null> {
  const authResponse = await requireAuth(req);
  if (authResponse) return authResponse;
  
  const user = req.user;
  if (user?.role !== 'ADMIN' && user?.role !== 'MODERATOR') {
    return NextResponse.json(
      { error: 'Moderator access required' },
      { status: 403 }
    );
  }
  return null;
}
