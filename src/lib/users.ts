// src/lib/users.ts (updated with proper typing)
import { User } from "@prisma/client";
import prisma from "./prisma";
import EmailService from "@/lib/emailService";

const emailService = new EmailService();

// Define the minimal user interface needed for email sending
export interface EmailUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(
    `[USER_SERVICE ${timestamp}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

export async function createUser(user: Partial<User>) {
  try {
    log("🏗️ Creating user in database...", user);
    const newUser = await prisma.user.create({
      data: user as any,
    });

    log("✅ User created successfully in database:", newUser);

    // Send welcome email with only the needed properties
    try {
      await emailService.sendWelcomeEmail({
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      });
      log("✅ Welcome email sent successfully to:", newUser.email);
    } catch (emailError) {
      log("⚠️ Welcome email could not be sent:", emailError);
    }

    return newUser;
  } catch (error) {
    log("❌ Error creating user in database:", error);
    throw new Error(`Error creating user: ${error}`);
  }
}

// src/lib/users.ts (updated getAllUsers function)
export async function getAllUsers(params?: {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: Record<string, any>;
}) {
  try {
    log("🔍 Getting users from database with params...", params);

    const {
      limit = 10,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
      filters = {},
    } = params || {};

    // Build where clause for filtering
    const where: any = {};

    // Status filter
    if (filters.status) {
      where.status = filters.status;
    }

    // Role filter
    if (filters.role) {
      where.role = filters.role;
    }

    // Email verified filter
    if (filters.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified;
    }

    // Email filter
    if (filters.email) {
      where.email = { contains: filters.email, mode: "insensitive" };
    }

    // First name filter
    if (filters.firstName) {
      where.firstName = { contains: filters.firstName, mode: "insensitive" };
    }

    // Last name filter
    if (filters.lastName) {
      where.lastName = { contains: filters.lastName, mode: "insensitive" };
    }

    // Phone filter
    if (filters.phone) {
      where.phone = { contains: filters.phone };
    }

    // Search across multiple fields
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
      ];
    }

    // Date range filters
    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt.gte)
        where.createdAt.gte = new Date(filters.createdAt.gte);
      if (filters.createdAt.lte)
        where.createdAt.lte = new Date(filters.createdAt.lte);
    }

    if (filters.lastLoginAt) {
      where.lastLoginAt = {};
      if (filters.lastLoginAt.gte)
        where.lastLoginAt.gte = new Date(filters.lastLoginAt.gte);
      if (filters.lastLoginAt.lte)
        where.lastLoginAt.lte = new Date(filters.lastLoginAt.lte);
    }

    // Get total count for pagination
    const total = await prisma.user.count({ where });

    // Calculate total pages
    const totalPages = Math.ceil(total / limit);

    // Get users with pagination and filtering
    const users = await prisma.user.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    log(`✅ Found ${users.length} users out of ${total} total`);

    return {
      success: true,
      users,
      total,
      totalPages,
    };
  } catch (error) {
    log("❌ Error getting users from database:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
// src/lib/users.ts - update getUser function with detailed logging
export async function getUser(id?: string, clerkId?: string) {
    try {
      log('🔍 Getting user from database...', { id, clerkId });
      
      if (!id && !clerkId) {
        log('❌ No user ID or clerk ID provided');
        return { success: false, error: 'No user ID or clerk ID provided' };
      }
  
      let user = null;
      let queryType = '';
  
      if (id) {
        // Check if the provided 'id' is actually a Clerk ID format
        const isClerkIdFormat = id.startsWith('user_');
        const isInternalIdFormat = /^[0-9a-fA-F]{24}$/.test(id);
  
        if (isClerkIdFormat) {
          // The 'id' parameter is actually a Clerk ID
          queryType = 'clerkId (from id param)';
          log(`🔎 ID parameter looks like Clerk ID: ${id}`);
          user = await prisma.user.findUnique({
            where: { clerkId: id }
          });
        } else if (isInternalIdFormat) {
          // The 'id' parameter is an internal database ID
          queryType = 'internal id';
          log(`🔎 Searching by internal ID: ${id}`);
          user = await prisma.user.findUnique({
            where: { id }
          });
        } else {
          // Unknown format, try as internal ID first, then as Clerk ID
          queryType = 'internal id (unknown format)';
          log(`🔎 Unknown ID format, trying as internal ID first: ${id}`);
          user = await prisma.user.findUnique({
            where: { id }
          });
          
          if (!user) {
            queryType = 'clerkId (fallback)';
            log(`🔎 Not found as internal ID, trying as Clerk ID: ${id}`);
            user = await prisma.user.findUnique({
              where: { clerkId: id }
            });
          }
        }
      } else if (clerkId) {
        queryType = 'clerkId';
        log(`🔎 Searching by Clerk ID: ${clerkId}`);
        user = await prisma.user.findUnique({
          where: { clerkId }
        });
      }
  
      if (!user) {
        log(`❌ User not found using ${queryType}`);
        return { success: false, error: 'User not found' };
      }
  
      log(`✅ User found using ${queryType}:`, {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email
      });
      
      return { success: true, user };
    } catch (error) {
      log('❌ Error getting user from database:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

export async function updateUser(id: string, data: Partial<User>) {
  try {
    log("🔄 Updating user in database...", { id, data });

    if (!id) {
        return { success: false, error: 'No user ID provided' };
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
    });

    log("✅ User updated successfully in database:", updatedUser);
    return { success: true, user: updatedUser };
  } catch (error) {
    log("❌ Error updating user in database:", error);
    throw new Error(`Error updating user: ${error}`);
  }
}

export async function deleteUser(id: string) {
  try {
    log("🗑️ Deleting user from database...", { id });

    if (!id) {
        return { success: false, error: 'No user ID provided' };
    }

    const deletedUser = await prisma.user.delete({
      where: { id },
    });

    log("✅ User deleted successfully from database:", deletedUser);
    return { success: true, user: deletedUser };
  } catch (error) {
    log("❌ Error deleting user from database:", error);
    throw new Error(`Error deleting user: ${error}`);
  }
}
