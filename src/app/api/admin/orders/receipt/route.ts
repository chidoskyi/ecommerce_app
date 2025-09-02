// /api/admin/orders/receipt/route.ts - Receipt Download Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest, requireAuth } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    const { orderNumber } = await request.json();

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      );
    }

    // Find the order
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        clerkId: user.clerkId
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
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Find the associated invoice
    const invoice = await prisma.invoice.findFirst({
      where: { orderId: order.id },
      include: {
        items: true
      }
    });

    // Generate PDF receipt
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    // Add company header
    doc.fontSize(20)
       .text(process.env.COMPANY_NAME || 'Your Store Name', 50, 50)
       .fontSize(12)
       .text(process.env.COMPANY_ADDRESS || 'Your Business Address', 50, 80)
       .text(`Phone: ${process.env.COMPANY_PHONE || '+234 XXX XXX XXXX'}`, 50, 95)
       .text(`Email: ${process.env.COMPANY_EMAIL || 'info@yourstore.com'}`, 50, 110);

    // Add receipt title
    doc.fontSize(16)
       .text('PAYMENT RECEIPT', 50, 150)
       .fontSize(12);

    // Add order details
    let yPosition = 180;
    doc.text(`Receipt #: ${invoice?.invoiceNumber || order.orderNumber}`, 50, yPosition)
       .text(`Order #: ${order.orderNumber}`, 300, yPosition);
    
    yPosition += 20;
    doc.text(`Date: ${order.createdAt.toLocaleDateString()}`, 50, yPosition)
       .text(`Payment Method: ${order.paymentMethod}`, 300, yPosition);

    yPosition += 20;
    doc.text(`Transaction ID: ${order.transactionId || order.paymentId}`, 50, yPosition)
       .text(`Status: ${order.paymentStatus}`, 300, yPosition);

    // Add customer details
    yPosition += 40;
    doc.fontSize(14).text('Customer Information:', 50, yPosition);
    yPosition += 20;
    doc.fontSize(12)
       .text(`Name: ${order.user?.firstName || ''} ${order.user?.lastName || ''}`, 50, yPosition)
       .text(`Email: ${order.email}`, 300, yPosition);

    if (order.phone) {
      yPosition += 15;
      doc.text(`Phone: ${order.phone}`, 50, yPosition);
    }

    // Add shipping address if available
    if (order.shippingAddress) {
      yPosition += 30;
      doc.fontSize(14).text('Shipping Address:', 50, yPosition);
      yPosition += 20;
      doc.fontSize(12)
         .text(`${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`, 50, yPosition);
      yPosition += 15;
      doc.text(order.shippingAddress.address, 50, yPosition);
      yPosition += 15;
      doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, 50, yPosition);
      yPosition += 15;
      doc.text(order.shippingAddress.country, 50, yPosition);
    }

    // Add items table
    yPosition += 40;
    doc.fontSize(14).text('Items Ordered:', 50, yPosition);
    yPosition += 20;

    // Table headers
    doc.fontSize(12)
       .text('Item', 50, yPosition)
       .text('Qty', 300, yPosition)
       .text('Unit Price', 350, yPosition)
       .text('Total', 450, yPosition);

    yPosition += 15;
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 10;

    // Table rows
    order.items.forEach((item) => {
      const unitPrice = item.unitPrice || item.fixedPrice || (item.totalPrice / item.quantity);
      const totalPrice = item.totalPrice || (unitPrice * item.quantity);

      doc.text(item.title, 50, yPosition, { width: 200 })
         .text(item.quantity.toString(), 300, yPosition)
         .text(`₦${unitPrice.toLocaleString()}`, 350, yPosition)
         .text(`₦${totalPrice.toLocaleString()}`, 450, yPosition);
      
      yPosition += 20;
    });

    // Add totals
    yPosition += 10;
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    yPosition += 15;

    doc.text(`Subtotal:`, 350, yPosition)
       .text(`₦${order.subtotalPrice.toLocaleString()}`, 450, yPosition);

    if (order.totalShipping > 0) {
      yPosition += 15;
      doc.text(`Shipping:`, 350, yPosition)
         .text(`₦${order.totalShipping.toLocaleString()}`, 450, yPosition);
    }

    if (order.totalTax > 0) {
      yPosition += 15;
      doc.text(`Tax:`, 350, yPosition)
         .text(`₦${order.totalTax.toLocaleString()}`, 450, yPosition);
    }

    if (order.totalDiscount > 0) {
      yPosition += 15;
      doc.text(`Discount:`, 350, yPosition)
         .text(`-₦${order.totalDiscount.toLocaleString()}`, 450, yPosition);
    }

    yPosition += 15;
    doc.fontSize(14)
       .text(`Total Paid:`, 350, yPosition)
       .text(`₦${order.totalPrice.toLocaleString()}`, 450, yPosition);

    // Add footer
    yPosition += 50;
    doc.fontSize(10)
       .text('Thank you for your business!', 50, yPosition)
       .text(`For support, contact us at ${process.env.COMPANY_EMAIL || 'info@yourstore.com'}`, 50, yPosition + 15);

    doc.end();

    const pdfBuffer = await pdfPromise;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${order.orderNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Receipt generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
});