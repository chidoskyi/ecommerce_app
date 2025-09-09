// lib/opay-utils.ts
import { PaystackChargeData } from '@/app/api/webhooks/paystack/route';
import { paystackService } from '@/lib/paystack';
import prisma from '@/lib/prisma';
import EmailService from '@/lib/emailService';

const emailService = new EmailService()

/**
 * Helper function to update transaction status for OPay
 * Use this in webhook handlers or other parts of your application
 */



// Helper function to update transaction status (use in webhook handler)
export async function updateTransactionStatus(
    reference: string,
    status: string,
    providerData?: PaystackChargeData
  ) {
    try {
      const transaction = await prisma.transaction.findFirst({
        where: { reference },
      });
  
      if (!transaction) {
        console.error("Transaction not found for reference:", reference);
        return null;
      }
  
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: status.toUpperCase(),
          processedAt: new Date(),
          providerData: providerData
            ? JSON.stringify(providerData)
            : transaction.providerData,
        },
      });
  
      console.log(
        "Transaction updated:",
        updatedTransaction.id,
        "Status:",
        updatedTransaction.status
      );
      return updatedTransaction;
    } catch (error) {
      console.error("Error updating transaction status:", error);
      throw error;
    }
  }



export async function handleSuccessfulPayment(data: PaystackChargeData) {
    const { reference } = data;
  
    console.log("Processing successful payment:", reference);
  
    try {
      // Verify the payment with Paystack to ensure authenticity
      const verificationResponse = await paystackService.verifyPayment(reference);
  
      if (
        !verificationResponse.status ||
        verificationResponse.data.status !== "success"
      ) {
        throw new Error("Payment verification failed");
      }
  
      // Find the order by payment reference
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ paymentId: reference }, { transactionId: reference }],
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true, // Include user data for email
          shippingAddress: true, // Include shipping address
        },
      });
  
      if (!order) {
        console.error("Order not found for payment reference:", reference);
        return;
      }
  
      console.log("Found order for payment:", order.id);
  
      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          transactionId: reference,
          processedAt: new Date(),
          // paymentData: JSON.stringify(data) // Store the full payment data if needed
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true,
          shippingAddress: true,
        },
      });
  
      // Update checkout status
      await prisma.checkout.updateMany({
        where: { orderId: order.id },
        data: {
          status: "COMPLETED",
          paymentStatus: "PAID",
        },
      });
  
      // Find the checkout linked to this order
      const checkout = await prisma.checkout.findFirst({
        where: { orderId: order.id },
      });
  
      if (checkout) {
        await prisma.checkoutItem.deleteMany({
          where: { checkoutId: checkout.id },
        });
      }
  
      // Update invoice status
      await prisma.invoice.updateMany({
        where: { orderId: order.id },
        data: {
          status: "PAID",
          paymentStatus: "PAID",
          paidAt: new Date(),
          balanceAmount: 0,
        },
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
  
      // TODO: Send notification to admin
      // TODO: Trigger order fulfillment process
  
      console.log("Payment processed successfully for order:", order.id);
    } catch (error) {
      console.error("Error handling successful payment:", error);
      throw error;
    }
  }

export async function handleFailedPayment(data: PaystackChargeData) {
    const { reference, gateway_response } = data;
  
    console.log("Processing failed payment:", reference);
  
    try {
      // Find the order by payment reference
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ paymentId: reference }, { transactionId: reference }],
        },
      });
  
      if (!order) {
        console.error("Order not found for failed payment reference:", reference);
        return;
      }
  
      console.log("Found order for failed payment:", order.id);
  
      // Update order status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          paymentStatus: "FAILED",
          paymentData: JSON.stringify(data), // Store the failure data
        },
      });
  
      // Update checkout status
      await prisma.checkout.updateMany({
        where: { orderId: order.id },
        data: {
          status: "FAILED",
          paymentStatus: "FAILED",
        },
      });
  
      // Update invoice status
      await prisma.invoice.updateMany({
        where: { orderId: order.id },
        data: {
          status: "OVERDUE",
          paymentStatus: "FAILED",
        },
      });
  
      // TODO: Send payment failure notification to customer
      // TODO: Log failure for analytics
  
      console.log(
        "Failed payment processed for order:",
        order.id,
        "Reason:",
        gateway_response
      );
    } catch (error) {
      console.error("Error handling failed payment:", error);
      throw error;
    }
  }
  
export async function handlePendingPayment(data: PaystackChargeData) {
    const { reference } = data;
  
    console.log("Processing pending payment:", reference);
  
    try {
      // Find the order by payment reference
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ paymentId: reference }, { transactionId: reference }],
        },
      });
  
      if (!order) {
        console.error(
          "Order not found for pending payment reference:",
          reference
        );
        return;
      }
  
      console.log("Found order for pending payment:", order.id);
  
      // Update order status to pending if not already
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PENDING",
          paymentStatus: "PENDING",
          paymentData: JSON.stringify(data),
        },
      });
  
      // Update checkout status
      await prisma.checkout.updateMany({
        where: { orderId: order.id },
        data: {
          status: "PROCESSING",
          paymentStatus: "PENDING",
        },
      });
  
      // Update invoice status
      await prisma.invoice.updateMany({
        where: { orderId: order.id },
        data: {
          status: "SENT",
          paymentStatus: "PENDING",
        },
      });
  
      console.log("Pending payment status updated for order:", order.id);
    } catch (error) {
      console.error("Error handling pending payment:", error);
      throw error;
    }
  }