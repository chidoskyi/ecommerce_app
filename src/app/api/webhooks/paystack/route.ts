// /api/payments/paystack/callback/route.ts - Paystack Webhook Handler

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { paystackService } from "@/lib/paystack";

export async function POST(request: NextRequest) {
  try {
    // Get the raw body and signature
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    console.log("Paystack webhook received");
    console.log("Signature:", signature);
    console.log("Body:", body);

    if (!signature) {
      console.error("No signature provided");
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 400 }
      );
    }

    // Validate webhook signature
    const isValidSignature = paystackService.validateWebhookSignature(
      body,
      signature
    );

    if (!isValidSignature) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const webhookData = JSON.parse(body);
    const { event, data } = webhookData;

    console.log("Webhook event:", event);
    console.log("Webhook data:", JSON.stringify(data, null, 2));

    // Handle different webhook events
    switch (event) {
      case "charge.success":
        await handleSuccessfulPayment(data);
        break;

      case "charge.failed":
        await handleFailedPayment(data);
        break;

      case "charge.pending":
        await handlePendingPayment(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
        break;
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleSuccessfulPayment(data: any) {
  const { reference, amount, currency, status, metadata } = data;

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
        // paymentData: data // Store the full payment data
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

    // TODO: Send confirmation email to customer
    // TODO: Send notification to admin
    // TODO: Trigger order fulfillment process

    console.log("Payment processed successfully for order:", order.id);
  } catch (error) {
    console.error("Error handling successful payment:", error);
    throw error;
  }
}

async function handleFailedPayment(data: any) {
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
        paymentData: data, // Store the failure data
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

async function handlePendingPayment(data: any) {
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
        paymentData: data,
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

// Helper function to update transaction status (use in webhook handler)
export async function updateTransactionStatus(
  reference: string,
  status: string,
  providerData?: any
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

// Export for use in other files if needed
export { handleSuccessfulPayment, handleFailedPayment, handlePendingPayment };
