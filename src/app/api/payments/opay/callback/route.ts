import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { opayService } from '@/lib/opay'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reference } = body

    if (!reference) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 })
    }

    // Verify payment with Opay
    const paymentVerification = await opayService.verifyPayment(reference)
    
    if (paymentVerification.code !== '00000') {
      console.error('Opay verification failed:', paymentVerification)
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    const paymentData = paymentVerification.data  
    const isSuccessful = paymentData?.status === 'SUCCESS' || paymentData?.status === 'CLOSE'

    // Find the order by payment reference (paymentId field)
    const order = await prisma.order.findFirst({
      where: { 
        OR: [
          { paymentId: reference },
          { transactionId: reference }
        ]
      },
      include: {
        checkout: true,
        Invoice: true
      }
    })

    if (!order) {
      console.error('Order not found for reference:', reference)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (isSuccessful) {
      // Update order
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          processedAt: new Date(),
          transactionId: paymentData.orderNo || reference
        }
      })

      // Update checkout if exists
      if (order.checkout) {
        await prisma.checkout.update({
          where: { id: order.checkout.id },
          data: {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            completedAt: new Date()
          }
        })
      }

      // Update invoice if exists
      if (order.Invoice) {
        await prisma.invoice.update({
          where: { id: order.Invoice.id },
          data: {
            status: 'PAID',
            paymentStatus: 'PAID',
            paidAmount: order.Invoice.totalAmount,
            balanceAmount: 0,
            paidAt: new Date()
          }
        })

        // Create invoice payment record
        await prisma.invoicePayment.create({
          data: {
            invoiceId: order.Invoice.id,
            amount: order.Invoice.totalAmount,
            paymentMethod: 'opay',
            paymentType: 'FULL',
            status: 'PAID',
            transactionId: paymentData.transactionId || reference,
            reference: reference,
            gateway: 'opay',
            verifiedAt: new Date(),
            paidAt: new Date(),
            notes: 'Payment processed via Opay gateway',
            metadata: {
              opayData: paymentData,
              verifiedAt: new Date().toISOString(),
              automaticVerification: true
            }
          }
        })
      }

      console.log(`Payment successful for order ${order.orderNumber}`)
      
      return NextResponse.json({
        success: true,
        message: 'Payment confirmed successfully',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: 'CONFIRMED',
          paymentStatus: 'PAID'
        }
      })

    } else {
      // Update order
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED'
        }
      })

      // Update checkout if exists
      if (order.checkout) {
        await prisma.checkout.update({
          where: { id: order.checkout.id },
          data: {
            status: 'FAILED',
            paymentStatus: 'FAILED'
          }
        })
      }

      // Update invoice if exists
      if (order.Invoice) {
        await prisma.invoice.update({
          where: { id: order.Invoice.id },
          data: {
            status: 'VOID',
            paymentStatus: 'FAILED'
          }
        })
      }

      console.log(`Payment failed for order ${order.orderNumber}`)
      
      return NextResponse.json({
        success: false,
        message: 'Payment failed',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: 'CANCELLED',
          paymentStatus: 'FAILED'
        }
      })
    }

  } catch (error) {
    console.error('Opay callback error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  }
}

// GET endpoint to manually verify payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get("reference");
    const trxref = searchParams.get("trxref");
    const paymentReference = reference || trxref;

    if (!reference) {
      return NextResponse.json({ error: 'Payment reference is required' }, { status: 400 })
    }

    // Verify payment with Opay
    const paymentVerification = await opayService.verifyPayment(paymentReference)
    
    if (!paymentVerification.success) {
      return NextResponse.json({ 
        error: 'Payment verification failed',
        details: paymentVerification 
      }, { status: 400 })
    }

    // Find the order by payment reference
    const order = await prisma.order.findFirst({
      where: { 
        OR: [
          { paymentId: reference },
          { transactionId: reference }
        ]
      },
      include: {
        Invoice: true
      }
    })

    return NextResponse.json({
      success: true,
      paymentData: paymentVerification.data,
      order: order ? {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
        transactionId: order.transactionId,
        invoice: order.Invoice ? {
          id: order.Invoice.id,
          invoiceNumber: order.Invoice.invoiceNumber,
          status: order.Invoice.status,
          paymentStatus: order.Invoice.paymentStatus
        } : null
      } : null
    })

  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}