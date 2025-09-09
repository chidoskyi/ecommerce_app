// app/api/admin/reviews/bulk/route.js
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAdmin, AuthenticatedRequest } from '@/lib/auth'


// app/api/admin/reviews/bulk/route.js - For bulk operations
export const POST = requireAdmin(
  async (
    request: AuthenticatedRequest
  ) => {

    try{

    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, reviewIds } = await request.json()

    if (!action || !reviewIds || !Array.isArray(reviewIds)) {
      return NextResponse.json(
        { error: 'Action and review IDs array are required' },
        { status: 400 }
      )
    }

    const currentTimestamp = new Date()
    let updateData = {}
    let message = ''

    switch (action) {
      case 'approve':
        updateData = { 
          status: 'APPROVED',
          updatedAt: currentTimestamp
        }
        message = `${reviewIds.length} reviews approved successfully`
        break
      case 'reject':
        updateData = { status: 'REJECTED', updatedAt: currentTimestamp }
        message = `${reviewIds.length} reviews rejected successfully`
        break
      case 'delete':
        await prisma.review.deleteMany({
          where: {
            id: { in: reviewIds }
          }
        })
        return NextResponse.json({
          message: `${reviewIds.length} reviews deleted successfully`
        })
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update reviews
    const result = await prisma.review.updateMany({
      where: {
        id: { in: reviewIds }
      },
      data: updateData
    })

    return NextResponse.json({
      updatedCount: result.count,
      message,
      timestamp: currentTimestamp.toISOString()
    })
  } catch (error) {
    console.error('Bulk review operation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})