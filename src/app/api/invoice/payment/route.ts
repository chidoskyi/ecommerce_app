import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { AuthenticatedRequest, requireAdmin, requireAuth } from '@/lib/auth'

// POST - Record a payment against an invoice
export async function POST(request: NextRequest) {
  try {
          // First check admin status
  const authCheck = await requireAuth(request);
  if (authCheck) {
    return authCheck; // Returns the error response if not admin
  }

    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      invoiceId,
      invoiceNumber,
      amount,
      paymentMethod = 'bank_transfer',
      transactionId,
      reference,
      bankName,
      accountNumber,
      transferDate,
      notes
    } = await request.json()

    if (!invoiceId && !invoiceNumber) {
      return NextResponse.json({ 
        error: 'Either invoiceId or invoiceNumber is required' 
      }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ 
        error: 'Valid payment amount is required' 
      }, { status: 400 })
    }

    // Find the invoice
    let invoice
    if (invoiceId) {
      invoice = await prisma.invoice.findFirst({
        where: { 
          id: invoiceId,
          userId: user.id 
        },
        include: {
          order: true,
          payments: true
        }
      })
    } else {
      invoice = await prisma.invoice.findFirst({
        where: { 
          invoiceNumber,
          userId: user.id 
        },
        include: {
          order: true,
          payments: true
        }
      })
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check if invoice is already fully paid
    if (invoice.paymentStatus === 'PAID') {
      return NextResponse.json({ 
        error: 'Invoice is already fully paid' 
      }, { status: 400 })
    }

    // Validate payment amount doesn't exceed balance
    if (amount > invoice.balanceAmount) {
      return NextResponse.json({ 
        error: `Payment amount (₦${amount.toLocaleString()}) exceeds invoice balance (₦${invoice.balanceAmount.toLocaleString()})` 
      }, { status: 400 })
    }

    // Create invoice payment record
    const invoicePayment = await prisma.invoicePayment.create({
      data: {
        invoiceId: invoice.id,
        amount: parseFloat(amount),
        paymentMethod,
        paymentType: amount >= invoice.balanceAmount ? 'FULL' : 'PARTIAL',
        status: paymentMethod === 'bank_transfer' ? 'PENDING' : 'PAID',
        transactionId,
        reference: reference || invoice.paymentReference,
        gateway: paymentMethod,
        bankName,
        accountNumber,
        transferDate: transferDate ? new Date(transferDate) : new Date(),
        notes,
        paidAt: paymentMethod !== 'bank_transfer' ? new Date() : null
      }
    })

    // For non-bank transfer payments, also create a main Payment record
    if (paymentMethod !== 'bank_transfer') {
      // Find or create payment provider
      const provider = await prisma.paymentProvider.findFirst({
        where: { name: paymentMethod, isActive: true }
      })

      if (provider) {
        const mainPayment = await prisma.payment.create({
          data: {
            paymentReference: reference || `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId: invoice.orderId,
            userId: user.id,
            providerId: provider.id,
            method: paymentMethod.toUpperCase(),
            type: 'ORDER_PAYMENT',
            amount: parseFloat(amount),
            currency: 'NGN',
            netAmount: parseFloat(amount),
            status: 'SUCCESS',
            providerTransactionId: transactionId,
            customerDetails: {
              name: invoice.customerName,
              email: invoice.customerEmail,
              phone: invoice.customerPhone || ''
            },
            description: `Payment for invoice ${invoice.invoiceNumber}`,
            metadata: {
              invoiceId: invoice.id,
              invoicePaymentId: invoicePayment.id,
              paymentMethod,
              notes
            },
            paidAt: new Date()
          }
        })

        // Link the invoice payment to the main payment
        await prisma.invoicePayment.update({
          where: { id: invoicePayment.id },
          data: { paymentId: mainPayment.id }
        })
      }
    }

    // Calculate new totals
    const totalPaid = invoice.paidAmount + parseFloat(amount)
    const newBalance = invoice.totalAmount - totalPaid
    
    // Determine new payment status
    let newPaymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'PENDING'
    if (paymentMethod === 'bank_transfer') {
      newPaymentStatus = 'PENDING' // Awaiting verification
    } else if (newBalance <= 0) {
      newPaymentStatus = 'PAID'
    } else if (totalPaid > 0) {
      newPaymentStatus = 'PARTIALLY_PAID'
    } else {
      newPaymentStatus = 'UNPAID'
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: paymentMethod !== 'bank_transfer' ? totalPaid : invoice.paidAmount, // Don't update until verified
        balanceAmount: paymentMethod !== 'bank_transfer' ? newBalance : invoice.balanceAmount,
        paymentStatus: newPaymentStatus,
        status: newPaymentStatus === 'PAID' ? 'PAID' : invoice.status,
        paidAt: newPaymentStatus === 'PAID' ? new Date() : invoice.paidAt
      },
      include: {
        payments: true
      }
    })

    // Update order if payment is confirmed (not bank transfer)
    if (paymentMethod !== 'bank_transfer' && newPaymentStatus === 'PAID') {
      await prisma.order.update({
        where: { id: invoice.orderId },
        data: {
          paymentStatus: 'PAID',
          status: 'PROCESSING',
          processedAt: new Date()
        }
      })
    }

    const responseMessage = paymentMethod === 'bank_transfer' 
      ? 'Bank transfer payment recorded. Payment will be verified within 24 hours.'
      : 'Payment recorded successfully.'

    return NextResponse.json({
      success: true,
      message: responseMessage,
      payment: {
        id: invoicePayment.id,
        amount: invoicePayment.amount,
        status: invoicePayment.status,
        paymentMethod: invoicePayment.paymentMethod,
        reference: invoicePayment.reference
      },
      invoice: {
        id: updatedInvoice.id,
        paymentStatus: updatedInvoice.paymentStatus,
        paidAmount: updatedInvoice.paidAmount,
        balanceAmount: updatedInvoice.balanceAmount,
        totalAmount: updatedInvoice.totalAmount
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Record payment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// GET - Get payment history for an invoice
export async function GET(request: NextRequest) {
  try {
          // First check admin status
  const authCheck = await requireAuth(request);
  if (authCheck) {
    return authCheck; // Returns the error response if not admin
  }

    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('invoiceId')
    const invoiceNumber = searchParams.get('invoiceNumber')

    if (!invoiceId && !invoiceNumber) {
      return NextResponse.json({ 
        error: 'Either invoiceId or invoiceNumber is required' 
      }, { status: 400 })
    }

    // Find invoice with payments
    let invoice
    if (invoiceId) {
      invoice = await prisma.invoice.findFirst({
        where: { 
          id: invoiceId,
          userId: user.id 
        },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    } else {
      invoice = await prisma.invoice.findFirst({
        where: { 
          invoiceNumber,
          userId: user.id 
        },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceAmount: invoice.balanceAmount,
        paymentStatus: invoice.paymentStatus
      },
      payments: invoice.payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentType: payment.paymentType,
        status: payment.status,
        transactionId: payment.transactionId,
        reference: payment.reference,
        bankName: payment.bankName,
        transferDate: payment.transferDate,
        verifiedAt: payment.verifiedAt,
        notes: payment.notes,
        createdAt: payment.createdAt
      }))
    })

  } catch (error) {
    console.error('Get payment history error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// PUT - Admin endpoint to verify/reject bank transfer payments
export async function PUT(request: NextRequest) {
  try {
          // First check admin status
  const authCheck = await requireAdmin(request);
  if (authCheck) {
    return authCheck; // Returns the error response if not admin
  }
    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      paymentId, 
      action, // 'verify' or 'reject'
      adminNotes
    } = await request.json()

    if (!paymentId || !action) {
      return NextResponse.json({ 
        error: 'Payment ID and action are required' 
      }, { status: 400 })
    }

    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Action must be either "verify" or "reject"' 
      }, { status: 400 })
    }

    // Find the payment
    const payment = await prisma.invoicePayment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: {
          include: {
            order: true
          }
        }
      }
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Payment has already been processed' 
      }, { status: 400 })
    }

    if (action === 'verify') {
      // Verify payment
      await prisma.invoicePayment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          verifiedBy: user.id,
          verifiedAt: new Date(),
          paidAt: new Date(),
          notes: adminNotes ? `${payment.notes || ''}\nAdmin: ${adminNotes}`.trim() : payment.notes
        }
      })

      // Update invoice totals
      const newPaidAmount = payment.invoice.paidAmount + payment.amount
      const newBalance = payment.invoice.totalAmount - newPaidAmount
      const isFullyPaid = newBalance <= 0

      await prisma.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: Math.max(0, newBalance),
          paymentStatus: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
          status: isFullyPaid ? 'PAID' : payment.invoice.status,
          paidAt: isFullyPaid ? new Date() : payment.invoice.paidAt
        }
      })

      // Update order if fully paid
      if (isFullyPaid) {
        await prisma.order.update({
          where: { id: payment.invoice.orderId },
          data: {
            paymentStatus: 'PAID',
            status: 'PROCESSING',
            processedAt: new Date()
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully'
      })

    } else {
      // Reject payment
      await prisma.invoicePayment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          verifiedBy: user.id,
          verifiedAt: new Date(),
          notes: adminNotes ? `${payment.notes || ''}\nAdmin (Rejected): ${adminNotes}`.trim() : payment.notes
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Payment rejected. Customer will be notified.'
      })
    }

  } catch (error) {
    console.error('Verify payment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}