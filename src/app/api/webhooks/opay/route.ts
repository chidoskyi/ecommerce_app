// src/app/api/webhooks/opay/route.ts
import { NextResponse } from 'next/server'
import { sha512 } from 'js-sha512'
import prisma from '@/lib/prisma'
import { AuthenticatedRequest, requireAuth } from '@/lib/auth';
import { handleFailedPayment, handlePendingPayment, handleSuccessfulPayment } from '@/utils/opay-utils';

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
  timestamp?: string | null
  failureReason?: string | null
  sha512: string
  transactionId?: string | null
  type: string
  reference: string
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
  signature?: string
  amount: number
  channel: string
  country: string
  currency: string
  webhookData: WebhookData
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface WebhookData extends Record<string, unknown> {}


// Simplified payload structure actually received
export interface OpaySimplePayload {
  sha512: string
  webhookData: string
  signature?: string
  shippingAddress: {
    id: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  } | null;
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

export type OpayWebhookPayload = OpayDocumentedPayload | OpaySimplePayload

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

    // Find the order with all required relations
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { paymentId: reference },
          { transactionId: reference },
          { transactionId: transactionId }
        ]
      },
      include: {
        user: true,
        checkout: true,
        Invoice: true,
        items: true, 
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
          webhookData: payloadToVerify as WebhookData
        })
        break
        
      case 'FAILED':
        await handleFailedPayment(order, { 
          reference, 
          transactionId,
          amount,
          currency,
          failureReason,
          webhookData: payloadToVerify as WebhookData
        })
        break
        
      case 'PENDING':
        await handlePendingPayment(order, { 
          reference, 
          transactionId,
          amount,
          currency,
          webhookData: payloadToVerify as WebhookData
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