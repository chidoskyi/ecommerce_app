// lib/opay-utils.ts
import prisma from '@/lib/prisma';
import { 
  Checkout, 
  CheckoutStatus, 
  Invoice, 
  InvoiceStatus, 
  Order, 
  OrderStatus, 
  PaymentMethod, 
  PaymentStatus, 
  User,
  OrderItem,
  Product,
  TransactionStatus
} from '@prisma/client';


interface WebhookData {
  [key: string]: unknown;
}

interface PaymentPayload {
  reference: string;
  transactionId: string;
  amount: number;
  currency: string;
  timestamp?: string;
  webhookData: WebhookData;
}

interface FailedPaymentPayload extends PaymentPayload {
  failureReason?: string;
}

type OrderWithRelations = Order & { 
  user?: User | null; 
  checkout?: Checkout | null; 
  Invoice?: Invoice | null;
  items?: OrderItem[] | null;
  product?: Product | null;
};

export async function handleSuccessfulPayment(
  order: OrderWithRelations, 
  payload: PaymentPayload
) {
  try {
    console.log('🔄 Starting handleSuccessfulPayment for order:', order.id);

    // Get or create OPay payment provider
    let opayProvider = await prisma.paymentProvider.findFirst({
      where: { name: 'OPay' }
    });

    if (!opayProvider) {
      console.log('🆕 Creating new OPay provider...');
      opayProvider = await prisma.paymentProvider.create({
        data: {
          name: 'OPay',
          displayName: 'OPay',
          method: PaymentMethod.OPAY,
          isActive: true,
          supportedCurrencies: ['NGN'],
          sandboxMode: process.env.NODE_ENV !== 'production'
        }
      });
      console.log('✅ Created new OPay provider:', opayProvider.id);
    } else {
      console.log('✅ Found existing OPay provider:', opayProvider.id);
    }

    console.log('🔄 Starting database transaction...');
    await prisma.$transaction(async (tx) => {
      // Update order status
      console.log('📝 Updating order status...');
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.CONFIRMED,
          processedAt: new Date(payload.timestamp || new Date()),
          transactionId: payload.transactionId,
          updatedAt: new Date()
        },
        include: {
          user: true // Include user for email sending
        }
      });

      console.log('✅ Order updated:', {
        orderId: updatedOrder.id,
        newStatus: updatedOrder.status,
        newPaymentStatus: updatedOrder.paymentStatus
      });

      // Update checkout if exists
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

      // Update invoice if exists
      if (order.Invoice) {
        console.log('📝 Updating invoice status...');
        const updatedInvoice = await tx.invoice.update({
          where: { id: order.Invoice.id },
          data: {
            paymentStatus: PaymentStatus.PAID,
            status: InvoiceStatus.PAID,
            paidAt: new Date(payload.timestamp || new Date()),
            balanceAmount: 0,
            updatedAt: new Date()
          }
        });
        console.log('✅ Invoice updated:', updatedInvoice.id);
      } else {
        console.log('ℹ️ No invoice associated with order');
      }

      // Prepare payment data
      console.log('💰 Creating payment record...');
      const paymentCreateData = {
        orderId: order.id,
        providerId: opayProvider.id,
        method: PaymentMethod.OPAY,
        amount: payload.amount,
        currency: payload.currency,
        netAmount: payload.amount, // Will be recalculated if fee exists
        status: PaymentStatus.PAID,
        providerTransactionId: payload.transactionId,
        paymentReference: payload.reference,
        paidAt: new Date(payload.timestamp || new Date()),
        processingFee: 0 // Default value
      };

      // Handle fee calculation if detailed payload exists
      if (payload.webhookData && 
          typeof payload.webhookData === 'object' && 
          'payload' in payload.webhookData && 
          'sha512' in payload.webhookData) {
        console.log('📊 Processing detailed payload with fees...');
        const webhookPayload = payload.webhookData as { payload: { fee?: string } };
        const processingFee = parseInt(webhookPayload.payload.fee || '0') / 100;
        console.log('💸 Processing fee:', processingFee);
        
        paymentCreateData.processingFee = processingFee;
        
        // Recalculate netAmount if fee is present
        if (processingFee > 0) {
          paymentCreateData.netAmount = paymentCreateData.amount - processingFee;
          console.log('📉 Net amount after fee:', paymentCreateData.netAmount);
        }
      } else {
        console.log('ℹ️ No detailed payload with fee information');
      }

      const createdPayment = await tx.payment.create({
        data: paymentCreateData
      });

      console.log('✅ Payment record created:', createdPayment.id);
      console.log('💰 Payment details:', {
        amount: createdPayment.amount,
        netAmount: createdPayment.netAmount,
        processingFee: createdPayment.processingFee,
        reference: createdPayment.paymentReference,
        status: createdPayment.status
      });


    });

    console.log('🎉 Transaction completed successfully');
    console.log(`✅ Payment successful for order ${order.id} (${order.orderNumber || 'N/A'})`);
    
    // Log success summary for monitoring
    console.log('📋 SUCCESS SUMMARY:', {
      orderId: order.id,
      orderNumber: order.orderNumber || 'N/A',
      amount: payload.amount,
      currency: payload.currency,
      reference: payload.reference,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("❌ Error in handleSuccessfulPayment:", error);
  
    if (error instanceof Error) {
      console.error("🔍 Error details:", {
        message: error.message,
        stack: error.stack,
        orderId: order?.id,
        payload,
      });
    } else {
      console.error("🔍 Error details:", {
        message: String(error),
        orderId: order?.id,
        payload,
      });
    }
  
    throw error;
  }  
}

export async function handleFailedPayment(
  order: OrderWithRelations,
  payload: FailedPaymentPayload
) {
  try {
    console.log('🔄 Starting handleFailedPayment for order:', order.id);
    console.log('❌ Payment failed. Reason:', payload.failureReason);

    // Get or create OPay payment provider
    let opayProvider = await prisma.paymentProvider.findFirst({
      where: { name: 'OPay' }
    });

    if (!opayProvider) {
      console.log('🆕 Creating new OPay provider...');
      opayProvider = await prisma.paymentProvider.create({
        data: {
          name: 'OPay',
          displayName: 'OPay',
          method: PaymentMethod.OPAY,
          isActive: true,
          supportedCurrencies: ['NGN'],
          sandboxMode: process.env.NODE_ENV !== 'production'
        }
      });
      console.log('✅ Created new OPay provider:', opayProvider.id);
    } else {
      console.log('✅ Found existing OPay provider:', opayProvider.id);
    }

    console.log('🔄 Starting database transaction...');
    await prisma.$transaction(async (tx) => {
      // Update order status
      console.log('📝 Updating order status to failed...');
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          status: OrderStatus.CANCELLED,
          processedAt: new Date(payload.timestamp || new Date()),
          transactionId: payload.transactionId,
          updatedAt: new Date()
        },
        include: {
          user: true
        }
      });

      console.log('✅ Order updated:', {
        orderId: updatedOrder.id,
        newStatus: updatedOrder.status,
        newPaymentStatus: updatedOrder.paymentStatus
      });

      // Update checkout if exists
      if (order.checkout) {
        console.log('📝 Updating checkout status...');
        const updatedCheckout = await tx.checkout.update({
          where: { id: order.checkout.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            status: CheckoutStatus.FAILED,
            updatedAt: new Date()
          }
        });
        console.log('✅ Checkout updated:', updatedCheckout.id);
      } else {
        console.log('ℹ️ No checkout associated with order');
      }

      // Update invoice if exists
      if (order.Invoice) {
        console.log('📝 Updating invoice status...');
        const updatedInvoice = await tx.invoice.update({
          where: { id: order.Invoice.id },
          data: {
            paymentStatus: PaymentStatus.FAILED,
            status: InvoiceStatus.OVERDUE,
            updatedAt: new Date()
          }
        });
        console.log('✅ Invoice updated:', updatedInvoice.id);
      } else {
        console.log('ℹ️ No invoice associated with order');
      }

      // Create failed payment record
      console.log('💰 Creating failed payment record...');
      const paymentCreateData = {
        orderId: order.id,
        providerId: opayProvider.id,
        method: PaymentMethod.OPAY,
        amount: payload.amount,
        currency: payload.currency,
        netAmount: payload.amount,
        status: PaymentStatus.FAILED,
        providerTransactionId: payload.transactionId,
        paymentReference: payload.reference,
        failedAt: new Date(payload.timestamp || new Date()),
        failureReason: payload.failureReason,
        processingFee: 0
      };

      const createdPayment = await tx.payment.create({
        data: paymentCreateData
      });

      console.log('✅ Failed payment record created:', createdPayment.id);

      // Send payment failure notification email
      try {
        if (updatedOrder.user && updatedOrder.user.email) {
          console.log("📧 Sending payment failure notification to:", updatedOrder.user.email);
          // You might want to create a specific method for payment failure emails
          // await emailService.sendPaymentFailureNotification(updatedOrder.user, updatedOrder, payload.failureReason);
          console.log("✅ Payment failure notification sent successfully");
        } else {
          console.warn("⚠️ No user email found for order:", order.id);
        }
      } catch (emailError) {
        console.error("❌ Failed to send payment failure notification:", emailError);
        // Don't throw error here - payment failure processing is more important
      }
    });

    console.log('❌ Payment failure processed successfully');
    console.log(`❌ Payment failed for order ${order.id} (${order.orderNumber || 'N/A'})`);
    
    // Log failure summary for monitoring
    console.log('📋 FAILURE SUMMARY:', {
      orderId: order.id,
      orderNumber: order.orderNumber || 'N/A',
      amount: payload.amount,
      currency: payload.currency,
      reference: payload.reference,
      failureReason: payload.failureReason,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("❌ Error in handleFailedPayment:", error);
  
    if (error instanceof Error) {
      console.error("🔍 Error details:", {
        message: error.message,
        stack: error.stack,
        orderId: order?.id,
        payload,
      });
    } else {
      console.error("🔍 Error details:", {
        message: String(error),
        orderId: order?.id,
        payload,
      });
    }
  
    throw error;
  }
}

export async function handlePendingPayment(
  order: OrderWithRelations,
  payload: PaymentPayload
) {
  try {
    console.log('🔄 Starting handlePendingPayment for order:', order.id);
    console.log('⏳ Payment is pending...');

    // Get or create OPay payment provider
    let opayProvider = await prisma.paymentProvider.findFirst({
      where: { name: 'OPay' }
    });

    if (!opayProvider) {
      console.log('🆕 Creating new OPay provider...');
      opayProvider = await prisma.paymentProvider.create({
        data: {
          name: 'OPay',
          displayName: 'OPay',
          method: PaymentMethod.OPAY,
          isActive: true,
          supportedCurrencies: ['NGN'],
          sandboxMode: process.env.NODE_ENV !== 'production'
        }
      });
      console.log('✅ Created new OPay provider:', opayProvider.id);
    } else {
      console.log('✅ Found existing OPay provider:', opayProvider.id);
    }

    console.log('🔄 Starting database transaction...');
    await prisma.$transaction(async (tx) => {
      // Update order status
      console.log('📝 Updating order status to pending...');
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.PENDING,
          processedAt: new Date(payload.timestamp || new Date()),
          transactionId: payload.transactionId,
          updatedAt: new Date()
        },
        include: {
          user: true
        }
      });

      console.log('✅ Order updated:', {
        orderId: updatedOrder.id,
        newStatus: updatedOrder.status,
        newPaymentStatus: updatedOrder.paymentStatus
      });

      // Update checkout if exists
      if (order.checkout) {
        console.log('📝 Updating checkout status...');
        const updatedCheckout = await tx.checkout.update({
          where: { id: order.checkout.id },
          data: {
            paymentStatus: PaymentStatus.PENDING,
            status: CheckoutStatus.PENDING,
            updatedAt: new Date()
          }
        });
        console.log('✅ Checkout updated:', updatedCheckout.id);
      } else {
        console.log('ℹ️ No checkout associated with order');
      }

      // Update invoice if exists
      if (order.Invoice) {
        console.log('📝 Updating invoice status...');
        const updatedInvoice = await tx.invoice.update({
          where: { id: order.Invoice.id },
          data: {
            paymentStatus: PaymentStatus.PENDING,
            status: InvoiceStatus.PENDING,
            updatedAt: new Date()
          }
        });
        console.log('✅ Invoice updated:', updatedInvoice.id);
      } else {
        console.log('ℹ️ No invoice associated with order');
      }

      // Create or update pending payment record
      console.log('💰 Creating pending payment record...');
      
      // Check if payment record already exists for this reference
      const existingPayment = await tx.payment.findFirst({
        where: {
          paymentReference: payload.reference
        }
      });

      if (existingPayment) {
        // Update existing payment record
        console.log('📝 Updating existing payment record...');
        const updatedPayment = await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            status: PaymentStatus.PENDING,
            providerTransactionId: payload.transactionId,
            updatedAt: new Date()
          }
        });
        console.log('✅ Payment record updated:', updatedPayment.id);
      } else {
        // Create new payment record
        const paymentCreateData = {
          orderId: order.id,
          providerId: opayProvider.id,
          method: PaymentMethod.OPAY,
          amount: payload.amount,
          currency: payload.currency,
          netAmount: payload.amount,
          status: PaymentStatus.PENDING,
          providerTransactionId: payload.transactionId,
          paymentReference: payload.reference,
          processingFee: 0
        };

        const createdPayment = await tx.payment.create({
          data: paymentCreateData
        });

        console.log('✅ Pending payment record created:', createdPayment.id);
      }

      // Send pending payment notification email (optional)
      try {
        if (updatedOrder.user && updatedOrder.user.email) {
          console.log("📧 Sending payment pending notification to:", updatedOrder.user.email);
          // You might want to create a specific method for pending payment emails
          // await emailService.sendPaymentPendingNotification(updatedOrder.user, updatedOrder);
          console.log("✅ Payment pending notification sent successfully");
        } else {
          console.warn("⚠️ No user email found for order:", order.id);
        }
      } catch (emailError) {
        console.error("❌ Failed to send payment pending notification:", emailError);
        // Don't throw error here - payment pending processing is more important
      }
    });

    console.log('⏳ Payment pending status processed successfully');
    console.log(`⏳ Payment pending for order ${order.id} (${order.orderNumber || 'N/A'})`);
    
    // Log pending summary for monitoring
    console.log('📋 PENDING SUMMARY:', {
      orderId: order.id,
      orderNumber: order.orderNumber || 'N/A',
      amount: payload.amount,
      currency: payload.currency,
      reference: payload.reference,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error("❌ Error in handlePendingPayment:", error);
  
    if (error instanceof Error) {
      console.error("🔍 Error details:", {
        message: error.message,
        stack: error.stack,
        orderId: order?.id,
        payload,
      });
    } else {
      console.error("🔍 Error details:", {
        message: String(error),
        orderId: order?.id,
        payload,
      });
    }
  
    throw error;
  }
}

/**
 * Helper function to update transaction status for OPay
 * Use this in webhook handlers or other parts of your application
 */
export async function updateOpayTransactionStatus(
  reference: string,
  status: string,
  providerData?: string | null
) {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { reference },
    });

    if (!transaction) {
      console.error("OPay transaction not found for reference:", reference);
      return null;
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: status.toUpperCase() as TransactionStatus,
        processedAt: new Date(),
        providerData: providerData
          ? JSON.stringify(providerData)
          : transaction.providerData,
      },
    });

    console.log(
      "OPay transaction updated:",
      updatedTransaction.id,
      "Status:",
      updatedTransaction.status
    );
    return updatedTransaction;
  } catch (error) {
    console.error("Error updating OPay transaction status:", error);
    throw error;
  }
}
