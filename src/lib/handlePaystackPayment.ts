// Add this to your /api/checkout/route.ts file
import prisma from "@/lib/prisma";
import { paystackService } from "@/lib/paystack"; // You'll need to create this service
import { v4 as uuidv4 } from "uuid";

// Paystack payment handler with transaction management
export async function handlePaystackPayment(user: any, calculatedData: any) {
  const {
    userData,
    validatedItems,
    totalWeight,
    deliveryFee,
    finalSubtotal,
    totalAmount,
    shippingAddress,
    billingAddress,
    shippingMethod,
    couponId,
    discountAmount,
    currency,
  } = calculatedData;

  // Clean and format shipping address to match ShippingAddress type
  const cleanShippingAddress = shippingAddress
    ? {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        address: shippingAddress.address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        country: shippingAddress.country,
        zip: shippingAddress.zip,
        phone: shippingAddress.phone || null,
      }
    : null;

  // Clean and format billing address to match BillingAddress type
  const cleanBillingAddress = billingAddress
    ? {
        firstName: billingAddress.firstName,
        lastName: billingAddress.lastName,
        address: billingAddress.address,
        city: billingAddress.city,
        state: billingAddress.state,
        country: billingAddress.country,
        zip: billingAddress.zip,
        phone: billingAddress.phone || null,
      }
    : cleanShippingAddress
    ? {
        firstName: cleanShippingAddress.firstName,
        lastName: cleanShippingAddress.lastName,
        address: cleanShippingAddress.address,
        city: cleanShippingAddress.city,
        state: cleanShippingAddress.state,
        country: cleanShippingAddress.country,
        zip: cleanShippingAddress.zip,
        phone: cleanShippingAddress.phone,
      }
    : null;

  try {
    // Get or create Paystack provider record
    let paystackProvider = await prisma.paymentProvider.findFirst({
      where: { name: "paystack" },
    });

    if (!paystackProvider) {
      paystackProvider = await prisma.paymentProvider.create({
        data: {
          name: "paystack",
          displayName: "Paystack",
          method: "PAYSTACK",
          isActive: true,
          supportedCurrencies: ["NGN", "USD"],
          baseUrl: "https://api.paystack.co",
          publicKey: "pk_test_88ab67de7e0f4ffc0f4332cf377d2f44a70a7101",
        },
      });
    }

    // ===== COMPREHENSIVE EXISTING RECORDS CHECK =====
    console.log(
      "Checking for existing checkout, order, and invoice for user:",
      user.clerkId
    );

    // Check for existing checkout
    const existingCheckout = await prisma.checkout.findFirst({
      where: {
        clerkId: user.clerkId,
        status: {
          in: ["PENDING", "FAILED"],
        },
        paymentStatus: {
          in: ["PENDING", "FAILED", "UNPAID"],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Check for existing pending/failed orders
    const existingOrder = await prisma.order.findFirst({
      where: {
        clerkId: user.clerkId,
        status: {
          in: ["PENDING", "FAILED"],
        },
        paymentStatus: {
          in: ["PENDING", "FAILED", "UNPAID"],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" }, // Get the most recent one
    });

    // Check for existing invoice linked to the order
    let existingInvoice = null;
    if (existingOrder) {
      existingInvoice = await prisma.invoice.findUnique({
        where: { orderId: existingOrder.id },
        include: {
          items: true,
        },
      });
    }

    // ===== HANDLE EXISTING RECORDS =====

    // If we have an existing order (with or without checkout/invoice)
    if (existingOrder) {
      console.log(
        "Found existing order:",
        existingOrder.id,
        "Status:",
        existingOrder.status
      );

      const orderAge = Date.now() - existingOrder.createdAt.getTime();
      const maxOrderAge = 24 * 60 * 60 * 1000; // 24 hours

      // Check if order is expired
      if (orderAge > maxOrderAge) {
        console.log(
          "Order is older than 24 hours, cancelling and cleaning up..."
        );

        // Cancel expired order
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            status: "CANCELLED",
            paymentStatus: "CANCELLED",
          },
        });

        // Update related invoice if exists
        if (existingInvoice) {
          await prisma.invoice.update({
            where: { id: existingInvoice.id },
            data: {
              status: "CANCELLED",
              paymentStatus: "CANCELLED",
            },
          });
        }

        // Update related transactions to cancelled
        await prisma.transaction.updateMany({
          where: {
            reference: existingOrder.paymentId,
            status: { in: ["PENDING", "PROCESSING"] },
          },
          data: {
            status: "CANCELLED",
            processedAt: new Date(),
          },
        });

        // Delete related checkout if exists
        if (existingCheckout) {
          await prisma.checkout.delete({
            where: { id: existingCheckout.id },
          });
        }

        console.log("Expired records cleaned up");
      } else {
        // Order is still valid, allow retry
        console.log("Valid existing order found, preparing for payment retry");

        try {
          // Generate new payment reference for retry
          const newPaymentReference = `PAY_${uuidv4()}_RETRY`;

          const paymentResponse = await paystackService.initializePayment({
            reference: newPaymentReference,
            amount: Math.round(existingOrder.totalPrice * 100), // Convert to kobo
            currency: "NGN",
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone || "",
            callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/paystack/callback`,
            metadata: {
              orderId: existingOrder.id,
              userId: user.id,
              clerkId: user.clerkId,
              custom_fields: [
                {
                  display_name: "Order Number",
                  variable_name: "order_number",
                  value: existingOrder.orderNumber,
                },
                {
                  display_name: "Customer Phone",
                  variable_name: "customer_phone",
                  value: userData.phone || "",
                },
              ],
            },
          });

          console.log("Paystack payment retry response:", paymentResponse);

          // Check if payment initialization was successful
          const isSuccessful =
            paymentResponse?.status === true &&
            paymentResponse?.data?.authorization_url &&
            paymentResponse?.data?.reference;

          if (isSuccessful) {
            // Create new transaction for retry
            const retryTransaction = await prisma.transaction.create({
              data: {
                transactionId: `TXN_${uuidv4()}`,
                reference: paymentResponse.data.reference,
                providerId: paystackProvider.id,
                userId: user.id,
                type: "ORDER_PAYMENT",
                amount: existingOrder.totalPrice,
                currency: "NGN",
                status: "PENDING",
                description: `Payment retry for order ${existingOrder.orderNumber}`,
                metadata: {
                  orderId: existingOrder.id,
                  orderNumber: existingOrder.orderNumber,
                  customerEmail: userData.email,
                  paymentMethod: "paystack",
                  isRetry: true,
                },
                providerData: JSON.stringify({
                  authorization_url: paymentResponse.data.authorization_url,
                  access_code: paymentResponse.data.access_code,
                  reference: paymentResponse.data.reference,
                }),
              },
            });

            // Update order with new payment reference
            await prisma.order.update({
              where: { id: existingOrder.id },
              data: {
                paymentId: paymentResponse.data.reference,
                transactionId: paymentResponse.data.reference,
                paymentStatus: "PENDING",
              },
            });

            // Update or create checkout
            let checkoutForRetry;
            if (existingCheckout) {
              checkoutForRetry = await prisma.checkout.update({
                where: { id: existingCheckout.id },
                data: {
                  status: "PROCESSING",
                  sessionId: paymentResponse.data.reference,
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              });
            } else {
              // Create new checkout for existing order
              checkoutForRetry = await prisma.checkout.create({
                data: {
                  userId: user.id,
                  clerkId: user.clerkId,
                  orderId: existingOrder.id,
                  sessionId: paymentResponse.data.reference,
                  status: "PROCESSING",
                  totalAmount: existingOrder.totalPrice,
                  subtotal: existingOrder.subtotalPrice,
                  taxAmount: existingOrder.totalTax,
                  shippingAmount: existingOrder.totalShipping,
                  discountAmount: existingOrder.totalDiscount,
                  currency,
                  shippingAddress: cleanShippingAddress,
                  billingAddress: cleanBillingAddress,
                  shippingMethod,
                  paymentMethod: "paystack",
                  paymentStatus: "PENDING",
                  couponId,
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  items: {
                    create: existingOrder.items.map((item) => ({
                      productId: item.productId,
                      title: item.title,
                      quantity: item.quantity,
                      fixedPrice: item.fixedPrice || null,
                      unitPrice: item.unitPrice || null,
                      selectedUnit: item.selectedUnit || null,
                      totalPrice: item.totalPrice || item.price * item.quantity,
                    })),
                  },
                },
                include: {
                  items: {
                    include: {
                      product: true,
                    },
                  },
                },
              });
            }

            // Update existing invoice or create new one
            let invoiceForRetry;
            if (existingInvoice) {
              invoiceForRetry = await prisma.invoice.update({
                where: { id: existingInvoice.id },
                data: {
                  paymentReference: paymentResponse.data.reference,
                  paymentStatus: "PENDING",
                  status: "SENT",
                },
              });
            } else {
              // Create invoice for existing order
              const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

              invoiceForRetry = await prisma.invoice.create({
                data: {
                  invoiceNumber: existingOrder.orderNumber,
                  orderId: existingOrder.id,
                  userId: user.id,
                  clerkId: user.clerkId,
                  status: "SENT",
                  customerName: `${userData.firstName} ${userData.lastName}`,
                  customerEmail: userData.email,
                  customerPhone: userData.phone || "",
                  billingAddress: cleanBillingAddress,
                  companyName: process.env.COMPANY_NAME || "Your Store Name",
                  companyAddress:
                    process.env.COMPANY_ADDRESS || "Your Business Address",
                  companyPhone:
                    process.env.COMPANY_PHONE || "+234 XXX XXX XXXX",
                  companyEmail:
                    process.env.COMPANY_EMAIL || "info@yourstore.com",
                  issueDate: new Date(),
                  dueDate,
                  subtotal: existingOrder.subtotalPrice,
                  taxAmount: existingOrder.totalTax,
                  shippingAmount: existingOrder.totalShipping,
                  discountAmount: existingOrder.totalDiscount,
                  totalAmount: existingOrder.totalPrice,
                  balanceAmount: existingOrder.totalPrice,
                  paymentMethod: "paystack",
                  paymentStatus: "PENDING",
                  paymentReference: paymentResponse.data.reference,
                  terms: "Payment processed via Paystack gateway.",
                  footer: `Thank you for your business! Contact us at ${
                    process.env.COMPANY_EMAIL || "info@yourstore.com"
                  } for any questions.`,
                  items: {
                    create: existingOrder.items.map((item) => ({
                      productId: item.productId,
                      title: item.title,
                      quantity: item.quantity,
                      fixedPrice: item.fixedPrice || null,
                      unitPrice: item.unitPrice || null,
                      selectedUnit: item.selectedUnit || null,
                      totalPrice: item.totalPrice || item.price * item.quantity,
                      taxRate: 0,
                      taxAmount: 0,
                    })),
                  },
                },
              });
            }

            return {
              success: true,
              isRetry: true,
              checkout: checkoutForRetry,
              order: existingOrder,
              invoice: {
                id: invoiceForRetry.id,
                invoiceNumber: invoiceForRetry.invoiceNumber,
                status: invoiceForRetry.status,
              },
              transaction: {
                id: retryTransaction.id,
                reference: retryTransaction.reference,
                status: retryTransaction.status,
              },
              paymentUrl: paymentResponse.data.authorization_url,
              paymentReference: paymentResponse.data.reference,
              accessCode: paymentResponse.data.access_code,
              message: "Retrying payment for existing order",
              deliveryInfo: {
                totalWeight,
                deliveryFee,
              },
            };
          } else {
            console.error(
              "Paystack payment initialization failed for retry. Response:",
              paymentResponse
            );
            throw new Error(
              `Payment initialization failed for retry: ${
                paymentResponse?.message || "Unknown error"
              }`
            );
          }
        } catch (retryError) {
          console.error("Error during Paystack payment retry:", retryError);

          // Mark order as failed
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              status: "FAILED",
              paymentStatus: "FAILED",
            },
          });

          // Mark invoice as failed if exists
          if (existingInvoice) {
            await prisma.invoice.update({
              where: { id: existingInvoice.id },
              data: {
                status: "CANCELLED",
                paymentStatus: "FAILED",
              },
            });
          }

          // Mark related transactions as failed
          await prisma.transaction.updateMany({
            where: {
              reference: existingOrder.paymentId,
              status: { in: ["PENDING", "PROCESSING"] },
            },
            data: {
              status: "FAILED",
              processedAt: new Date(),
            },
          });

          throw new Error("Paystack payment retry failed");
        }
      }
    }

    // Clean up any orphaned checkout without valid order
    if (existingCheckout && !existingOrder) {
      console.log("Found orphaned checkout, cleaning up...");
      await prisma.checkout.delete({
        where: { id: existingCheckout.id },
      });
    }

    // ===== CREATE NEW CHECKOUT, ORDER & INVOICE =====
    console.log("Creating new checkout, order, and invoice...");

    // Generate unique identifiers
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;
    const paymentReference = `PAY_${uuidv4()}`;

    // Create new checkout
    const checkout = await prisma.checkout.create({
      data: {
        userId: user.id,
        clerkId: user.clerkId,
        sessionId: uuidv4(),
        status: "PENDING",
        totalAmount,
        subtotal: finalSubtotal,
        taxAmount: 0,
        shippingAmount: deliveryFee,
        discountAmount,
        currency,
        shippingAddress: cleanShippingAddress,
        billingAddress: cleanBillingAddress,
        shippingMethod,
        paymentMethod: "paystack",
        paymentStatus: "UNPAID",
        couponId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            title: item.title,
            quantity: item.quantity,
            fixedPrice: item.fixedPrice || null,
            unitPrice: item.unitPrice || null,
            selectedUnit: item.selectedUnit || null,
            totalPrice: item.totalPrice || item.price * item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
      },
    });

    // Create new order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        clerkId: user.clerkId,
        email: userData.email,
        phone: userData.phone || "",
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotalPrice: finalSubtotal,
        totalTax: 0,
        totalShipping: deliveryFee,
        totalDiscount: discountAmount,
        totalPrice: totalAmount,
        shippingAddress: cleanShippingAddress,
        paymentMethod: "paystack",
        paymentId: paymentReference,
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            title: item.title,
            quantity: item.quantity,
            fixedPrice: item.fixedPrice || null,
            unitPrice: item.unitPrice || null,
            selectedUnit: item.selectedUnit || null,
            totalPrice: item.totalPrice || item.price * item.quantity,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Link checkout to order
    await prisma.checkout.update({
      where: { id: checkout.id },
      data: { orderId: order.id },
    });

    try {
      // Initialize Paystack payment
      const paymentResponse = await paystackService.initializePayment({
        reference: paymentReference,
        amount: Math.round(totalAmount * 100), // Convert to kobo (smallest currency unit)
        currency: "NGN",
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone || "",
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/paystack/callback`,
        metadata: {
          orderId: order.id,
          userId: user.id,
          clerkId: user.clerkId,
          custom_fields: [
            {
              display_name: "Order Number",
              variable_name: "order_number",
              value: orderNumber,
            },
            {
              display_name: "Customer Phone",
              variable_name: "customer_phone",
              value: userData.phone || "",
            },
          ],
        },
      });

      console.log("Paystack payment initialization response:", paymentResponse);

      // Check if payment initialization was successful
      const isSuccessful =
        paymentResponse?.status === true &&
        paymentResponse?.data?.authorization_url &&
        paymentResponse?.data?.reference;

      if (!isSuccessful) {
        throw new Error(
          `Payment initialization failed: ${
            paymentResponse?.message || "Unknown error"
          }`
        );
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          transactionId: `TXN_${uuidv4()}`,
          reference: paymentResponse.data.reference,
          providerId: paystackProvider.id,
          userId: user.id,
          type: "ORDER_PAYMENT",
          amount: totalAmount,
          currency: "NGN",
          status: "PENDING",
          description: `Payment for order ${orderNumber}`,
          metadata: {
            set: { // Use the 'set' parameter for composite types
              orderId: order.id,
              orderNumber: orderNumber,
              customerEmail: userData.email,
              paymentMethod: "paystack",
              isRetry: false,
              customerId: user.id,
              source: "web",
              notes: `Payment for order ${orderNumber}`,
            }
          },
          providerData: JSON.stringify({
            authorization_url: paymentResponse.data.authorization_url,
            access_code: paymentResponse.data.access_code,
            reference: paymentResponse.data.reference,
          }),
        },
      });

      // Update order with payment details
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentId: paymentResponse.data.reference,
          transactionId: paymentResponse.data.reference,
        },
      });

      // Update checkout status
      await prisma.checkout.update({
        where: { id: checkout.id },
        data: {
          status: "PROCESSING",
          sessionId: paymentResponse.data.reference,
        },
      });

      // Create invoice
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: orderNumber,
          orderId: order.id,
          userId: user.id,
          clerkId: user.clerkId,
          status: "SENT",
          customerName: `${userData.firstName} ${userData.lastName}`,
          customerEmail: userData.email,
          customerPhone: userData.phone || "",
          billingAddress: cleanBillingAddress,
          companyName: process.env.COMPANY_NAME || "Your Store Name",
          companyAddress:
            process.env.COMPANY_ADDRESS || "Your Business Address",
          companyPhone: process.env.COMPANY_PHONE || "+234 XXX XXX XXXX",
          companyEmail: process.env.COMPANY_EMAIL || "info@yourstore.com",
          issueDate: new Date(),
          dueDate,
          subtotal: finalSubtotal,
          taxAmount: 0,
          shippingAmount: deliveryFee,
          discountAmount,
          totalAmount,
          balanceAmount: totalAmount,
          paymentMethod: "paystack",
          paymentStatus: "PENDING",
          paymentReference: paymentResponse.data.reference,
          terms: "Payment processed via Paystack gateway.",
          footer: `Thank you for your business! Contact us at ${
            process.env.COMPANY_EMAIL || "info@yourstore.com"
          } for any questions.`,
          items: {
            create: validatedItems.map((item) => ({
              productId: item.productId,
              title: item.title,
              quantity: item.quantity,
              fixedPrice: item.fixedPrice || null,
              unitPrice: item.unitPrice || null,
              selectedUnit: item.selectedUnit || null,
              totalPrice: item.totalPrice || item.price * item.quantity,
              taxRate: 0,
              taxAmount: 0,
            })),
          },
        },
      });

      return {
        success: true,
        isRetry: false,
        checkout,
        order,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
        },
        transaction: {
          id: transaction.id,
          reference: transaction.reference,
          status: transaction.status,
        },
        paymentUrl: paymentResponse.data.authorization_url,
        paymentReference: paymentResponse.data.reference,
        accessCode: paymentResponse.data.access_code,
        message: "New checkout session created",
        deliveryInfo: {
          totalWeight,
          deliveryFee,
        },
      };
    } catch (paymentError) {
      console.error("Paystack initialization error:", paymentError);

      // Mark checkout as failed
      await prisma.checkout.update({
        where: { id: checkout.id },
        data: {
          status: "FAILED",
          paymentStatus: "FAILED",
        },
      });

      // Mark order as failed
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          paymentStatus: "FAILED",
        },
      });

      throw new Error("Paystack payment initialization failed");
    }
  } catch (error) {
    console.error("Error in handlePaystackPayment:", error);

    // Enhanced error handling
    if (error.code === "P2002") {
      console.error("Unique constraint violation still occurred after cleanup");
      throw new Error(
        "Checkout conflict detected. Please refresh the page and try again."
      );
    }

    throw new Error(
      "Payment initialization failed: " + (error.message || "Unknown error")
    );
  }
}
