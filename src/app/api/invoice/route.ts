import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { AuthenticatedRequest, requireAdmin, requireAuth } from '@/lib/auth'

// GET - Retrieve invoice for an order
export const GET = requireAuth( async ( request: AuthenticatedRequest ) => {
  try {

    const user = request.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const orderNumber = searchParams.get('orderNumber')

    if (!orderId && !orderNumber) {
      return NextResponse.json({ 
        error: 'Either orderId or orderNumber is required' 
      }, { status: 400 })
    }

    // Find the order
    let order
    if (orderId) {
      order = await prisma.order.findFirst({
        where: { 
          id: orderId, 
          userId: user.id 
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: true
        }
      })
    } else {
      order = await prisma.order.findFirst({
        where: { 
          orderNumber, 
          userId: user.id 
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          user: true
        }
      })
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Bank account details
    const bankDetails = {
      bankName: process.env.BANK_NAME || 'GTBank',
      accountName: process.env.ACCOUNT_NAME || 'Your Business Name',
      accountNumber: process.env.ACCOUNT_NUMBER || '0123456789',
      sortCode: process.env.SORT_CODE || '058'
    }

    // Company details
    const companyDetails = {
      name: process.env.COMPANY_NAME || 'Your Store Name',
      address: process.env.COMPANY_ADDRESS || 'Your Business Address',
      phone: process.env.COMPANY_PHONE || '+234 XXX XXX XXXX',
      email: process.env.COMPANY_EMAIL || 'info@yourstore.com',
      website: process.env.COMPANY_WEBSITE || 'www.yourstore.com'
    }

    // Create detailed invoice
    const invoice = {
      invoiceNumber: order.orderNumber,
      orderDate: order.createdAt,
      dueDate: new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from order date
      
      // Company information
      company: companyDetails,
      
      // Customer information
      customer: {
        name: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest Customer',
        email: order.email,
        phone: order.phone || '',
        address: order.shippingAddress
      },
      
      // Order items
      items: order.items.map(item => ({
        id: item.id,
        name: item.title,
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.totalPrice
      })),
      
      // Pricing breakdown
      pricing: {
        subtotal: order.subtotalPrice,
        tax: order.totalTax,
        shipping: order.totalShipping,
        discount: order.totalDiscount,
        total: order.totalPrice,
        currency: 'NGN'
      },
      
      // Order status
      status: {
        orderStatus: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod
      },
      
      // Payment details (only for bank transfer)
      paymentDetails: order.paymentMethod === 'bank_transfer' ? {
        bankDetails,
        paymentInstructions: [
          `Transfer ₦${order.totalPrice.toLocaleString()} to the account details above`,
          `Use "${order.orderNumber}" as your payment reference/description`,
          `Send payment confirmation to ${companyDetails.email}`,
          'Payment will be confirmed within 24 hours of receipt'
        ],
        reference: order.orderNumber
      } : null,
      
      // Additional info
      notes: order.notes || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }

    return NextResponse.json({
      success: true,
      invoice
    })

  } catch (error) {
    console.error('Get invoice error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
})

// POST - Generate invoice PDF (optional - you can implement PDF generation)
export const POST = requireAdmin(
  async (
    request: AuthenticatedRequest,
  ) => {
  try {

    const user = request.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, format = 'json' } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Find the order
    const order = await prisma.order.findFirst({
      where: { 
        id: orderId, 
        userId: user.id 
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (format === 'pdf') {
      // Here you can implement PDF generation using libraries like:
      // - puppeteer
      // - jsPDF
      // - PDFKit
      // - React-PDF
      
      return NextResponse.json({
        message: 'PDF generation not implemented yet',
        suggestion: 'Use GET endpoint to retrieve invoice data and generate PDF on frontend'
      }, { status: 501 })
    }

    // For now, just return the invoice data
    return NextResponse.json({
      success: true,
      message: 'Use GET endpoint to retrieve invoice data'
    })

  } catch (error) {
    console.error('Generate invoice error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
})

// PUT - Mark invoice as paid (when payment is confirmed)
export const PUT = requireAdmin(
  async (
    request: AuthenticatedRequest,
  ) => {
  try {

    const user = request.user
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // This endpoint would typically be used by admins to mark invoices as paid
    // You might want to add admin authorization here
    
    const { orderId, paymentConfirmed, paymentReference, adminNotes } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (paymentConfirmed) {
      // Update order to paid status
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'PAID',
          status: 'PROCESSING', // or 'CONFIRMED'
          transactionId: paymentReference,
          notes: adminNotes ? `${order.notes || ''}\nAdmin: ${adminNotes}`.trim() : order.notes,
          processedAt: new Date()
        }
      })

      // Also update checkout if exists
      const checkout = await prisma.checkout.findFirst({
        where: { orderId }
      })

      if (checkout) {
        await prisma.checkout.update({
          where: { id: checkout.id },
          data: {
            paymentStatus: 'PAID',
            status: 'COMPLETED',
            completedAt: new Date()
          }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Payment confirmed and order updated'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'No action taken'
    })

  } catch (error) {
    console.error('Update invoice payment error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
})