import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateAccessToken, generateRefreshToken, generateEmailVerificationToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validation'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { error, value } = registerSchema.validate(body)
    if (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.details[0].message 
        },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName, phone } = value

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User already exists with this email' 
        },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)
    const emailVerificationToken = generateEmailVerificationToken()

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        emailVerificationToken
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

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

    // Send verification email
    try {
      await sendVerificationEmail(user.email, emailVerificationToken, user.firstName || 'User')
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail registration if email fails
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user,
          tokens: {
            accessToken,
            refreshToken
          }
        },
        message: 'Registration successful. Please check your email to verify your account.'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    )
  }
}