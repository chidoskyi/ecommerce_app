import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, generateAccessToken, generateRefreshToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { error, value } = loginSchema.validate(body)
    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.details[0].message 
        },
        { status: 400 }
      )
    }

    const { email, password } = value

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid credentials' 
        },
        { status: 401 }
      )
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid credentials' 
        },
        { status: 401 }
      )
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account is not active' 
        },
        { status: 401 }
      )
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id })
    const refreshToken = generateRefreshToken()

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          emailVerified: user.emailVerified,
          lastLoginAt: user.lastLoginAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        tokens: {
          accessToken,
          refreshToken
        }
      },
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}