// src/app/api/webhooks/opay/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { sha512 } from 'js-sha512'
import prisma from '@/lib/prisma'
import { PaymentStatus, OrderStatus, CheckoutStatus, InvoiceStatus, PaymentMethod } from '@prisma/client'

// Define types based on your Prisma schema
type TransactionStatus = 
  | 'PENDING'
  | 'PROCESSING' 
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'DISPUTED'

type OrderStatus = 
  | 'PENDING'
  | 'COMFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

// Documented OPay webhook payload structure
interface OpayDocumentedPayload {
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
    timestamp: string
    token: string
    transactionId: string
    updated_at: string
  }
  sha512: string
  type: string
}

// Simplified payload structure actually received
interface OpaySimplePayload {
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

export async function POST(request: NextRequest) {
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
      status = webhookData.payload.status
      transactionId = webhookData.payload.transactionId
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
          webhookData
        })
        break
        
      case 'FAILED':
        await handleFailedPayment(order, { 
          reference, 
          transactionId,
          amount,
          currency,
          failureReason,
          webhookData
        })
        break
        
      case 'PENDING':
        await handlePendingPayment(order, { 
          reference, 
          transactionId,
          amount,
          currency,
          webhookData
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
}

// Handler functions
async function handleSuccessfulPayment(order: any, payload: any) {
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
      // Update order - using correct status values from your schema
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.COMFIRMED,
          processedAt: new Date(payload.timestamp),
          transactionId: payload.transactionId,
          updatedAt: new Date()
        }
      })

      if (order.checkout) {
        await tx.checkout.update({
          where: { id: order.checkout.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: CheckoutStatus.COMPLETED,
            updatedAt: new Date()
          }
        })
      }

      if (order.Invoice) {
        await tx.invoice.update({
          where: { id: order.Invoice.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: InvoiceStatus.PAID,
            paidAt: new Date(payload.timestamp),
            balanceAmount: 0,
            updatedAt: new Date()
          }
        })
      }

      // Create payment record with all required fields
      const paymentData: any = {
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
        const docPayload = payload.webhookData.payload
        paymentData.processingFee = parseInt(docPayload.fee) / 100 || 0
        // Recalculate netAmount if fee is present
        if (paymentData.processingFee > 0) {
          paymentData.netAmount = paymentData.amount - paymentData.processingFee
        }
      }

      await tx.payment.create({
        data: paymentData
      })
    })

    console.log(`Payment successful for order ${order.id}`)
  } catch (error) {
    console.error('Error handling successful payment:', error)
    throw error
  }
}

async function handleFailedPayment(order: any, payload: any) {
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

      const paymentData: any = {
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
      if ('payload' in payload.webhookData && 'sha512' in payload.webhookData) {
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

async function handlePendingPayment(order: any, payload: any) {
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

      const paymentData: any = {
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
      if ('payload' in payload.webhookData && 'sha512' in payload.webhookData) {
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

// Helper function to update transaction status for Opay (use in webhook handler)
export async function updateOpayTransactionStatus(reference: string, status: string, providerData?: any) {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { reference }
    });

    if (!transaction) {
      console.error('Opay transaction not found for reference:', reference);
      return null;
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: status.toUpperCase(),
        processedAt: new Date(),
        providerData: providerData ? JSON.stringify(providerData) : transaction.providerData
      }
    });

    console.log('Opay transaction updated:', updatedTransaction.id, 'Status:', updatedTransaction.status);
    return updatedTransaction;
  } catch (error) {
    console.error('Error updating Opay transaction status:', error);
    throw error;
  }
}



export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}


// // src/app/api/payments/opay/callback/route.ts
// import { NextRequest, NextResponse } from 'next/server'
// import prisma from '@/lib/prisma'
// import { createHmac } from 'crypto'

// // OPay webhook payload interface (actual format received)
// interface OpayWebhookPayload {
//   reference: string
//   status: 'SUCCESS' | 'FAILED' | 'PENDING'
//   orderNo?: string
//   amount?: {
//     total: number
//     currency: string
//   }
//   vat?: {
//     total: number
//     currency: string
//   }
//   createTime?: number
//   failureCode?: string
//   failureReason?: string
//   country?: string
// }

// // Alternative payload format (from documentation)
// interface OpayWebhookPayloadDoc {
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
//     timestamp: string
//     token: string
//     transactionId: string
//     updated_at: string
//   }
//   sha512: string
//   type: string
// }

// // Allowed OPay IP addresses (update these based on OPay's current IPs)
// const ALLOWED_IPS = [
//   // Add OPay's webhook IP addresses here
//   '127.0.0.1', // localhost for testing
// ]

// // Verify webhook signature using HMAC SHA-512
// function verifyWebhookSignature(payload: any, signature: string): boolean {
//   try {
//     const privateKey = process.env.OPAY_PRIVATE_KEY
//     if (!privateKey) {
//       console.error('OPAY_PRIVATE_KEY not configured')
//       return false
//     }

//     // Handle null/undefined payload
//     if (!payload || typeof payload !== 'object') {
//       console.error('Invalid payload for signature verification')
//       return false
//     }

//     // For OPay, the signature is calculated on the payload object only (not the full webhook body)
//     // Create canonical JSON string (sorted keys, no spaces)
//     const sortedKeys = Object.keys(payload).sort()
//     const jsonString = JSON.stringify(payload, sortedKeys)
    
//     console.log('Payload for signature:', jsonString)
    
//     // Create HMAC SHA-512 signature
//     const hmac = createHmac('sha512', privateKey)
//     hmac.update(jsonString)
//     const expectedSignature = hmac.digest('hex')
    
//     console.log('Expected signature:', expectedSignature)
//     console.log('Received signature:', signature)
    
//     return signature === expectedSignature
//   } catch (error) {
//     console.error('Signature verification error:', error)
//     return false
//   }
// }

// // Verify IP address
// function verifyIPAddress(request: NextRequest): boolean {
//   const forwarded = request.headers.get('x-forwarded-for')
//   const realIP = request.headers.get('x-real-ip')
//   const remoteAddr = request.ip
  
//   const clientIP = forwarded?.split(',')[0] || realIP || remoteAddr || 'unknown'
  
//   console.log('Client IP:', clientIP)
  
//   // Skip IP verification in development
//   if (process.env.NODE_ENV === 'development') {
//     return true
//   }
  
//   return ALLOWED_IPS.includes(clientIP)
// }

// // Rate limiting store (in production, use Redis or similar)
// const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// function checkRateLimit(ip: string): boolean {
//   const now = Date.now()
//   const windowMs = 60 * 1000 // 1 minute
//   const maxRequests = 100
  
//   const key = `webhook_${ip}`
//   const current = rateLimitStore.get(key)
  
//   if (!current || now > current.resetTime) {
//     rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
//     return true
//   }
  
//   if (current.count >= maxRequests) {
//     return false
//   }
  
//   current.count++
//   return true
// }

// export async function POST(request: NextRequest) {
//   const startTime = Date.now()
//   let orderId: string | null = null
  
//   try {
//     console.log('=== OPay Webhook Received ===')
//     console.log('Timestamp:', new Date().toISOString())
    
//     // Verify IP address
//     if (!verifyIPAddress(request)) {
//       console.error('Webhook from unauthorized IP')
//       return NextResponse.json(
//         { error: 'Unauthorized' },
//         { status: 403 }
//       )
//     }

//     // Check rate limiting
//     const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
//                     request.headers.get('x-real-ip') || 
//                     request.ip || 'unknown'
                    
//     if (!checkRateLimit(clientIP)) {
//       console.error('Rate limit exceeded for IP:', clientIP)
//       return NextResponse.json(
//         { error: 'Rate limit exceeded' },
//         { status: 429 }
//       )
//     }

//     // Get the signature from headers (check multiple possible header names)
//     const signature = request.headers.get('authorization')?.replace('Bearer ', '') || 
//                      request.headers.get('signature') || 
//                      request.headers.get('x-signature') ||
//                      request.headers.get('opay-signature') || ''
    
//     console.log('Webhook signature from headers:', signature)
//     console.log('All headers:', Object.fromEntries(request.headers.entries()))

//     // Parse the webhook payload
//     const webhookData: OpayWebhookPayload | OpayWebhookPayloadDoc = await request.json()
//     console.log('Webhook payload:', JSON.stringify(webhookData, null, 2))

//     // Determine payload format and extract data
//     let actualPayload: any
//     let providedSignature: string
//     let reference: string
//     let status: string
//     let transactionId: string
//     let amount: number = 0
//     let currency: string = 'NGN'

//     if ('payload' in webhookData && 'sha512' in webhookData) {
//       // Documentation format - nested payload with sha512 signature
//       console.log('Using documented webhook format (nested payload)')
//       actualPayload = webhookData.payload
//       providedSignature = webhookData.sha512
//       reference = actualPayload.reference
//       status = actualPayload.status
//       transactionId = actualPayload.transactionId
//       amount = parseFloat(actualPayload.amount) / 100 // Convert from kobo
//       currency = actualPayload.currency
//     } else {
//       // Simple format (what you're currently receiving)
//       console.log('Using simple webhook format')
//       actualPayload = webhookData as OpayWebhookPayload
//       providedSignature = signature // From headers
//       reference = actualPayload.reference
//       status = actualPayload.status
//       transactionId = actualPayload.orderNo || actualPayload.reference
//       amount = actualPayload.amount ? actualPayload.amount.total / 100 : 0
//       currency = actualPayload.amount?.currency || 'NGN'
//     }

//     console.log('Extracted data:', { reference, status, transactionId, amount, currency })

//     // Skip signature verification if no signature is provided (simple format case)
//     if (!providedSignature && process.env.NODE_ENV === 'development') {
//       console.warn('No signature provided, skipping verification in development mode')
//     } else if (providedSignature) {
//       // Verify the webhook signature for security
//       if (!verifyWebhookSignature(actualPayload, providedSignature)) {
//         console.error('Invalid webhook signature')
        
//         // In development, you might want to skip signature verification
//         if (process.env.NODE_ENV === 'development') {
//           console.warn('Signature verification failed, but continuing in development mode')
//         } else {
//           return NextResponse.json(
//             { error: 'Invalid signature' },
//             { status: 401 }
//           )
//         }
//       } else {
//         console.log('Webhook signature verified successfully')
//       }
//     }

//     // Find the order in our database
//     const order = await prisma.order.findFirst({
//       where: {
//         OR: [
//           { paymentId: reference },
//           { transactionId: reference },
//           { paymentId: transactionId },
//           { transactionId: transactionId }
//         ]
//       },
//       include: {
//         checkout: true,
//         Invoice: true
//       }
//     })

//     if (!order) {
//       console.error('Order not found for webhook:', { reference, transactionId })
      
//       // Log for investigation but still return 200
//       await logWebhookEvent({
//         type: 'order_not_found',
//         reference,
//         transactionId,
//         payload: webhookData,
//         processingTime: Date.now() - startTime
//       })
      
//       return NextResponse.json(
//         { success: true, message: 'Order not found but acknowledged' },
//         { status: 200 }
//       )
//     }

//     orderId = order.id
//     console.log('Found order:', order.id, 'Current status:', order.paymentStatus)

//     // Check for duplicate webhook processing
//     const existingWebhook = await checkDuplicateWebhook(transactionId, status)
//     if (existingWebhook) {
//       console.log('Duplicate webhook detected, ignoring')
//       return NextResponse.json({
//         success: true,
//         message: 'Duplicate webhook ignored',
//         reference,
//         status
//       })
//     }

//     // Handle different payment statuses
//     switch (status) {
//       case 'SUCCESS':
//         await handleSuccessfulPayment(order, actualPayload, amount)
//         break
        
//       case 'FAILED':
//         await handleFailedPayment(order, actualPayload)
//         break
        
//       case 'PENDING':
//         await handlePendingPayment(order, actualPayload)
//         break
        
//       default:
//         console.log('Unhandled payment status:', status)
//     }

//     // Log successful webhook processing
//     await logWebhookEvent({
//       type: 'webhook_processed',
//       orderId: order.id,
//       reference,
//       transactionId,
//       status,
//       payload: webhookData,
//       processingTime: Date.now() - startTime
//     })

//     // Always return success to OPay to acknowledge receipt
//     return NextResponse.json({
//       success: true,
//       message: 'Webhook processed successfully',
//       reference,
//       status
//     })

//   } catch (error: any) {
//     console.error('Webhook processing error:', error)
    
//     // Log error for investigation
//     await logWebhookEvent({
//       type: 'webhook_error',
//       orderId,
//       error: error.message,
//       stack: error.stack,
//       processingTime: Date.now() - startTime
//     })
    
//     // Return 200 to prevent OPay from retrying
//     return NextResponse.json({
//       success: false,
//       error: 'Webhook processing failed',
//       message: error.message
//     }, { status: 200 })
//   }
// }

// // Check for duplicate webhook processing
// async function checkDuplicateWebhook(transactionId: string, status: string): Promise<boolean> {
//   try {
//     const existing = await prisma.webhookLog.findFirst({
//       where: {
//         transactionId,
//         status,
//         createdAt: {
//           gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
//         }
//       }
//     })
//     return !!existing
//   } catch (error) {
//     // If webhook log table doesn't exist, assume not duplicate
//     return false
//   }
// }

// // Log webhook events for monitoring and debugging
// async function logWebhookEvent(data: any) {
//   try {
//     await prisma.webhookLog.create({
//       data: {
//         ...data,
//         provider: 'opay',
//         createdAt: new Date()
//       }
//     })
//   } catch (error) {
//     // If webhook log table doesn't exist, just log to console
//     console.log('Webhook log:', data)
//   }
// }

// // Handle successful payment
// async function handleSuccessfulPayment(order: any, payload: any, amount: number) {
//   console.log('Processing successful payment for order:', order.id)
  
//   try {
//     await prisma.$transaction(async (tx) => {
//       // Update order
//       await tx.order.update({
//         where: { id: order.id },
//         data: {
//           paymentStatus: 'COMPLETED',
//           status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
//           paidAt: new Date(),
//           totalAmount: amount, // Update with actual paid amount
//           updatedAt: new Date()
//         }
//       })

//       // Update checkout if exists
//       if (order.checkout) {
//         await tx.checkout.update({
//           where: { id: order.checkout.id },
//           data: {
//             paymentStatus: 'PAID',
//             status: 'COMPLETED',
//             paidAt: new Date(),
//             updatedAt: new Date()
//           }
//         })
//       }

//       // Update invoice if exists
//       if (order.Invoice) {
//         await tx.invoice.update({
//           where: { id: order.Invoice.id },
//           data: {
//             paymentStatus: 'PAID',
//             status: 'PAID',
//             balanceAmount: 0,
//             paidAt: new Date(),
//             updatedAt: new Date()
//           }
//         })
//       }

//       // Create payment record for tracking
//       try {
//         await tx.payment.create({
//           data: {
//             orderId: order.id,
//             amount: amount,
//             currency: payload.currency || 'NGN',
//             method: 'opay',
//             status: 'COMPLETED',
//             transactionId: payload.transactionId || payload.reference,
//             reference: payload.reference,
//             gatewayResponse: JSON.stringify(payload),
//             gatewayFee: payload.fee ? parseFloat(payload.fee) / 100 : 0, // Convert fee from kobo if available
//             paidAt: new Date()
//           }
//         })
//       } catch (paymentError) {
//         console.log('Payment table not found, skipping payment record creation')
//       }

//       // Log webhook processing
//       try {
//         await tx.webhookLog.create({
//           data: {
//             type: 'payment_success',
//             orderId: order.id,
//             transactionId: payload.transactionId,
//             status: payload.status,
//             provider: 'opay',
//             payload: JSON.stringify(payload),
//             createdAt: new Date()
//           }
//         })
//       } catch (webhookLogError) {
//         console.log('Webhook log table not found, skipping log creation')
//       }
//     })

//     console.log('Successfully processed payment success for order:', order.id)
    
//     // Queue background tasks
//     await queuePostPaymentTasks(order.id, 'success')
    
//   } catch (error) {
//     console.error('Error processing successful payment:', error)
//     throw error
//   }
// }

// // Handle failed payment
// async function handleFailedPayment(order: any, payload: any) {
//   console.log('Processing failed payment for order:', order.id)
  
//   try {
//     await prisma.$transaction(async (tx) => {
//       // Update order
//       await tx.order.update({
//         where: { id: order.id },
//         data: {
//           paymentStatus: 'FAILED',
//           status: 'CANCELLED',
//           failureReason: payload.displayedFailure || payload.failureReason || 'Payment failed',
//           updatedAt: new Date()
//         }
//       })

//       // Update checkout if exists
//       if (order.checkout) {
//         await tx.checkout.update({
//           where: { id: order.checkout.id },
//           data: {
//             paymentStatus: 'FAILED',
//             status: 'FAILED',
//             failureReason: payload.displayedFailure || payload.failureReason || 'Payment failed',
//             updatedAt: new Date()
//           }
//         })
//       }

//       // Update invoice if exists
//       if (order.Invoice) {
//         await tx.invoice.update({
//           where: { id: order.Invoice.id },
//           data: {
//             paymentStatus: 'FAILED',
//             status: 'CANCELLED',
//             updatedAt: new Date()
//           }
//         })
//       }

//       // Log webhook processing
//       try {
//         await tx.webhookLog.create({
//           data: {
//             type: 'payment_failed',
//             orderId: order.id,
//             transactionId: payload.transactionId,
//             status: payload.status,
//             provider: 'opay',
//             payload: JSON.stringify(payload),
//             createdAt: new Date()
//           }
//         })
//       } catch (webhookLogError) {
//         console.log('Webhook log table not found, skipping log creation')
//       }
//     })

//     console.log('Successfully processed payment failure for order:', order.id)
    
//     // Queue background tasks
//     await queuePostPaymentTasks(order.id, 'failed')
    
//   } catch (error) {
//     console.error('Error processing failed payment:', error)
//     throw error
//   }
// }

// // Handle pending payment
// async function handlePendingPayment(order: any, payload: any) {
//   console.log('Processing pending payment for order:', order.id)
  
//   try {
//     await prisma.order.update({
//       where: { id: order.id },
//       data: {
//         paymentStatus: 'PENDING',
//         updatedAt: new Date()
//       }
//     })
    
//     console.log('Updated pending payment status for order:', order.id)
//   } catch (error) {
//     console.error('Error processing pending payment:', error)
//   }
// }

// // Queue post-payment tasks (emails, inventory, etc.)
// async function queuePostPaymentTasks(orderId: string, status: 'success' | 'failed') {
//   try {
//     // In a real application, you might use a job queue like Bull/BullMQ
//     // For now, we'll just log the tasks that should be queued
    
//     if (status === 'success') {
//       console.log(`Queuing success tasks for order ${orderId}:`)
//       console.log('- Send confirmation email')
//       console.log('- Update inventory')
//       console.log('- Trigger fulfillment')
//       console.log('- Send webhook to external systems')
      
//       // Example: Queue email sending
//       // await emailQueue.add('send-confirmation', { orderId })
      
//       // Example: Queue inventory update
//       // await inventoryQueue.add('update-stock', { orderId })
      
//     } else if (status === 'failed') {
//       console.log(`Queuing failure tasks for order ${orderId}:`)
//       console.log('- Send failure notification')
//       console.log('- Release reserved inventory')
//       console.log('- Log for investigation')
      
//       // Example: Queue failure notification
//       // await emailQueue.add('send-failure-notification', { orderId })
//     }
//   } catch (error) {
//     console.error('Error queuing post-payment tasks:', error)
//   }
// }

// // GET endpoint for webhook URL verification
// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url)
//   const challenge = searchParams.get('challenge')
  
//   if (challenge) {
//     return NextResponse.json({ challenge })
//   }
  
//   return NextResponse.json({ 
//     message: 'OPay webhook endpoint is active',
//     timestamp: new Date().toISOString(),
//     version: '2.0'
//   })
// }