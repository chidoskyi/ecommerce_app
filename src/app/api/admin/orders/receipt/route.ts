// /api/admin/orders/receipt/route.ts - Fixed Receipt Download Endpoint using jsPDF
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest, requireAuth } from '@/lib/auth';
import jsPDF from 'jspdf';

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

    // Generate PDF receipt using jsPDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;

    // Helper function to format currency (avoid special characters)
    const formatCurrency = (amount: number): string => {
      return `NGN ${amount.toLocaleString('en-US')}`;
    };

    // Helper function to add text with proper positioning
    type TextAlign = 'left' | 'right' | 'center';
    interface AddTextOptions {
      align?: TextAlign;
    }
    const addText = (text: string, x: number, y: number, options: AddTextOptions = {}) => {
      if (options.align === 'right') {
        doc.text(text, x, y, { align: 'right' });
      } else if (options.align === 'center') {
        doc.text(text, x, y, { align: 'center' });
      } else {
        doc.text(text, x, y);
      }
    };

    // Add company header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    addText(process.env.COMPANY_NAME || 'Your Store Name', margin, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addText(process.env.COMPANY_ADDRESS || 'Your Business Address', margin, yPosition);
    
    yPosition += 6;
    addText(`Phone: ${process.env.COMPANY_PHONE || '+234 XXX XXX XXXX'}`, margin, yPosition);
    
    yPosition += 6;
    addText(`Email: ${process.env.COMPANY_EMAIL || 'info@yourstore.com'}`, margin, yPosition);

    // Add receipt title
    yPosition += 15;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    addText('PAYMENT RECEIPT', pageWidth / 2, yPosition, { align: 'center' });

    // Add order details in two columns
    yPosition += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Left column
    addText(`Receipt #: ${invoice?.invoiceNumber || order.orderNumber}`, margin, yPosition);
    yPosition += 6;
    addText(`Date: ${order.createdAt.toLocaleDateString('en-US')}`, margin, yPosition);
    yPosition += 6;
    addText(`Transaction ID: ${order.transactionId || order.paymentId || 'N/A'}`, margin, yPosition);
    
    // Right column (reset y position)
    yPosition -= 12;
    const rightColX = pageWidth / 2 + 10;
    addText(`Order #: ${order.orderNumber}`, rightColX, yPosition);
    yPosition += 6;
    addText(`Payment Method: ${order.paymentMethod}`, rightColX, yPosition);
    yPosition += 6;
    addText(`Status: ${order.paymentStatus}`, rightColX, yPosition);

    // Add customer details
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('Customer Information', margin, yPosition);
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    addText(`Name: ${order.user?.firstName || ''} ${order.user?.lastName || ''}`, margin, yPosition);
    addText(`Email: ${order.email}`, rightColX, yPosition);

    if (order.phone) {
      yPosition += 6;
      addText(`Phone: ${order.phone}`, margin, yPosition);
    }

    // Add shipping address if available
    if (order.shippingAddress) {
      yPosition += 12;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      addText('Shipping Address', margin, yPosition);
      
      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      addText(`${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`, margin, yPosition);
      
      yPosition += 6;
      addText(order.shippingAddress.address, margin, yPosition);
      
      yPosition += 6;
      addText(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, margin, yPosition);
      
      yPosition += 6;
      addText(order.shippingAddress.country, margin, yPosition);
    }

    // Add items table
    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    addText('Items Ordered', margin, yPosition);

    yPosition += 10;
    
    // Table headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const col1 = margin;
    const col2 = pageWidth - 80;
    const col3 = pageWidth - 60;
    const col4 = pageWidth - 40;
    // const col5 = pageWidth - 15;
    
    addText('Item', col1, yPosition);
    addText('Qty', col2, yPosition);
    addText('Unit Price', col3, yPosition);
    addText('Total', col4, yPosition);

    // Draw header line
    yPosition += 3;
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let subtotalCalc = 0;
    
    order.items.forEach((item) => {
      const unitPrice = Number(item.unitPrice) || Number(item.fixedPrice) || (Number(item.totalPrice) / item.quantity);
      const totalPrice = Number(item.totalPrice) || (unitPrice * item.quantity);
      subtotalCalc += totalPrice;

      // Handle long item titles
      const maxTitleLength = 35;
      const itemTitle = item.title.length > maxTitleLength ? 
        item.title.substring(0, maxTitleLength - 3) + '...' : 
        item.title;
      
      addText(itemTitle, col1, yPosition);
      addText(item.quantity.toString(), col2, yPosition);
      addText(formatCurrency(unitPrice), col3, yPosition);
      addText(formatCurrency(totalPrice), col4, yPosition);
      
      yPosition += 8;
    });

    // Add totals section
    yPosition += 5;
    doc.setLineWidth(0.5);
    doc.line(col2, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    
    // Subtotal
    addText('Subtotal:', col3, yPosition);
    addText(formatCurrency(Number(order.subtotalPrice)), col4, yPosition);

    // Shipping
    if (order.totalShipping > 0) {
      yPosition += 6;
      addText('Shipping:', col3, yPosition);
      addText(formatCurrency(Number(order.totalShipping)), col4, yPosition);
    }

    // Tax
    if (order.totalTax > 0) {
      yPosition += 6;
      addText('Tax:', col3, yPosition);
      addText(formatCurrency(Number(order.totalTax)), col4, yPosition);
    }

    // Discount
    if (order.totalDiscount > 0) {
      yPosition += 6;
      addText('Discount:', col3, yPosition);
      addText(`-${formatCurrency(Number(order.totalDiscount))}`, col4, yPosition);
    }

    // Total
    yPosition += 8;
    doc.setLineWidth(1);
    doc.line(col2, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    addText('Total Paid:', col3, yPosition);
    addText(formatCurrency(Number(order.totalPrice)), col4, yPosition);

    // Add footer
    yPosition += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    addText('Thank you for your business!', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 8;
    addText(`For support, contact us at ${process.env.COMPANY_EMAIL || 'info@yourstore.com'}`, 
      pageWidth / 2, yPosition, { align: 'center' });

    // Add page border (optional)
    doc.setLineWidth(0.5);
    doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.height - 20);

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

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