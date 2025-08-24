// src/lib/users.ts (updated with logging)
import { User } from "@prisma/client";
import prisma from "./prisma";

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[USER_SERVICE ${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

export async function createUser(user: Partial<User>) {
    try {
        log('🏗️ Creating user in database...', user);
        const newUser = await prisma.user.create({
            data: user as any // Using 'as any' to handle the Partial<User> type
        })
        log('✅ User created successfully in database:', newUser);
        return newUser
    } catch (error) {
        log('❌ Error creating user in database:', error);
        throw new Error(`Error creating user: ${error}`)
    }
}

export async function getUser(id?: string, clerkId?: string) {
    try {
        log('🔍 Getting user from database...', { id, clerkId });
        
        if (!id && !clerkId) {
            throw new Error('No user ID or clerk ID provided')
        }

        const query = id ? { id } : { clerkId }
        log('Database query:', query);

        const user = await prisma.user.findUnique({
            where: query
        })
        
        log('User found:', user);
        return { user }
    } catch (error) {
        log('❌ Error getting user from database:', error);
        throw new Error(`Error getting user: ${error}`)
    }
}

export async function updateUser(id: string, data: Partial<User>) {
    try {
        log('🔄 Updating user in database...', { id, data });
        
        if (!id) {
            throw new Error('No user ID provided')
        }
        
        const updatedUser = await prisma.user.update({
            where: { id },
            data
        })
        
        log('✅ User updated successfully in database:', updatedUser);
        return updatedUser
    } catch (error) {
        log('❌ Error updating user in database:', error);
        throw new Error(`Error updating user: ${error}`)
    }
}

export async function deleteUser(id: string) {
    try {
        log('🗑️ Deleting user from database...', { id });
        
        if (!id) {
            throw new Error('No user ID provided')
        }
        
        const deletedUser = await prisma.user.delete({
            where: { id }
        })
        
        log('✅ User deleted successfully from database:', deletedUser);
        return deletedUser
    } catch (error) {
        log('❌ Error deleting user from database:', error);
        throw new Error(`Error deleting user: ${error}`)
    }   
}