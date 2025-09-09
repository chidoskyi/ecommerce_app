import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { AuthenticatedRequest, requireAuth } from '@/lib/auth'
import { validateAndCalculate } from '@/lib/bankPaymentHandlers'
import { CheckoutItem } from '@/types/checkout'
import { BillingAddress, ShippingAddress } from '@prisma/client'

// GET - Retrieve user's orders
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('paymentStatus')

    const skip = (page - 1) * limit

    // Build where clause - use clerkId for direct filtering
    const where: Record<string, string | number | boolean | object | undefined> = { clerkId: user.clerkId }
    if (status) where.status = status
    if (paymentStatus) where.paymentStatus = paymentStatus

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true
            }
          },
          Invoice: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
})

// POST - Create a new order (alternative to checkout)
export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requestData = await request.json()
    const {
      paymentMethod,
      totalTax = 0,
      phone,
      notes,
      fromCart = false // Flag to indicate if items came from cart
    } = requestData

    // Use the validateAndCalculate function
    const validatedData = await validateAndCalculate(user, {
      ...requestData,
      // Map any different field names if needed
      discountAmount: requestData.totalDiscount || 0,
      shippingMethod: paymentMethod // or map appropriately
    })

    const {
      userData,
      validatedItems,
      totalWeight,
      deliveryFee,
      finalSubtotal,
      shippingAddress,
      billingAddress,
      discountAmount
    } = validatedData

    // Calculate final total including tax
    const finalTotalPrice = finalSubtotal + parseFloat(totalTax) + deliveryFee - discountAmount
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const order = await prisma.order.create({
      data: {
        userId: user.clerkId,
        orderNumber,
        email: userData.email,
        phone: phone || userData.phone || '',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        subtotalPrice: finalSubtotal,
        totalTax: parseFloat(totalTax),
        totalShipping: deliveryFee, // Use calculated delivery fee
        totalDiscount: discountAmount,
        totalPrice: finalTotalPrice,
        totalWeight, // Store total weight
        paymentMethod: paymentMethod || null,
        shippingAddress: shippingAddress as ShippingAddress,
        billingAddress: billingAddress as BillingAddress, // Include billing address
        notes: notes || null,
        items: {
          create: validatedItems.map((item: CheckoutItem) => ({
            productId: item.productId,
            title: item.title,
            sku: item.sku || null, // You might want to get this from product
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            // Include the pricing fields from cart
            fixedPrice: item.fixedPrice,
            unitPrice: item.unitPrice,
            selectedUnit: item.selectedUnit
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true
          }
        }
      }
    })

    // Clear cart after successful order if items came from cart
    if (fromCart) {
      await prisma.cartItem.deleteMany({
        where: { 
          OR: [
            { userId: user.id },
            { clerkId: user.clerkId }
          ]
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: order
    }, { status: 201 })

  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
})