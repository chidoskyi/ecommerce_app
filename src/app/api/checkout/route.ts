import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { validateAndCalculate, handleBankTransferPayment } from '@/lib/bankPaymentHandlers'
import { handleOpayPayment  } from '@/lib/opayPaymentHandlers'
import { handlePaystackPayment } from '@/lib/handlePaystackPayment'
import { handleWalletPayment } from '@/lib/walletPaymentHandler'





// /api/checkout/route.ts (GET method)
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const whereClause: any = {
      userId: user.id
    };

    if (status) {
      whereClause.status = status;
    }

    // Fetch checkouts with pagination
    const [checkouts, total] = await Promise.all([
      prisma.checkout.findMany({
        where: whereClause,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  fixedPrice: true,
                  weight: true,
                  images: true
                }
              }
            }
          },
          coupon: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.checkout.count({
        where: whereClause
      })
    ]);

    return NextResponse.json({
      success: true,
      checkouts,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Fetch checkouts error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});


// Updated POST handler in /api/checkout/route.ts
export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    const { paymentMethod } = requestData;

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
    }

    // Validate and calculate common data
    const calculatedData = await validateAndCalculate(user, requestData);

    let result;

    // Handle different payment methods
    switch (paymentMethod) {
      case 'opay':
        result = await handleOpayPayment(user, calculatedData);
        break;
      case 'paystack':
        result = await handlePaystackPayment(user, calculatedData);
        break;
      case 'wallet':
        result = await handleWalletPayment(user, calculatedData);
        break;
      case 'bank_transfer':
        result = await handleBankTransferPayment(user, calculatedData);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid payment method. Supported methods: opay, paystack, wallet, bank_transfer' },
          { status: 400 }
        );
    }

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});

// PUT method to update checkout status
export const PUT = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { checkoutId, status, paymentStatus, orderId } = await request.json()

    if (!checkoutId) {
      return NextResponse.json({ error: 'Checkout ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (paymentStatus) updateData.paymentStatus = paymentStatus
    if (orderId) updateData.orderId = orderId
    if (status === 'COMPLETED') updateData.completedAt = new Date()
    if (status === 'ABANDONED') updateData.abandonedAt = new Date()

    const checkout = await prisma.checkout.update({
      where: { 
        id: checkoutId, 
        userId: user.id 
      },
      data: updateData,
      include: {
        items: {
          include: {
            product: true
          }
        },
        coupon: true,
        order: true
      }
    })

    return NextResponse.json(checkout)

  } catch (error) {
    console.error('Update checkout error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
})



