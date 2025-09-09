// src/app/api/webhooks/opay/route.ts
import { NextResponse } from 'next/server'
import { sha512 } from 'js-sha512'
import prisma from '@/lib/prisma'
import { PaymentStatus, OrderStatus, CheckoutStatus, InvoiceStatus, PaymentMethod, Payment, User, Checkout, Invoice } from '@prisma/client'
import EmailService from '@/lib/emailService';
import { Order } from '@/types/orders';
import { AuthenticatedRequest, requireAuth } from '@/lib/auth';

const emailService = new EmailService()

// Documented OPay webhook payload structure
export interface OpayDocumentedPayload {
  payload: {
    amount: string
    channel: string
    country: string
    currency: string
    displayedFailure?: string
    fee: string
    feeCurrency: string
    instrumentType: string
    reference: string
    refunded: boolean
    status: 'SUCCESS' | 'FAILED' | 'PENDING'
    timestamp?: string | null
    token: string
    transactionId?: string | null
    failureReason?: string | null
    updated_at: string
  }
  sha512: string
  type: string
}

// Simplified payload structure actually received
export interface OpaySimplePayload {
  reference: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  signature?: string
}

type OpayWebhookPayload = OpayDocumentedPayload | OpaySimplePayload

function verifyOpaySignature(payload: object, signature: string, privateKey: string): boolean {
  try {
    const payloadString = JSON.stringify(payload)
    const expectedSignature = sha512.hmac(privateKey, payloadString)
    return expectedSignature === signature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

export const POST = requireAuth(
  async (
    request: AuthenticatedRequest
  ) => {
  try {
    const rawBody = await request.text()
    console.log('Raw webhook body:', rawBody)

    let webhookData: OpayWebhookPayload
    try {
      webhookData = JSON.parse(rawBody)
    } catch (error) {
      console.error('Failed to parse webhook body:', error)
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    console.log('Parsed webhook data:', webhookData)

    const privateKey = process.env.OPAY_PRIVATE_KEY
    if (!privateKey) {
      console.error('OPAY_PRIVATE_KEY not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Process both payload formats
    let reference: string
    let status: 'SUCCESS' | 'FAILED' | 'PENDING'
    let transactionId: string
    let amount: number
    let currency: string
    let signature: string
    let payloadToVerify: object
    let failureReason: string | undefined

    if ('payload' in webhookData && 'sha512' in webhookData) {
      // Documented format
      reference = webhookData.payload.reference
      status = webhookData.payload.status as 'SUCCESS' | 'FAILED' | 'PENDING'
      transactionId = webhookData.payload.transactionId || ''
      amount = parseInt(webhookData.payload.amount) / 100
      currency = webhookData.payload.currency
      signature = webhookData.sha512
      payloadToVerify = webhookData.payload
      failureReason = webhookData.payload.displayedFailure
    } else {
      // Simple format
      reference = webhookData.reference
      status = webhookData.status
      transactionId = webhookData.reference
      amount = 0
      currency = 'NGN'
      signature = webhookData.signature || request.headers.get('x-signature') || ''
      payloadToVerify = webhookData
    }

    // Verify signature if present
    if (signature && !verifyOpaySignature(payloadToVerify, signature, privateKey)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Find the order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { paymentId: reference },
          { transactionId: reference },
          { transactionId: transactionId }
        ]
      },
      include: {
        checkout: true,
        Invoice: true
      }
    })

    if (!order) {
      console.error('Order not found:', { reference, transactionId })
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Process based on status  
    switch (status) {
      case 'SUCCESS':
        await handleSuccessfulPayment(order, {
          reference,
          transactionId,
          amount,
          currency,
          timestamp: new Date().toISOString(),
          webhookData: payloadToVerify
        })
        break
        
      case 'FAILED':
        await handleFailedPayment(order, { 
          reference, 
          transactionId,
          amount,
          currency,
          failureReason,
          webhookData: payloadToVerify
        })
        break
        
      case 'PENDING':
        await handlePendingPayment(order, { 
          reference, 
          transactionId,
          amount,
          currency,
          webhookData: payloadToVerify
        })
        break
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('OPay webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// Handler functions
async function handleSuccessfulPayment(order: Order & { user: User, checkout: Checkout, Invoice: Invoice }, payload: OpayDocumentedPayload | OpaySimplePayload) {
  try {
    console.log('🟢 handleSuccessfulPayment called');
    console.log('📦 Order received:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      currentPaymentStatus: order.paymentStatus
    });
    console.log('📨 Payload received:', JSON.stringify(payload, null, 2));
    console.log('📨 Webhook data structure:', {
      hasPayload: 'payload' in payload,
      hasSha512: 'sha512' in payload,
      webhookDataKeys: Object.keys(payload)
    });

    // Get or create OPay payment provider
    console.log('🔍 Looking for OPay payment provider...');
    const opayProvider = await prisma.paymentProvider.findFirst({
      where: { name: 'OPay' }
    });

    if (opayProvider) {
      console.log('✅ Found existing OPay provider:', opayProvider.id);
    } else {
      console.log('🆕 Creating new OPay provider...');
      const newProvider = await prisma.paymentProvider.create({
        data: {
          name: 'OPay',
          displayName: 'OPay',
          method: PaymentMethod.OPAY,
          isActive: true,
          supportedCurrencies: ['NGN'],
          sandboxMode: process.env.NODE_ENV !== 'production'
        }
      });
      console.log('✅ Created new OPay provider:', newProvider.id);
    }

    console.log('🔄 Starting database transaction...');
    await prisma.$transaction(async (tx) => {
      // Update order - using correct status values from your schema
      console.log('📝 Updating order status...');
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.CONFIRMED,
          processedAt: new Date(payload.timestamp || ''),
          transactionId: payload.transactionId,
          updatedAt: new Date()
        }
      });

      // Send confirmation email to customer
      try {
        if (updatedOrder.user && updatedOrder.user.email) {
          console.log("Sending order confirmation email to:", updatedOrder.user.email);
          await emailService.sendOrderConfirmation(updatedOrder.user, updatedOrder);
          console.log("Order confirmation email sent successfully");
        } else {
          console.warn("No user email found for order:", order.id);
        }
      } catch (emailError) {
        console.error("Failed to send order confirmation email:", emailError);
        // Don't throw error here - payment was successful, email failure shouldn't break the flow
      }
      console.log('✅ Order updated:', {
        orderId: updatedOrder.id,
        newStatus: updatedOrder.status,
        newPaymentStatus: updatedOrder.paymentStatus
      });

      if (order.checkout) {
        console.log('📝 Updating checkout status...');
        const updatedCheckout = await tx.checkout.update({
          where: { id: order.checkout.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: CheckoutStatus.COMPLETED,
            updatedAt: new Date()
          }
        });
        console.log('✅ Checkout updated:', updatedCheckout.id);
      } else {
        console.log('ℹ️ No checkout associated with order');
      }

      if (order.Invoice) {
        console.log('📝 Updating invoice status...');
        const updatedInvoice = await tx.invoice.update({
          where: { id: order.Invoice.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: InvoiceStatus.PAID,
            paidAt: new Date(payload.timestamp),
            balanceAmount: 0,
            updatedAt: new Date()
          }
        });
        console.log('✅ Invoice updated:', updatedInvoice.id);
      } else {
        console.log('ℹ️ No invoice associated with order');
      }

      // Create payment record with all required fields
      console.log('💰 Creating payment record...');
      const paymentData: Payment = {
        orderId: order.id,
        providerId: opayProvider.id,
        method: PaymentMethod.OPAY,
        amount: payload.amount,
        currency: payload.currency,
        netAmount: payload.amount, // Assuming no processing fee deducted
        status: PaymentStatus.PAID,
        providerTransactionId: payload.transactionId,
        paymentReference: payload.reference,
        paidAt: new Date(payload.timestamp)
      }

      // Add optional fields only if they exist in the documented payload
      if ('payload' in payload.webhookData && 'sha512' in payload.webhookData) {
        console.log('📊 Processing detailed payload with fees...');
        const docPayload = payload.webhookData.payload;
        paymentData.processingFee = parseInt(docPayload.fee) / 100 || 0;
        console.log('💸 Processing fee:', paymentData.processingFee);
        
        // Recalculate netAmount if fee is present
        if (paymentData.processingFee > 0) {
          paymentData.netAmount = paymentData.amount - paymentData.processingFee;
          console.log('📉 Net amount after fee:', paymentData.netAmount);
        }
      } else {
        console.log('ℹ️ No detailed payload with fee information');
      }

      const createdPayment = await tx.payment.create({
        data: paymentData
      });
      console.log('✅ Payment record created:', createdPayment.id);
      console.log('💰 Payment details:', {
        amount: createdPayment.amount,
        reference: createdPayment.paymentReference,
        status: createdPayment.status
      });
    });

    console.log('🎉 Transaction completed successfully');
    console.log(`✅ Payment successful for order ${order.id} (${order.orderNumber})`);
    
    // Log success for monitoring
    console.log('📋 SUCCESS SUMMARY:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: payload.amount,
      currency: payload.currency,
      reference: payload.reference,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in handleSuccessfulPayment:', error);
    console.error('🔍 Error details:', {
      message: error.message,
      stack: error.stack,
      orderId: order?.id,
      payload: payload
    });
    throw error;
  }
}

async function handleFailedPayment(order: Order, payload: OpayDocumentedPayload) {
  try {
    // Get or create OPay payment provider
    const opayProvider = await prisma.paymentProvider.findFirst({
      where: { name: 'OPay' }
    }) || await prisma.paymentProvider.create({
      data: {
        name: 'OPay',
        displayName: 'OPay',
        method: PaymentMethod.OPAY,
        isActive: true,
        supportedCurrencies: ['NGN'],
        sandboxMode: process.env.NODE_ENV !== 'production'
      }
    })

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          // Note: You might want to create a FAILED status for OrderStatus enum
          transactionId: payload.transactionId,
          updatedAt: new Date(),
          failureReason: payload.failureReason || 'Payment failed'
        }
      })

      if (order.checkout) {
        await tx.checkout.update({
          where: { id: order.checkout.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            // Note: You might want to create a FAILED status for CheckoutStatus enum
            updatedAt: new Date()
          }
        })
      }

      if (order.Invoice) {
        await tx.invoice.update({
          where: { id: order.Invoice.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            status: InvoiceStatus.OVERDUE,
            updatedAt: new Date()
          }
        })
      }

      const paymentData: Payment = {
        orderId: order.id,
        providerId: opayProvider.id,
        method: PaymentMethod.OPAY,
        amount: payload.amount,
        currency: payload.currency,
        netAmount: payload.amount,
        status: PaymentStatus.FAILED,
        providerTransactionId: payload.transactionId,
        paymentReference: payload.reference,
        failureReason: payload.failureReason,
        failedAt: new Date()
      }

      // Add optional fields only if they exist in the documented payload
      if ('payload' in payload && 'sha512' in payload && 'webhookData' in payload) {
        const docPayload = payload.webhookData.payload
        paymentData.processingFee = parseInt(docPayload.fee) / 100 || 0
      }

      await tx.payment.create({
        data: paymentData
      })
    })

    console.log(`Payment failed for order ${order.id}`)
  } catch (error) {
    console.error('Error handling failed payment:', error)
    throw error
  }
}

async function handlePendingPayment(order: Order, payload: OpayDocumentedPayload | OpaySimplePayload) {
  try {
    // Get or create OPay payment provider
    const opayProvider = await prisma.paymentProvider.findFirst({
      where: { name: 'OPay' }
    }) || await prisma.paymentProvider.create({
      data: {
        name: 'OPay',
        displayName: 'OPay',
        method: PaymentMethod.OPAY,
        isActive: true,
        supportedCurrencies: ['NGN'],
        sandboxMode: process.env.NODE_ENV !== 'production'
      }
    })

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.PENDING,
          transactionId: payload.transactionId,
          updatedAt: new Date()
        }
      })

      if (order.checkout) {
        await tx.checkout.update({
          where: { id: order.checkout.id },
          data: {
            paymentStatus: PaymentStatus.PENDING,
            // Assuming you have a PENDING status for CheckoutStatus
            updatedAt: new Date()
          }
        })
      }

      const paymentData: Payment = {
        orderId: order.id,
        providerId: opayProvider.id,
        method: PaymentMethod.OPAY,
        amount: payload.amount,
        currency: payload.currency,
        netAmount: payload.amount,
        status: PaymentStatus.PENDING,
        providerTransactionId: payload.transactionId,
        paymentReference: payload.reference
      }

      // Add optional fields only if they exist in the documented payload
      if ('payload' in payload && 'sha512' in payload && 'webhookData' in payload) {
        const docPayload = payload.webhookData.payload
        paymentData.processingFee = parseInt(docPayload.fee) / 100 || 0
        if (paymentData.processingFee > 0) {
          paymentData.netAmount = paymentData.amount - paymentData.processingFee
        }
      }

      await tx.payment.create({
        data: paymentData
      })
    })

    console.log(`Payment pending for order ${order.id}`)
  } catch (error) {
    console.error('Error handling pending payment:', error)
    throw error
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}




// // src/app/api/webhooks/opay/route.ts
// import { NextResponse } from 'next/server'
// import { sha512 } from 'js-sha512'
// import prisma from '@/lib/prisma'
//   import { PaymentStatus, OrderStatus, CheckoutStatus, InvoiceStatus, PaymentMethod, Payment, TransactionStatus, User, Checkout, Invoice } from '@prisma/client'
// import EmailService from '@/lib/emailService';
// import { Order } from '@/types/orders';
// import { AuthenticatedRequest, requireAuth } from '@/lib/auth';

// const emailService = new EmailService()

// // Documented OPay webhook payload structure
// export interface OpayDocumentedPayload {
//   payload: {
//     amount: string
//     channel: string
//     country: string
//     currency: string
//     displayedFailure?: string
//     fee: string
//     feeCurrency: string
//     instrumentType: string
//     reference: string
//     refunded: boolean
//     status: 'SUCCESS' | 'FAILED' | 'PENDING'
//     timestamp?: string | null
//     token: string
//     transactionId?: string | null
//     failureReason?: string | null
//     updated_at: string
//   }
//   sha512: string
//   type: string
// }

// // Simplified payload structure actually received
// export interface OpaySimplePayload {
//   reference: string
//   status: 'SUCCESS' | 'FAILED' | 'PENDING'
//   signature?: string
// }

// type OpayWebhookPayload = OpayDocumentedPayload | OpaySimplePayload

// function verifyOpaySignature(payload: object, signature: string, privateKey: string): boolean {
//   try {
//     const payloadString = JSON.stringify(payload)
//     const expectedSignature = sha512.hmac(privateKey, payloadString)
//     return expectedSignature === signature
//   } catch (error) {
//     console.error('Signature verification error:', error)
//     return false
//   }
// }

// export const POST = requireAuth(
//   async (
//     request: AuthenticatedRequest
//   ) => {
//   try {
//     const rawBody = await request.text()
//     console.log('Raw webhook body:', rawBody)

//     let webhookData: OpayWebhookPayload
//     try {
//       webhookData = JSON.parse(rawBody)
//     } catch (error) {
//       console.error('Failed to parse webhook body:', error)
//       return NextResponse.json(
//         { error: 'Invalid JSON payload' },
//         { status: 400 }
//       )
//     }

//     console.log('Parsed webhook data:', webhookData)

//     const privateKey = process.env.OPAY_PRIVATE_KEY
//     if (!privateKey) {
//       console.error('OPAY_PRIVATE_KEY not configured')
//       return NextResponse.json(
//         { error: 'Server configuration error' },
//         { status: 500 }
//       )
//     }

//     // Process both payload formats
//     let reference: string
//     let status: 'SUCCESS' | 'FAILED' | 'PENDING'
//     let transactionId: string
//     let amount: number
//     let currency: string
//     let signature: string
//     let payloadToVerify: object
//     let failureReason: string | undefined

//     if ('payload' in webhookData && 'sha512' in webhookData) {
//       // Documented format
//       reference = webhookData.payload.reference
//       status = webhookData.payload.status as 'SUCCESS' | 'FAILED' | 'PENDING'
//       transactionId = webhookData.payload.transactionId || ''
//       amount = parseInt(webhookData.payload.amount) / 100
//       currency = webhookData.payload.currency
//       signature = webhookData.sha512
//       payloadToVerify = webhookData.payload
//       failureReason = webhookData.payload.displayedFailure
//     } else {
//       // Simple format
//       reference = webhookData.reference
//       status = webhookData.status
//       transactionId = webhookData.reference
//       amount = 0
//       currency = 'NGN'
//       signature = webhookData.signature || request.headers.get('x-signature') || ''
//       payloadToVerify = webhookData
//     }

//     // Verify signature if present
//     if (signature && !verifyOpaySignature(payloadToVerify, signature, privateKey)) {
//       console.error('Invalid webhook signature')
//       return NextResponse.json(
//         { error: 'Invalid signature' },
//         { status: 401 }
//       )
//     }

//     // Find the order
//     const order = await prisma.order.findFirst({
//       where: {
//         OR: [
//           { paymentId: reference },
//           { transactionId: reference },
//           { transactionId: transactionId }
//         ]
//       },
//       include: {
//         checkout: true,
//         Invoice: true
//       }
//     })

//     if (!order) {
//       console.error('Order not found:', { reference, transactionId })
//       return NextResponse.json(
//         { error: 'Order not found' },
//         { status: 404 }
//       )
//     }

//     // Process based on status  
//     switch (status) {
//       case 'SUCCESS':
//         await handleSuccessfulPayment(order, {
//           reference,
//           transactionId,
//           amount,
//           currency,
//           timestamp: new Date().toISOString(),
//           webhookData: payloadToVerify
//         })
//         break
        
//       case 'FAILED':
//         await handleFailedPayment(order, { 
//           reference, 
//           transactionId,
//           amount,
//           currency,
//           failureReason,
//           webhookData: payloadToVerify
//         })
//         break
        
//       case 'PENDING':
//         await handlePendingPayment(order, { 
//           reference, 
//           transactionId,
//           amount,
//           currency,
//           webhookData: payloadToVerify
//         })
//         break
//     }

//     return NextResponse.json({ success: true }, { status: 200 })

//   } catch (error) {
//     console.error('OPay webhook error:', error)
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     )
//   }
// })

// // Handler functions
// async function handleSuccessfulPayment(order: Order & { user: User, checkout: Checkout, Invoice: Invoice }, payload: OpayDocumentedPayload | OpaySimplePayload) {
//   try {
//     console.log('🟢 handleSuccessfulPayment called');
//     console.log('📦 Order received:', {
//       orderId: order.id,
//       orderNumber: order.orderNumber,
//       currentStatus: order.status,
//       currentPaymentStatus: order.paymentStatus
//     });
//     console.log('📨 Payload received:', JSON.stringify(payload, null, 2));
//     console.log('📨 Webhook data structure:', {
//       hasPayload: 'payload' in payload,
//       hasSha512: 'sha512' in payload,
//       webhookDataKeys: Object.keys(payload)
//     });

//     // Get or create OPay payment provider
//     console.log('🔍 Looking for OPay payment provider...');
//     const opayProvider = await prisma.paymentProvider.findFirst({
//       where: { name: 'OPay' }
//     });

//     if (opayProvider) {
//       console.log('✅ Found existing OPay provider:', opayProvider.id);
//     } else {
//       console.log('🆕 Creating new OPay provider...');
//       const newProvider = await prisma.paymentProvider.create({
//         data: {
//           name: 'OPay',
//           displayName: 'OPay',
//           method: PaymentMethod.OPAY,
//           isActive: true,
//           supportedCurrencies: ['NGN'],
//           sandboxMode: process.env.NODE_ENV !== 'production'
//         }
//       });
//       console.log('✅ Created new OPay provider:', newProvider.id);
//     }

//     console.log('🔄 Starting database transaction...');
//     await prisma.$transaction(async (tx) => {
//       // Update order - using correct status values from your schema
//       console.log('📝 Updating order status...');
//       const updatedOrder = await tx.order.update({
//         where: { id: order.id },
//         data: {
//           paymentStatus: PaymentStatus.PAID,
//           status: OrderStatus.CONFIRMED,
//           processedAt: new Date(payload.timestamp || ''),
//           transactionId: payload.transactionId,
//           updatedAt: new Date()
//         }
//       });


//     // Send confirmation email to customer
//     try {
//       if (updatedOrder.user && updatedOrder.user.email) {
//         console.log("Sending order confirmation email to:", updatedOrder.user.email);
//         await emailService.sendOrderConfirmation(updatedOrder.user, updatedOrder);
//         console.log("Order confirmation email sent successfully");
//       } else {
//         console.warn("No user email found for order:", order.id);
//       }
//     } catch (emailError) {
//       console.error("Failed to send order confirmation email:", emailError);
//       // Don't throw error here - payment was successful, email failure shouldn't break the flow
//     }
//       console.log('✅ Order updated:', {
//         orderId: updatedOrder.id,
//         newStatus: updatedOrder.status,
//         newPaymentStatus: updatedOrder.paymentStatus
//       });

//       if (order.checkout) {
//         console.log('📝 Updating checkout status...');
//         const updatedCheckout = await tx.checkout.update({
//           where: { id: order.checkout.id },
//           data: {
//             paymentStatus: PaymentStatus.PAID,
//             status: CheckoutStatus.COMPLETED,
//             updatedAt: new Date()
//           }
//         });
//         console.log('✅ Checkout updated:', updatedCheckout.id);
//       } else {
//         console.log('ℹ️ No checkout associated with order');
//       }

//       if (order.Invoice) {
//         console.log('📝 Updating invoice status...');
//         const updatedInvoice = await tx.invoice.update({
//           where: { id: order.Invoice.id },
//           data: {
//             paymentStatus: PaymentStatus.PAID,
//             status: InvoiceStatus.PAID,
//             paidAt: new Date(payload.timestamp),
//             balanceAmount: 0,
//             updatedAt: new Date()
//           }
//         });
//         console.log('✅ Invoice updated:', updatedInvoice.id);
//       } else {
//         console.log('ℹ️ No invoice associated with order');
//       }

//       // Create payment record with all required fields
//       console.log('💰 Creating payment record...');
//       const paymentData: Payment = {
//         orderId: order.id,
//         providerId: opayProvider.id,
//         method: PaymentMethod.OPAY,
//         amount: payload.amount,
//         currency: payload.currency,
//         netAmount: payload.amount, // Assuming no processing fee deducted
//         status: PaymentStatus.PAID,
//         providerTransactionId: payload.transactionId,
//         paymentReference: payload.reference,
//         paidAt: new Date(payload.timestamp)
//       }

//       // Add optional fields only if they exist in the documented payload
//       if ('payload' in payload.webhookData && 'sha512' in payload.webhookData) {
//         console.log('📊 Processing detailed payload with fees...');
//         const docPayload = payload.webhookData.payload;
//         paymentData.processingFee = parseInt(docPayload.fee) / 100 || 0;
//         console.log('💸 Processing fee:', paymentData.processingFee);
        
//         // Recalculate netAmount if fee is present
//         if (paymentData.processingFee > 0) {
//           paymentData.netAmount = paymentData.amount - paymentData.processingFee;
//           console.log('📉 Net amount after fee:', paymentData.netAmount);
//         }
//       } else {
//         console.log('ℹ️ No detailed payload with fee information');
//       }

//       const createdPayment = await tx.payment.create({
//         data: paymentData
//       });
//       console.log('✅ Payment record created:', createdPayment.id);
//       console.log('💰 Payment details:', {
//         amount: createdPayment.amount,
//         reference: createdPayment.paymentReference,
//         status: createdPayment.status
//       });
//     });

//     console.log('🎉 Transaction completed successfully');
//     console.log(`✅ Payment successful for order ${order.id} (${order.orderNumber})`);
    
//     // Log success for monitoring
//     console.log('📋 SUCCESS SUMMARY:', {
//       orderId: order.id,
//       orderNumber: order.orderNumber,
//       amount: payload.amount,
//       currency: payload.currency,
//       reference: payload.reference,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('❌ Error in handleSuccessfulPayment:', error);
//     console.error('🔍 Error details:', {
//       message: error.message,
//       stack: error.stack,
//       orderId: order?.id,
//       payload: payload
//     });
//     throw error;
//   }
// }

// async function handleFailedPayment(order: Order, payload: OpayDocumentedPayload) {
//   try {
//     // Get or create OPay payment provider
//     const opayProvider = await prisma.paymentProvider.findFirst({
//       where: { name: 'OPay' }
//     }) || await prisma.paymentProvider.create({
//       data: {
//         name: 'OPay',
//         displayName: 'OPay',
//         method: PaymentMethod.OPAY,
//         isActive: true,
//         supportedCurrencies: ['NGN'],
//         sandboxMode: process.env.NODE_ENV !== 'production'
//       }
//     })

//     await prisma.$transaction(async (tx) => {
//       await tx.order.update({
//         where: { id: order.id },
//         data: {
//           paymentStatus: PaymentStatus.FAILED,
//           // Note: You might want to create a FAILED status for OrderStatus enum
//           transactionId: payload.transactionId,
//           updatedAt: new Date(),
//           failureReason: payload.failureReason || 'Payment failed'
//         }
//       })

//       if (order.checkout) {
//         await tx.checkout.update({
//           where: { id: order.checkout.id },
//           data: {
//             paymentStatus: PaymentStatus.FAILED,
//             // Note: You might want to create a FAILED status for CheckoutStatus enum
//             updatedAt: new Date()
//           }
//         })
//       }

//       if (order.Invoice) {
//         await tx.invoice.update({
//           where: { id: order.Invoice.id },
//           data: {
//             paymentStatus: PaymentStatus.FAILED,
//             status: InvoiceStatus.OVERDUE,
//             updatedAt: new Date()
//           }
//         })
//       }

//       const paymentData: Payment = {
//         orderId: order.id,
//         providerId: opayProvider.id,
//         method: PaymentMethod.OPAY,
//         amount: payload.amount,
//         currency: payload.currency,
//         netAmount: payload.amount,
//         status: PaymentStatus.FAILED,
//         providerTransactionId: payload.transactionId,
//         paymentReference: payload.reference,
//         failureReason: payload.failureReason,
//         failedAt: new Date()
//       }

//       // Add optional fields only if they exist in the documented payload
//       if ('payload' in payload && 'sha512' in payload && 'webhookData' in payload) {
//         const docPayload = payload.webhookData.payload
//         paymentData.processingFee = parseInt(docPayload.fee) / 100 || 0
//       }

//       await tx.payment.create({
//         data: paymentData
//       })
//     })

//     console.log(`Payment failed for order ${order.id}`)
//   } catch (error) {
//     console.error('Error handling failed payment:', error)
//     throw error
//   }
// }

// async function handlePendingPayment(order: Order, payload: OpayDocumentedPayload | OpaySimplePayload) {
//   try {
//     // Get or create OPay payment provider
//     const opayProvider = await prisma.paymentProvider.findFirst({
//       where: { name: 'OPay' }
//     }) || await prisma.paymentProvider.create({
//       data: {
//         name: 'OPay',
//         displayName: 'OPay',
//         method: PaymentMethod.OPAY,
//         isActive: true,
//         supportedCurrencies: ['NGN'],
//         sandboxMode: process.env.NODE_ENV !== 'production'
//       }
//     })

//     await prisma.$transaction(async (tx) => {
//       await tx.order.update({
//         where: { id: order.id },
//         data: {
//           paymentStatus: PaymentStatus.PENDING,
//           status: OrderStatus.PENDING,
//           transactionId: payload.transactionId,
//           updatedAt: new Date()
//         }
//       })

//       if (order.checkout) {
//         await tx.checkout.update({
//           where: { id: order.checkout.id },
//           data: {
//             paymentStatus: PaymentStatus.PENDING,
//             // Assuming you have a PENDING status for CheckoutStatus
//             updatedAt: new Date()
//           }
//         })
//       }

//       const paymentData: Payment = {
//         orderId: order.id,
//         providerId: opayProvider.id,
//         method: PaymentMethod.OPAY,
//         amount: payload.amount,
//         currency: payload.currency,
//         netAmount: payload.amount,
//         status: PaymentStatus.PENDING,
//         providerTransactionId: payload.transactionId,
//         paymentReference: payload.reference
//       }

//       // Add optional fields only if they exist in the documented payload
//       if ('payload' in payload && 'sha512' in payload && 'webhookData' in payload) {
//         const docPayload = payload.webhookData.payload
//         paymentData.processingFee = parseInt(docPayload.fee) / 100 || 0
//         if (paymentData.processingFee > 0) {
//           paymentData.netAmount = paymentData.amount - paymentData.processingFee
//         }
//       }

//       await tx.payment.create({
//         data: paymentData
//       })
//     })

//     console.log(`Payment pending for order ${order.id}`)
//   } catch (error) {
//     console.error('Error handling pending payment:', error)
//     throw error
//   }
// }

// // Helper function to update transaction status for Opay (use in webhook handler)
// export async function updateOpayTransactionStatus(reference: string, status: string, providerData?: string | null) {
//   try {
//     const transaction = await prisma.transaction.findFirst({
//       where: { reference }
//     });

//     if (!transaction) {
//       console.error('Opay transaction not found for reference:', reference);
//       return null;
//     }

//     const updatedTransaction = await prisma.transaction.update({
//       where: { id: transaction.id },
//       data: {
//         status: status.toUpperCase() as TransactionStatus,
//         processedAt: new Date(),
//         providerData: providerData ? JSON.stringify(providerData) : transaction.providerData
//       }
//     });

//     console.log('Opay transaction updated:', updatedTransaction.id, 'Status:', updatedTransaction.status);
//     return updatedTransaction;
//   } catch (error) {
//     console.error('Error updating Opay transaction status:', error);
//     throw error;
//   }
// }



// export async function GET() {
//   return NextResponse.json(
//     { error: 'Method not allowed' },
//     { status: 405 }
//   )
// }