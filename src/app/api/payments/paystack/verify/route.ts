// /api/payments/paystack/verify/route.ts - Paystack Verification Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { paystackService } from '@/lib/paystack';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth';

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    const { reference, orderId } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    console.log('Verifying Paystack payment:', reference);

    // Verify payment with Paystack
    const verification = await paystackService.verifyPayment(reference);
    
    if (!verification.status) {
      return NextResponse.json({
        success: false,
        verified: false,
        error: verification.message || 'Payment verification failed'
      }, { status: 400 });
    }

    const paymentData = verification.data;
    const isSuccessful = paymentData.status === 'success';

    // Find the order by payment reference
    let order = await prisma.order.findFirst({
      where: {
        OR: [
          { paymentId: reference },
          { transactionId: reference },
          ...(orderId ? [{ id: orderId }] : [])
        ]
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });

    if (!order) {
      return NextResponse.json({
        success: false,
        verified: false,
        error: 'Order not found for this payment reference'
      }, { status: 404 });
    }

    // Ensure user owns the order
    if (order.clerkId !== user.clerkId) {
      return NextResponse.json({
        success: false,
        verified: false,
        error: 'Unauthorized access to order'
      }, { status: 403 });
    }

    if (isSuccessful) {
      // Update order status to confirmed if payment is successful
      if (order.paymentStatus !== 'PAID') {
        order = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            processedAt: new Date()
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            user: true
          }
        });

        // Update checkout status
        await prisma.checkout.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'COMPLETED',
            paymentStatus: 'PAID'
          }
        });

        // Update invoice status
        await prisma.invoice.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'PAID',
            paymentStatus: 'PAID',
            paidAt: new Date(),
            balanceAmount: 0
          }
        });

      }
    } else {
      // Payment failed, update order status
      if (order.paymentStatus !== 'FAILED') {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'FAILED',
            paymentStatus: 'FAILED'
          }
        });

        await prisma.checkout.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'FAILED',
            paymentStatus: 'FAILED'
          }
        });

        await prisma.invoice.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'FAILED'
          }
        });
      }
    }

    // Format order data for response
    const formattedOrder = {
      orderNumber: order.orderNumber,
      transactionId: order.transactionId || reference,
      amount: `₦${order.totalPrice.toLocaleString()}`,
      paymentMethod: 'paystack',
      customerEmail: order.email,
      estimatedDelivery: '3-5 business days',
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      items: order.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        totalPrice: item.totalPrice 
      })),
      shippingAddress: order.shippingAddress
    };

    return NextResponse.json({
      success: true,
      verified: isSuccessful,
      order: formattedOrder,
      paymentData: {
        reference: paymentData.reference,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: paymentData.status,
        paidAt: paymentData.paid_at,
        channel: paymentData.channel,
        gatewayResponse: paymentData.gateway_response
      },
      message: isSuccessful ? 'Payment verified successfully' : 'Payment verification failed'
    });

  } catch (error) {
    console.error('Paystack verification error:', error);
    
    const errorMessage = 
      error instanceof Error ? error.message :
      typeof error === 'string' ? error :
      error && typeof error === 'object' && 'message' in error ? String(error.message) :
      'Unknown error';
    
    return NextResponse.json({
      success: false,
      verified: false,
      error: 'Payment verification failed: ' + errorMessage
    }, { status: 500 });
  }
});