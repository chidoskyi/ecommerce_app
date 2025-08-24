// src/app/api/payments/opay/verify-payment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { opayService } from '@/lib/opay'
import prisma from '@/lib/prisma'
import { requireAuth } from '@/lib/auth';

export async function POST (request: NextRequest) {
  try {
        // First check auth status
        const authCheck = await requireAuth(request);
        if (authCheck) {
          return authCheck; // Returns the error response if not admin
        }

    const body = await request.json()
    console.log('Request body received:', body)
    
    const { reference, orderNo, country } = body
    
    console.log('Extracted parameters:', { reference, orderNo, country })

    if (!reference && !orderNo) {
      return NextResponse.json(
        { error: 'Either payment reference or orderNo is required' },
        { status: 400 }
      )
    }

    console.log('Verifying payment for reference:', reference || orderNo)

    // Create the parameters object explicitly
    const verifyParams = {
      reference: reference || undefined,
      orderNo: orderNo || undefined,
      country: country || 'NG'
    }
    
    console.log('Sending to opayService.verifyPayment:', verifyParams)

    // Check with Opay
    const opayStatus = await opayService.verifyPayment(verifyParams)
    console.log('Opay verification response:', opayStatus)

    // Handle successful payment updates
    if (opayStatus.code === '00000' && opayStatus.data) {
      const paymentData = opayStatus.data
      
      // If payment is successful and order isn't already updated
      if (paymentData.status === 'SUCCESS' && order.paymentStatus !== 'PAID') {
        console.log('Payment successful - updating database records')
        
        try {
          await prisma.$transaction(async (tx) => {
            // Update order
            await tx.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'PAID',
                status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
                updatedAt: new Date()
              }
            })

            // Update checkout if exists
            if (order.checkout) {
              await tx.checkout.update({
                where: { id: order.checkout.id },
                data: {
                  paymentStatus: 'PAID',
                  status: 'COMFIRMED',
                  updatedAt: new Date()
                }
              })
            }

            // Update invoice if exists
            if (order.Invoice) {
              await tx.invoice.update({
                where: { id: order.Invoice.id },
                data: {
                  paymentStatus: 'PAID',
                  status: 'PAID',
                  balanceAmount: 0,
                  paidAt: new Date(),
                  updatedAt: new Date()
                }
              })
            }
          })
          
          console.log('Successfully updated database after payment confirmation')
        } catch (updateError) {
          console.error('Error updating order status:', updateError)
        }
      }
    }

    // Check our database
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          // Search by reference if provided
          ...(reference ? [
            { paymentId: reference },
            { transactionId: reference },
            { orderNumber: reference }
          ] : []),
          // Search by orderNo if provided
          ...(orderNo ? [
            { paymentId: orderNo },
            { transactionId: orderNo },
            { orderNumber: orderNo }
          ] : [])
        ]
      },
      include: {
        checkout: true,
        Invoice: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found with this payment reference' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      reference: reference || orderNo,
      payment: {
        status: opayStatus.data?.status || 'UNKNOWN',
        opayOrderNo: opayStatus.data?.orderNo,
        amount: {
          total: opayStatus.data?.amount?.total || 0,
          currency: opayStatus.data?.amount?.currency || 'NGN',
          displayAmount: (opayStatus.data?.amount?.total || 0) / 100
        },
        createdAt: opayStatus.data?.createTime ? new Date(opayStatus.data.createTime) : null,
        instrumentType: opayStatus.data?.instrumentType
      },
      opayStatus,
      databaseStatus: {
        order: {
          id: order.id,
          status: order.status,
          paymentStatus: order.paymentStatus
        },
        checkout: order.checkout ? {
          id: order.checkout.id,
          status: order.checkout.status,
          paymentStatus: order.checkout.paymentStatus
        } : null,
        invoice: order.Invoice ? {
          id: order.Invoice.id,
          status: order.Invoice.status,
          paymentStatus: order.Invoice.paymentStatus,
          balanceAmount: order.Invoice.balanceAmount
        } : null
      }
    })

  } catch (error: any) {
    console.error('Payment verification error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      reference: body?.reference || body?.orderNo || 'unknown'
    }, { status: 500 })
  }
}


// / /api/payments/opay/verify/route.ts - OPay Verification Endpoint
// import { NextRequest, NextResponse } from 'next/server';
// import prisma from '@/lib/prisma';
// import { opayService } from '@/lib/opay'; // Assuming you have an OPay service
// import { requireAuth } from '@/middleware/auth';

// export const POST = requireAuth(async (request: NextRequest) => {
//   try {
//     const user = (request as any).user;
//     const { reference, orderId } = await request.json();

//     if (!reference) {
//       return NextResponse.json(
//         { success: false, error: 'Payment reference is required' },
//         { status: 400 }
//       );
//     }

//     console.log('Verifying OPay payment:', reference);

//     // Verify payment with OPay
//     const verification = await opayService.verifyPayment(reference);
    
//     if (!verification.success) {
//       return NextResponse.json({
//         success: false,
//         verified: false,
//         error: verification.message || 'Payment verification failed'
//       }, { status: 400 });
//     }

//     const paymentData = verification.data;
//     const isSuccessful = paymentData.status === 'SUCCESS' || paymentData.status === 'success';

//     // Find the order by payment reference
//     let order = await prisma.order.findFirst({
//       where: {
//         OR: [
//           { paymentId: reference },
//           { transactionId: reference },
//           ...(orderId ? [{ id: orderId }] : [])
//         ]
//       },
//       include: {
//         items: {
//           include: {
//             product: true
//           }
//         },
//         user: true
//       }
//     });

//     if (!order) {
//       return NextResponse.json({
//         success: false,
//         verified: false,
//         error: 'Order not found for this payment reference'
//       }, { status: 404 });
//     }

//     // Ensure user owns the order
//     if (order.clerkId !== user.clerkId) {
//       return NextResponse.json({
//         success: false,
//         verified: false,
//         error: 'Unauthorized access to order'
//       }, { status: 403 });
//     }

//     if (isSuccessful) {
//       // Update order status to confirmed if payment is successful
//       if (order.paymentStatus !== 'PAID') {
//         order = await prisma.order.update({
//           where: { id: order.id },
//           data: {
//             status: 'CONFIRMED',
//             paymentStatus: 'PAID',
//             paidAt: new Date()
//           },
//           include: {
//             items: {
//               include: {
//                 product: true
//               }
//             },
//             user: true
//           }
//         });

//         // Update checkout status
//         await prisma.checkout.updateMany({
//           where: { orderId: order.id },
//           data: {
//             status: 'COMPLETED',
//             paymentStatus: 'PAID'
//           }
//         });

//         // Update invoice status
//         await prisma.invoice.updateMany({
//           where: { orderId: order.id },
//           data: {
//             status: 'PAID',
//             paymentStatus: 'PAID',
//             paidAt: new Date(),
//             balanceAmount: 0
//           }
//         });

//         // Update product stock
//         for (const item of order.items) {
//           if (item.product.trackStock && item.product.stock !== null) {
//             await prisma.product.update({
//               where: { id: item.productId },
//               data: {
//                 stock: {
//                   decrement: item.quantity
//                 }
//               }
//             });
//           }
//         }
//       }
//     } else {
//       // Payment failed, update order status
//       if (order.paymentStatus !== 'FAILED') {
//         await prisma.order.update({
//           where: { id: order.id },
//           data: {
//             status: 'FAILED',
//             paymentStatus: 'FAILED'
//           }
//         });

//         await prisma.checkout.updateMany({
//           where: { orderId: order.id },
//           data: {
//             status: 'FAILED',
//             paymentStatus: 'FAILED'
//           }
//         });

//         await prisma.checkout.updateMany({
//           where: { orderId: order.id },
//           data: {
//             status: 'FAILED',
//             paymentStatus: 'FAILED'
//           }
//         });

//         await prisma.invoice.updateMany({
//           where: { orderId: order.id },
//           data: {
//             status: 'CANCELLED',
//             paymentStatus: 'FAILED'
//           }
//         });
//       }
//     }

//     // Format order data for response
//     const formattedOrder = {
//       orderNumber: order.orderNumber,
//       transactionId: order.transactionId || reference,
//       amount: `₦${order.totalPrice.toLocaleString()}`,
//       paymentMethod: 'paystack',
//       customerEmail: order.email,
//       estimatedDelivery: '3-5 business days',
//       status: order.status.toLowerCase(),
//       paymentStatus: order.paymentStatus.toLowerCase(),
//       items: order.items.map(item => ({
//         title: item.title,
//         quantity: item.quantity,
//         totalPrice: item.totalPrice || (item.price * item.quantity)
//       })),
//       shippingAddress: order.shippingAddress
//     };

//     return NextResponse.json({
//       success: true,
//       verified: isSuccessful,
//       order: formattedOrder,
//       paymentData: {
//         reference: paymentData.reference,
//         amount: paymentData.amount,
//         currency: paymentData.currency,
//         status: paymentData.status,
//         paidAt: paymentData.paid_at,
//         channel: paymentData.channel,
//         gatewayResponse: paymentData.gateway_response
//       },
//       message: isSuccessful ? 'Payment verified successfully' : 'Payment verification failed'
//     });

//   } catch (error) {
//     console.error('Paystack verification error:', error);
//     return NextResponse.json({
//       success: false,
//       verified: false,
//       error: 'Payment verification failed: ' + (error.message || 'Unknown error')
//     }, { status: 500 });
//   }
// });