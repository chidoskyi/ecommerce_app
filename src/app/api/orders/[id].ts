import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin } from '@/lib/middleware'
import type { ApiResponse, Order } from '@/types'

export default requireAuth(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<Order>>
) {
  const userId = req.user.id
  const { id } = req.query

  try {
    if (req.method === 'GET') {
      const order = await prisma.order.findFirst({
        where: {
          id,
          ...(req.user.role !== 'ADMIN' && { userId }) // Admin can view any order
        },
        include: {
          items: {
            include: {
              product: true,
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        })
      }

      res.json({
        success: true,
        data: order
      })
    } else if (req.method === 'PUT') {
      // Only admin can update orders
      return requireAdmin(async (req, res) => {
        const { status, paymentStatus, fulfillmentStatus, trackingNumber, notes } = req.body

        const updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            ...(status && { status }),
            ...(paymentStatus && { paymentStatus }),
            ...(fulfillmentStatus && { fulfillmentStatus }),
            ...(trackingNumber && { trackingNumber }),
            ...(notes && { notes }),
            ...(status === 'PROCESSING' && { processedAt: new Date() }),
            ...(status === 'SHIPPED' && { shippedAt: new Date() }),
            ...(status === 'DELIVERED' && { deliveredAt: new Date() })
          },
          include: {
            items: {
              include: {
                product: true,
              }
            }
          }
        })

        res.json({
          success: true,
          data: updatedOrder,
          message: 'Order updated successfully'
        })
      })(req, res)
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Order API error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})