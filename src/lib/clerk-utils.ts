// lib/clerk/auth.ts
import { auth, currentUser } from '@clerk/nextjs/server';
import type { User } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface AuthResult {
  user: User | null;
  userId: string | null;
  token: string | null;
}

/**
 * Comprehensive authentication utility that returns user, userId, and token
 * @returns Promise<AuthResult>
 */
export async function getAuth(): Promise<AuthResult> {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return { user: null, userId: null, token: null };

    const [user, token] = await Promise.all([
      currentUser(),
      getToken({ template: '_apptoken' })
    ]);

    return {
      user,
      userId,
      token: token || null
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { user: null, userId: null, token: null };
  }
}

/**
 * Get the current authenticated user from Clerk (Server-side)
 * @returns Promise<User | null>
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return await currentUser();
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Get the current user's ID from Clerk (Server-side)
 * @returns Promise<string | null>
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { userId } = await auth();
    return userId;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
}

/**
 * Get a JWT token for the current user (Server-side)
 * @returns Promise<string | null>
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const { getToken } = await auth();
    return await getToken({ template: '_apptoken' });
  } catch (error) {
    console.error('Error generating auth token:', error);
    return null;
  }
}

/**
 * Check if the current user is authenticated (Server-side)
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { userId } = await auth();
    return !!userId;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get user's display name from Clerk user object (Server-side)
 * @param user - Clerk user object
 * @returns string
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Anonymous';
  if (user.fullName) return user.fullName;
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  if (user.username) return user.username;
  if (user.emailAddresses?.[0]?.emailAddress) return user.emailAddresses[0].emailAddress;
  return 'User';
}

/**
 * Get user's primary email from Clerk user object (Server-side)
 * @param user - Clerk user object
 * @returns string | null
 */
export function getUserEmail(user: User | null): string | null {
  return user?.emailAddresses?.[0]?.emailAddress || null;
}

/**
 * Get user's primary phone number from Clerk user object (Server-side)
 * @param user - Clerk user object
 * @returns string | null
 */
export function getUserPhone(user: User | null): string | null {
  return user?.phoneNumbers?.[0]?.phoneNumber || null;
}

/**
 * Middleware to require authentication for API routes
 * @param handler - Next.js API route handler
 * @returns NextResponse
 */
export function withAuth(handler: (req: Request) => Promise<NextResponse>) {
  return async (req: Request) => {
    const { userId, token } = await getAuth();
    
    if (!userId || !token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Add user info to request headers for downstream use
    const headers = new Headers(req.headers);
    headers.set('x-user-id', userId);
    headers.set('authorization', `Bearer ${token}`);

    return handler(new Request(req, { headers }));
  };
}

/**
 * Middleware to require admin role for API routes
 * @param handler - Next.js API route handler
 * @param roles - Array of allowed roles
 * @returns NextResponse
 */
interface UserWithRoles extends User {
  publicMetadata: {
    roles?: string[];
    // Add other metadata properties you might use
    [key: string]: unknown;
  };
}

// Then use type assertion in your function
export function withRoles(roles: string[]) {
  return (handler: (req: Request) => Promise<NextResponse>) => {
    return async (req: Request) => {
      const { user, token } = await getAuth();
      
      if (!user || !token) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Type assertion to tell TypeScript about the roles structure
      const userWithRoles = user as UserWithRoles;
      
      // Check if user has any of the required roles
      const hasRole = roles.some(role => 
        userWithRoles.publicMetadata.roles?.includes(role)
      );

      if (!hasRole) {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }

      // Add user info to request headers
      const headers = new Headers(req.headers);
      headers.set('x-user-id', user.id);
      headers.set('x-user-roles', JSON.stringify(userWithRoles.publicMetadata.roles));
      headers.set('authorization', `Bearer ${token}`);

      return handler(new Request(req, { headers }));
    };
  };
}