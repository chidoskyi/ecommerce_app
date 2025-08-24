import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  try {
    // Verify the request is from an authenticated user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            // This is a read-only operation, so we don't need to set cookies
          },
        },
      }
    )

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser()

    if (!supabaseUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { supabaseId, email, firstName, lastName, avatar, phone, emailVerified } = body

    // Verify the supabaseId matches the authenticated user
    if (supabaseId !== supabaseUser.id) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { supabaseId }
    })

    let user

    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: { supabaseId },
        data: {
          email: email || existingUser.email,
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
          avatar: avatar || existingUser.avatar,
          phone: phone || existingUser.phone,
          emailVerified: emailVerified !== undefined ? emailVerified : existingUser.emailVerified,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        }
      })
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          supabaseId,
          email: email || '',
          firstName: firstName || null,
          lastName: lastName || null,
          avatar: avatar || null,
          phone: phone || null,
          emailVerified: emailVerified || false,
          status: 'ACTIVE',
          lastLoginAt: new Date(),
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
        status: user.status,
      }
    })

  } catch (error) {
    console.error('Error syncing user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}