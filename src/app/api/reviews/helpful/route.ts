// app/api/reviews/route.js
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, AuthenticatedRequest } from '@/lib/auth'


// app/api/reviews/helpful/route.js - For marking reviews as helpful
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated - properly handle the response
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Return the authentication error response directly
    }
    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reviewId, helpful } = await request.json()

    if (!reviewId || typeof helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Review ID and helpful status are required' },
        { status: 400 }
      )
    }

    // Find the review
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Only allow helpful votes on approved reviews
    if (review.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Cannot vote on unapproved reviews' }, { status: 400 })
    }

    // Update helpful count (simplified - in production you'd track individual votes)
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpfulCount: helpful ? review.helpfulCount + 1 : Math.max(0, review.helpfulCount - 1)
      }
    })

    return NextResponse.json({
      helpfulCount: updatedReview.helpfulCount,
      message: helpful ? 'Marked as helpful' : 'Removed helpful mark'
    })
  } catch (error) {
    console.error('Update helpful count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}