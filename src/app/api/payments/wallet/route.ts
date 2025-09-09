// /api/payments/verify/[reference]/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { AuthenticatedRequest, requireAuthDynamic, RouteContext } from '@/lib/auth'
import { opayService } from '@/lib/opay'
import { OrderStatus } from '@prisma/client';

export const GET = requireAuthDynamic(
  async (
    request: AuthenticatedRequest,
    ctx: RouteContext
  ) => {
    try {
      const user = request.user;
      const params = await ctx.params; // Await the params promise first
      const { reference } = params; // Then destructure



    if (!reference) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Find order by payment reference
    const order = await prisma.order.findFirst({
      where: {
        paymentId: params.reference,
        userId: user.id
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    let paymentStatus = order.paymentStatus;

    // For Opay payments, verify with the provider
    if (order.paymentMethod === 'opay' && order.paymentStatus === 'PENDING') {
      try {
        const verificationResult = await opayService.verifyPayment(params.reference);
        
        if (verificationResult.data.status === 'SUCCESS') {
          // Update order payment status
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              status: OrderStatus.COMFIRMED
            }
          });

          // Update related checkout
          if (order.checkout) {
            await prisma.checkout.update({
              where: { id: order.checkout.id },
              data: {
                paymentStatus: 'PAID',
                status: 'COMPLETED'
              }
            });
          }

          paymentStatus = 'PAID';
        }
      } catch (verifyError) {
        console.error('Payment verification error:', verifyError);
      }
    } else if (order.paymentMethod === 'paystack' && order.paymentStatus === 'PENDING') {
      // Add Paystack verification logic here
      // You'll need to implement paystackService.verifyPayment()
      // similar to the Opay implementation above
    }

    return NextResponse.json({
      success: true,
      order: {
        ...order,
        paymentStatus
      },
      paymentStatus
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});