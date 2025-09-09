// /api/payments/paystack/callback/route.ts - Paystack Webhook Handler

import { NextRequest, NextResponse } from "next/server";
import { paystackService } from "@/lib/paystack";
import { handleFailedPayment, handlePendingPayment, handleSuccessfulPayment } from "@/utils/paystack-utils";


// Type definitions
interface PaystackWebhookData {
  event: string;
  data: PaystackChargeData;
}

export interface PaystackChargeData {
  reference: string;
  amount: number;
  currency: string;
  status: string;
  gateway_response?: string;
  paid_at?: string;
  created_at?: string;
  channel?: string;
  ip_address?: string;
  fees?: number;
  customer?: {
    id: number;
    first_name?: string;
    last_name?: string;
    email: string;
    customer_code: string;
    phone?: string;
  };
  authorization?: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
  };
  metadata?: Record<string, unknown>;
}

export interface OrderWithRelations {
  id: string;
  status: string;
  paymentStatus: string;
  transactionId: string | null;
  processedAt: Date | null;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      price: number;
      slug: string;
    };
  }>;
  shippingAddress: {
    id: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  } | null;
}

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

    const webhookData: PaystackWebhookData = JSON.parse(body);
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

// async function handleSuccessfulPayment(data: PaystackChargeData) {
//   const { reference } = data;

//   console.log("Processing successful payment:", reference);

//   try {
//     // Verify the payment with Paystack to ensure authenticity
//     const verificationResponse = await paystackService.verifyPayment(reference);

//     if (
//       !verificationResponse.status ||
//       verificationResponse.data.status !== "success"
//     ) {
//       throw new Error("Payment verification failed");
//     }

//     // Find the order by payment reference
//     const order = await prisma.order.findFirst({
//       where: {
//         OR: [{ paymentId: reference }, { transactionId: reference }],
//       },
//       include: {
//         items: {
//           include: {
//             product: true,
//           },
//         },
//         user: true, // Include user data for email
//         shippingAddress: true, // Include shipping address
//       },
//     });

//     if (!order) {
//       console.error("Order not found for payment reference:", reference);
//       return;
//     }

//     console.log("Found order for payment:", order.id);

//     // Update order status
//     const updatedOrder = await prisma.order.update({
//       where: { id: order.id },
//       data: {
//         status: "CONFIRMED",
//         paymentStatus: "PAID",
//         transactionId: reference,
//         processedAt: new Date(),
//         // paymentData: JSON.stringify(data) // Store the full payment data if needed
//       },
//       include: {
//         items: {
//           include: {
//             product: true,
//           },
//         },
//         user: true,
//         shippingAddress: true,
//       },
//     });

//     // Update checkout status
//     await prisma.checkout.updateMany({
//       where: { orderId: order.id },
//       data: {
//         status: "COMPLETED",
//         paymentStatus: "PAID",
//       },
//     });

//     // Find the checkout linked to this order
//     const checkout = await prisma.checkout.findFirst({
//       where: { orderId: order.id },
//     });

//     if (checkout) {
//       await prisma.checkoutItem.deleteMany({
//         where: { checkoutId: checkout.id },
//       });
//     }

//     // Update invoice status
//     await prisma.invoice.updateMany({
//       where: { orderId: order.id },
//       data: {
//         status: "PAID",
//         paymentStatus: "PAID",
//         paidAt: new Date(),
//         balanceAmount: 0,
//       },
//     });

//     // Send confirmation email to customer
//     try {
//       if (updatedOrder.user && updatedOrder.user.email) {
//         console.log("Sending order confirmation email to:", updatedOrder.user.email);
//         await emailService.sendOrderConfirmation(updatedOrder.user, updatedOrder);
//         console.log("Order confirmation email sent successfully");
//       } else {
//         console.warn("No user email found for order:", order.id);
//       }
//     } catch (emailError) {
//       console.error("Failed to send order confirmation email:", emailError);
//       // Don't throw error here - payment was successful, email failure shouldn't break the flow
//     }

//     // TODO: Send notification to admin
//     // TODO: Trigger order fulfillment process

//     console.log("Payment processed successfully for order:", order.id);
//   } catch (error) {
//     console.error("Error handling successful payment:", error);
//     throw error;
//   }
// }
