import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAccessToken, generateRefreshToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { refreshToken } = body

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'Refresh token required' },
        { status: 400 }
      )
    }

    // Find refresh token in database
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    })

    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: tokenRecord.id },
      })
      
      return NextResponse.json(
        { success: false, error: 'Refresh token expired' },
        { status: 401 }
      )
    }

    // Check if user is still active
    if (tokenRecord.user.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'User account is not active' },
        { status: 401 }
      )
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken({ userId: tokenRecord.user.id })
    const newRefreshToken = generateRefreshToken()

    // Update refresh token in database
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      },
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}