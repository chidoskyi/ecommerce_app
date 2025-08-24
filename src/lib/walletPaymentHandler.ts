// Add this to your /api/checkout/route.ts file
import prisma from "@/lib/prisma";
import { walletService } from "@/lib/wallet";
import { v4 as uuidv4 } from "uuid";

// Wallet payment handler with transaction management
export async function handleWalletPayment(user: any, calculatedData: any) {
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
    // Get or create wallet provider record
    let walletProvider = await prisma.paymentProvider.findFirst({
      where: { name: "wallet" },
    });

    if (!walletProvider) {
      walletProvider = await prisma.paymentProvider.create({
        data: {
          name: "wallet",
          displayName: "Wallet Payment",
          method: "WALLET",
          isActive: true,
          supportedCurrencies: ["NGN"],
          config: {
            set: {
              type: "internal_wallet",
              features: ["instant_payment", "balance_check"],
            },
          },
        },
      });
    }

    // Check wallet balance first
    const walletBalance = await walletService.getWalletBalance(
      user.id,
      user.clerkId
    );

    if (!walletBalance.isActive) {
      throw new Error("Wallet is not active. Please contact support.");
    }

    if (walletBalance.balance < totalAmount) {
      throw new Error(
        `Insufficient wallet balance. Available: ₦${walletBalance.balance.toFixed(
          2
        )}, Required: ₦${totalAmount.toFixed(2)}`
      );
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
      orderBy: { createdAt: "desc" },
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
        // Order is still valid, attempt wallet payment
        console.log("Valid existing order found, processing wallet payment");

        try {
          // Check balance again for existing order
          const currentBalance = await walletService.getWalletBalance(
            user.id,
            user.clerkId
          );
          if (currentBalance.balance < existingOrder.totalPrice) {
            throw new Error(
              `Insufficient wallet balance for existing order. Available: ₦${currentBalance.balance.toFixed(
                2
              )}, Required: ₦${existingOrder.totalPrice.toFixed(2)}`
            );
          }

          // Process wallet payment for existing order
          const walletPayment = await walletService.makePayment({
            fromUserId: user.id,
            toUserId: "SYSTEM", // System/store account - you might want to create a system user
            amount: existingOrder.totalPrice,
            description: `Payment for order ${existingOrder.orderNumber} via wallet`,
          });

          // Generate new payment reference for the wallet transaction
          const walletPaymentReference =
            walletPayment.paymentTransaction.reference;

          // Create transaction record for wallet payment
          const walletTransaction = await prisma.transaction.create({
            data: {
              transactionId: `TXN_${uuidv4()}`,
              reference: walletPaymentReference,
              providerId: walletProvider.id,
              userId: user.id,
              type: "ORDER_PAYMENT",
              amount: existingOrder.totalPrice,
              currency: "NGN",
              status: "SUCCESS",
              description: `Wallet payment for order ${existingOrder.orderNumber}`,
              processedAt: new Date(),
              reconciled: true,
              reconciledAt: new Date(),
              metadata: {
                set: {
                  orderId: existingOrder.id,
                  orderNumber: existingOrder.orderNumber,
                  customerEmail: userData.email,
                  paymentMethod: "wallet",
                  isRetry: true,
                  walletTransactionId:
                    walletPayment.paymentTransaction.transactionId,
                },
              },
              providerData: JSON.stringify({
                walletPayment: walletPayment.paymentTransaction,
                balanceBefore: walletPayment.paymentTransaction.balanceBefore,
                balanceAfter: walletPayment.paymentTransaction.balanceAfter,
              }),
            },
          });

          // Update order status to paid
          const updatedOrder = await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              status: "CONFIRMED",
              paymentStatus: "PAID",
              paymentId: walletPaymentReference,
              transactionId: walletPaymentReference,
              paymentMethod: "wallet",
            },
          });

          // Update or create checkout
          let checkoutForRetry;
          if (existingCheckout) {
            checkoutForRetry = await prisma.checkout.update({
              where: { id: existingCheckout.id },
              data: {
                status: "COMPLETED",
                paymentStatus: "PAID",
                isActive: true,
                sessionId: walletPaymentReference,
              },
            });
          } else {
            // Create checkout for existing order
            checkoutForRetry = await prisma.checkout.create({
              data: {
                userId: user.id,
                clerkId: user.clerkId,
                orderId: existingOrder.id,
                sessionId: walletPaymentReference,
                status: "COMPLETED",
                totalAmount: existingOrder.totalPrice,
                subtotal: existingOrder.subtotalPrice,
                taxAmount: existingOrder.totalTax,
                shippingAmount: existingOrder.totalShipping,
                discountAmount: existingOrder.totalDiscount,
                currency,
                isActive: true,
                shippingAddress: cleanShippingAddress,
                billingAddress: cleanBillingAddress,
                shippingMethod,
                paymentMethod: "wallet",
                paymentStatus: "PAID",
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
                paymentReference: walletPaymentReference,
                paymentStatus: "PAID",
                status: "PAID",
                balanceAmount: 0,
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
                status: "PAID",
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
                subtotal: existingOrder.subtotalPrice,
                taxAmount: existingOrder.totalTax,
                shippingAmount: existingOrder.totalShipping,
                discountAmount: existingOrder.totalDiscount,
                totalAmount: existingOrder.totalPrice,
                balanceAmount: 0,
                paymentMethod: "wallet",
                paymentStatus: "PAID",
                paymentReference: walletPaymentReference,
                terms: "Payment processed via wallet balance.",
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
            order: updatedOrder,
            invoice: {
              id: invoiceForRetry.id,
              invoiceNumber: invoiceForRetry.invoiceNumber,
              status: invoiceForRetry.status,
            },
            transaction: {
              id: walletTransaction.id,
              reference: walletTransaction.reference,
              status: walletTransaction.status,
            },
            walletBalance: {
              before: walletPayment.paymentTransaction.balanceBefore,
              after: walletPayment.paymentTransaction.balanceAfter,
            },
            paymentReference: walletPaymentReference,
            message: "Order paid successfully using wallet balance",
            deliveryInfo: {
              totalWeight,
              deliveryFee,
            },
          };
        } catch (walletError) {
          console.error(
            "Error during wallet payment for existing order:",
            walletError
          );

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

          throw new Error(`Wallet payment failed: ${walletError.message}`);
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

    // ===== CREATE NEW CHECKOUT, ORDER & PROCESS WALLET PAYMENT =====
    console.log(
      "Creating new checkout, order, and processing wallet payment..."
    );

    // Generate unique identifiers
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;
    const paymentReference = `WD_${uuidv4()}`;

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
        isActive: true,
        shippingAddress: cleanShippingAddress,
        billingAddress: cleanBillingAddress,
        shippingMethod,
        paymentMethod: "wallet",
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
        paymentMethod: "wallet",
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
      // Process wallet payment
      const walletPayment = await walletService.makePayment({
        fromUserId: user.id,
        toUserId: "SYSTEM", // System/store account
        amount: totalAmount,
        description: `Payment for order ${orderNumber} via wallet`,
      });

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          transactionId: `TXN_${uuidv4()}`,
          reference: walletPayment.paymentTransaction.reference,
          providerId: walletProvider.id,
          userId: user.id,
          type: "ORDER_PAYMENT",
          amount: totalAmount,
          currency: "NGN",
          status: "SUCCESS",
          description: `Wallet payment for order ${orderNumber}`,
          processedAt: new Date(),
          reconciled: true,
          reconciledAt: new Date(),
          metadata: {
            orderId: order.id,
            orderNumber: orderNumber,
            customerEmail: userData.email,
            paymentMethod: "wallet",
            isRetry: false,
            walletTransactionId: walletPayment.paymentTransaction.transactionId,
          },
          providerData: JSON.stringify({
            walletPayment: walletPayment.paymentTransaction,
            balanceBefore: walletPayment.paymentTransaction.balanceBefore,
            balanceAfter: walletPayment.paymentTransaction.balanceAfter,
          }),
        },
      });

      // Update order with payment details and mark as confirmed
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentId: walletPayment.paymentTransaction.reference,
          transactionId: walletPayment.paymentTransaction.reference,
        },
      });

      // Update checkout status to completed
      const updatedCheckout = await prisma.checkout.update({
        where: { id: checkout.id },
        data: {
          status: "COMPLETED",
          paymentStatus: "PAID",
          isActive: false,
          sessionId: walletPayment.paymentTransaction.reference,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
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
          status: "PAID",
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
          balanceAmount: 0, // Fully paid
          paymentMethod: "wallet",
          paymentStatus: "PAID",
          paymentReference: walletPayment.paymentTransaction.reference,
          terms: "Payment processed via wallet balance.",
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
        checkout: updatedCheckout,
        order: updatedOrder,
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
        walletBalance: {
          before: walletPayment.paymentTransaction.balanceBefore,
          after: walletPayment.paymentTransaction.balanceAfter,
        },
        paymentReference: walletPayment.paymentTransaction.reference,
        message: "Order created and paid successfully using wallet balance",
        deliveryInfo: {
          totalWeight,
          deliveryFee,
        },
      };
    } catch (walletError) {
      console.error("Wallet payment error:", walletError);

      // Mark checkout as failed
      await prisma.checkout.update({
        where: { id: checkout.id },
        data: {
          status: "FAILED",
          paymentStatus: "FAILED",
          isActive: false
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

      throw new Error(`Wallet payment failed: ${walletError.message}`);
    }
  } catch (error) {
    console.error("Error in handleWalletPayment:", error);

    // Enhanced error handling
    if (error.code === "P2002") {
      console.error("Unique constraint violation still occurred after cleanup");
      throw new Error(
        "Checkout conflict detected. Please refresh the page and try again."
      );
    }

    throw new Error(
      "Wallet payment failed: " + (error.message || "Unknown error")
    );
  }
}
