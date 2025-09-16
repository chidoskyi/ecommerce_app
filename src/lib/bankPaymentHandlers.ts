// /api/checkout/route.ts (with internal handlers)
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import {
  CheckoutStatus,
  PaymentStatus,
  OrderStatus,
  User,
  Address,
  Product,
  UnitPrice,
  Prisma,
  Checkout,
  Order,
  ShippingAddress,
} from "@prisma/client";
import EmailService from "@/lib/emailService";
import { AuthenticatedUser } from "./auth";

const emailService = new EmailService();

export type CartItemWithProduct = Prisma.CartItemGetPayload<{
  include: {
    product: {
      include: {
        category: true;
      };
    };
  };
}>;

// Request data interface
export interface CheckoutRequestData {
  cartItems: CartItemWithProduct[];
  shippingAddress: Address;
  billingAddress?: Address;
  couponId?: string;
  subtotal?: number;
  discountAmount?: number;
  currency?: string;
}

// Pricing information interface
export interface PricingInfo {
  fixedPrice: number | null;
  unitPrice: number | null;
  selectedUnit: string | null;
  totalPrice: number;
}

// Validated item interface
export interface ValidatedItem {
  productId: string;
  sku: string;
  title: string;
  quantity: number;
  fixedPrice: number | null;
  unitPrice: number | null;
  selectedUnit: string | null;
  totalPrice: number;
  weight: number;
  product: Product;
  totalWeight: number;
  price: number;
}

// Calculation result interface
export interface CalculationResult {
  userData: User;
  validatedItems: ValidatedItem[];
  totalWeight: number;
  deliveryFee: number;
  finalSubtotal: number;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  billingAddress: Address;
  couponId?: string;
  discountAmount: number;
  currency: string;
}

// User interface for the validation function
export interface ValidationUser {
  id: string;
  clerkId?: string;
  email: string;
  role?: string;
}

export interface BankTransferResult {
  success: boolean;
  isPendingOrder?: boolean;
  isRetry?: boolean;
  checkout: Checkout;
  order: Order;
  invoice: InvoiceDisplay;
  showInvoice: boolean;
  message: string;
  deliveryInfo: {
    totalWeight: number;
    deliveryFee: number;
  };
  paymentReference?: string;
}

interface InvoiceDisplay {
  id: string;
  invoiceNumber: string;
  orderDate: Date;
  dueDate: Date;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number | null; // Changed from number to number | null
    total: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  bankDetails: Array<{
    bankName: string;
    accountName: string;
    accountNumber: string;
    sortCode?: string;
  }>;
  deliveryInfo: {
    totalWeight: number;
    deliveryFee: number;
  };
  paymentInstructions: string[];
}

// Shared validation and calculation function
export async function validateAndCalculate(
  user: ValidationUser,
  requestData: CheckoutRequestData
): Promise<CalculationResult> {
  const {
    cartItems,
    shippingAddress,
    billingAddress,
    couponId,
    subtotal,
    discountAmount = 0,
    currency = "NGN",
  } = requestData;

  // Validate required fields
  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cart items are required");
  }

  if (!shippingAddress) {
    throw new Error("Shipping address is required");
  }

  if (!shippingAddress.city) {
    throw new Error("Delivery city is required");
  }

  // Get user details
  const userData = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userData) {
    throw new Error("User not found");
  }

  // Calculate totals using cart item data directly
  let calculatedSubtotal = 0;
  let totalWeight = 0;
  const validatedItems: ValidatedItem[] = [];

  for (const item of cartItems) {
    // Access the product from the included relation
    const product = item.product;

    // Validate product data exists
    if (!product) {
      throw new Error(`Product data missing for item ${item.id}`);
    }

    // Fix weight validation - convert string to number and validate
    // const productWeight = product.weight ?? 0;
    if (!product.weight || product.weight <= 0) {
      throw new Error(`Product ${product.name} must have a valid weight`);
    }

    // Handle unit selection - safely handle different data types
    // Fix: Properly type and handle selectedUnit with explicit type guard
    const unitData = item.selectedUnit;
    let selectedUnit: string | null = null;
    let unitPrice: number | undefined = undefined;
    
    // Type guard function to check if unitData is a UnitPrice object
    const isUnitPrice = (data: unknown): data is UnitPrice => {
      return data !== null &&
             data !== undefined &&
             typeof data === 'object' && 
             'unit' in data &&
             'price' in data &&
             typeof (data as { unit: unknown; price: unknown }).unit === 'string' && 
             typeof (data as { unit: unknown; price: unknown }).price === 'number';
    };
    
    // Check if unitData is a proper UnitPrice object
    if (isUnitPrice(unitData)) {
      selectedUnit = unitData.unit;
      unitPrice = unitData.price;
    }
    
    // Calculate item price
    let itemPrice = 0;
    let pricingInfo: PricingInfo = {
      fixedPrice: null,
      unitPrice: null,
      selectedUnit: null,
      totalPrice: 0,
    };
    
    // Case 1: Fixed price item
    if (item.fixedPrice !== null && item.fixedPrice !== undefined) {
      itemPrice = item.fixedPrice;
      pricingInfo = {
        fixedPrice: item.fixedPrice,
        unitPrice: null,
        selectedUnit: null,
        totalPrice: item.fixedPrice * item.quantity,
      };
    }
    // Case 2: Unit price item
    else if (unitPrice !== null && unitPrice !== undefined && selectedUnit) {
      // Ensure unitPrices exists and is an array
      if (!item.product.unitPrices || !Array.isArray(item.product.unitPrices)) {
        throw new Error(
          `Product ${item.product.name} has no unit prices defined`
        );
      }
    
      // Validate the selected unit exists in product's unitPrices (case-insensitive)
      const availableUnits = item.product.unitPrices.map((u: UnitPrice) => u.unit);
      const unitExists = availableUnits.some(unit => 
        unit && unit.toLowerCase() === selectedUnit.toLowerCase()
      );
    
      if (!unitExists) {
        throw new Error(
          `Selected unit "${selectedUnit}" is not valid for product ${item.product.name}. Available units: ${availableUnits.join(', ')}`
        );
      }
    
      itemPrice = unitPrice;
      pricingInfo = {
        fixedPrice: null,
        unitPrice: unitPrice,
        selectedUnit: selectedUnit,
        totalPrice: unitPrice * item.quantity,
      };
    }
    // Case 3: Fallback to product's fixed price
    else if (
      item.product.fixedPrice !== null &&
      item.product.fixedPrice !== undefined
    ) {
      itemPrice = item.product.fixedPrice;
      pricingInfo = {
        fixedPrice: item.product.fixedPrice,
        unitPrice: null,
        selectedUnit: null,
        totalPrice: item.product.fixedPrice * item.quantity,
      };
    } else {
      throw new Error(
        `Product ${item.product.name} has no valid pricing information`
      );
    }

    // Use the parsed weight for calculations
    const itemWeight: number = Number(item.product.weight) * item.quantity;
    calculatedSubtotal += pricingInfo.totalPrice;
    totalWeight += itemWeight;

    const validatedItem: ValidatedItem = {
      productId: item.productId,
      title: item.product.name,
      product: item.product,
      quantity: item.quantity,
      sku: item.product.sku,
      fixedPrice: pricingInfo.fixedPrice,
      unitPrice: pricingInfo.unitPrice,
      selectedUnit: pricingInfo.selectedUnit,
      totalPrice: pricingInfo.totalPrice,
      weight: Number(item.product.weight),
      totalWeight: itemWeight,
      price: itemPrice,
    };

    validatedItems.push(validatedItem);
  }

  // Calculate dynamic delivery fee
  const deliveryFee = 4500;

  // Use provided subtotal if available, otherwise use calculated one
  const finalSubtotal: number = subtotal || calculatedSubtotal;
  const totalAmount: number = finalSubtotal + deliveryFee - discountAmount;

  return {
    userData,
    validatedItems,
    totalWeight,
    deliveryFee,
    finalSubtotal,
    totalAmount,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    couponId,
    discountAmount,
    currency,
  };
}

// Bank transfer payment handler
export async function handleBankTransferPayment(
  user: AuthenticatedUser,
  calculatedData: CalculationResult
): Promise<BankTransferResult> {
  const {
    userData,
    validatedItems,
    totalWeight,
    deliveryFee,
    finalSubtotal,
    totalAmount,
    shippingAddress,
    billingAddress,
    couponId,
    discountAmount,
    currency,
  } = calculatedData;

  // Clean and format shipping address to match ShippingAddress type
  // Clean and format shipping address to match ShippingAddress type
  const cleanShippingAddress = shippingAddress
    ? {
        firstName: shippingAddress.firstName || "",
        lastName: shippingAddress.lastName || "",
        address: shippingAddress.address || "",
        city: shippingAddress.city || "",
        state: shippingAddress.state || "",
        country: shippingAddress.country || "",
        zip: shippingAddress.zip || "",
        phone: shippingAddress.phone || null,
      }
    : {
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        address: "",
        city: "",
        state: "",
        country: "",
        zip: "",
        phone: userData.phone || null,
      };

  // Clean and format billing address to match BillingAddress type
  // If no billing address provided, use shipping address
  const cleanBillingAddress = billingAddress
    ? {
        firstName: billingAddress.firstName || "",
        lastName: billingAddress.lastName || "",
        address: billingAddress.address || "",
        city: billingAddress.city || "",
        state: billingAddress.state || "",
        country: billingAddress.country || "",
        zip: billingAddress.zip || "",
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
    : {
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        address: "",
        city: "",
        state: "",
        country: "",
        zip: "",
        phone: userData.phone || null,
      };

  try {
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

    // ===== CALCULATE ORDER AGE ONCE =====
    const maxOrderAge = 24 * 60 * 60 * 1000; // 24 hours
    let orderAge = 0;

    if (existingOrder) {
      orderAge = Date.now() - existingOrder.createdAt.getTime();
    }

    // ===== PREVENT DUPLICATE PENDING ORDERS =====

    // If we have a pending order that's still valid, don't create a new one
    if (existingOrder && existingOrder.status === "PENDING") {
      console.log("Found existing pending order:", existingOrder.id);

      const orderAge = Date.now() - existingOrder.createdAt.getTime();
      const maxOrderAge = 24 * 60 * 60 * 1000; // 24 hours

      // If the pending order is still within 24 hours, return it instead of creating new
      if (orderAge <= maxOrderAge) {
        console.log(
          "Pending order is still valid, returning existing order details"
        );

        // Get or create checkout for the existing order
        let existingCheckoutForPending = existingCheckout;
        if (!existingCheckoutForPending) {
          existingCheckoutForPending = await prisma.checkout.create({
            data: {
              userId: user.id,
              clerkId: user.clerkId,
              orderId: existingOrder.id,
              sessionId: existingOrder.paymentId || uuidv4(),
              status: "COMPLETED",
              totalAmount: existingOrder.totalPrice,
              subtotal: existingOrder.subtotalPrice,
              taxAmount: existingOrder.totalTax,
              shippingAmount: existingOrder.totalShipping,
              discountAmount: existingOrder.totalDiscount,
              currency,
              shippingAddress: cleanShippingAddress,
              billingAddress: cleanBillingAddress,
              paymentMethod: "bank_transfer",
              paymentStatus: "UNPAID",
              couponId,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              items: {
                create: existingOrder.items.map((item) => ({
                  productId: item.productId,
                  title: item.title,
                  quantity: item.quantity,
                  // Sync pricing fields properly
                  fixedPrice: item.fixedPrice !== null ? item.fixedPrice : null,
                  unitPrice: item.unitPrice !== null ? item.unitPrice : null,
                  selectedUnit:
                    item.selectedUnit !== null ? item.selectedUnit : null,
                  totalPrice: item.totalPrice,
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

        // Bank account details
        const bankDetails = [
          {
            bankName: process.env.BANK_ONE_NAME || "",
            accountName: process.env.BANK_ONE_ACCOUNT_NAME || "",
            accountNumber: process.env.BANK_ONE_ACCOUNT_NUMBER || "",
            sortCode: process.env.BANK_ONE_SORT_CODE || "",
          },
          {
            bankName: process.env.BANK_TWO_NAME || "",
            accountName: process.env.BANK_TWO_ACCOUNT_NAME || "",
            accountNumber: process.env.BANK_TWO_ACCOUNT_NUMBER || "",
            sortCode: process.env.BANK_TWO_SORT_CODE || "",
          },
        ];

        // Create or get existing invoice
        let invoiceForPending;
        if (existingInvoice) {
          invoiceForPending = existingInvoice;
        } else {
          invoiceForPending = await prisma.invoice.create({
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
              companyPhone: process.env.COMPANY_PHONE || "+234 XXX XXX XXXX",
              companyEmail: process.env.COMPANY_EMAIL || "info@yourstore.com",
              issueDate: new Date(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              subtotal: existingOrder.subtotalPrice,
              taxAmount: existingOrder.totalTax,
              shippingAmount: existingOrder.totalShipping,
              discountAmount: existingOrder.totalDiscount,
              totalAmount: existingOrder.totalPrice,
              balanceAmount: existingOrder.totalPrice,
              paymentMethod: "bank_transfer",
              paymentStatus: "UNPAID",
              paymentReference: existingOrder.paymentId,
              terms:
                "Payment via bank transfer. Order will be processed once payment is verified.",
              footer: `Thank you for your business! Contact us at ${
                process.env.COMPANY_EMAIL || "info@yourstore.com"
              } for any questions.`,
              items: {
                create: existingOrder.items.map((item) => ({
                  productId: item.productId,
                  title: item.title,
                  quantity: item.quantity,
                  // Sync pricing fields properly for invoice
                  fixedPrice: item.fixedPrice !== null ? item.fixedPrice : null,
                  unitPrice: item.unitPrice !== null ? item.unitPrice : null,
                  selectedUnit:
                    item.selectedUnit !== null ? item.selectedUnit : null,
                  totalPrice: item.totalPrice,
                  taxRate: 0,
                  taxAmount: 0,
                })),
              },
            },
            include: {
              items: true,
            },
          });
        }

        // Create display invoice
        const pendingInvoiceDisplay = {
          id: invoiceForPending.id,
          invoiceNumber: existingOrder.orderNumber,
          orderDate: existingOrder.createdAt,
          dueDate: invoiceForPending.dueDate,
          status: invoiceForPending.status,
          customer: {
            name: `${userData.firstName} ${userData.lastName}`,
            email: userData.email,
            phone: userData.phone,
          },
          items: existingOrder.items.map((item) => ({
            name: item.title,
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.totalPrice,
          })),
          subtotal: existingOrder.subtotalPrice,
          tax: existingOrder.totalTax,
          shipping: existingOrder.totalShipping,
          discount: existingOrder.totalDiscount,
          total: existingOrder.totalPrice,
          currency: currency,
          bankDetails,
          deliveryInfo: {
            totalWeight,
            deliveryFee: existingOrder.totalShipping,
          },
          paymentInstructions: [
            `Transfer ₦${existingOrder.totalPrice.toLocaleString()} to any of the account details above`,
            `Use "${existingOrder.orderNumber}" as your payment reference/description`,
            `Send payment confirmation screenshot/receipt to ${
              process.env.SUPPORT_EMAIL || "support@yourstore.com"
            }`,
            "Payment will be verified and your order confirmed within 24 hours",
            "Your order status will be updated once payment is verified by our team",
          ],
        };

        return {
          success: true,
          isPendingOrder: true,
          checkout: existingCheckoutForPending,
          order: existingOrder,
          invoice: pendingInvoiceDisplay,
          showInvoice: true,
          message:
            "You already have a pending order! Please complete payment using the bank details below.",
          deliveryInfo: {
            totalWeight,
            deliveryFee: existingOrder.totalShipping,
          },
        };
      }
    }

    // ===== HANDLE EXISTING FAILED ORDERS =====
    // If we have a failed order or expired pending order
    if (
      existingOrder &&
      (existingOrder.status === "FAILED" || orderAge > maxOrderAge)
    ) {
      console.log(
        "Found existing failed/expired order:",
        existingOrder.id,
        "Status:",
        existingOrder.status
      );

      // Check if order is expired or failed
      if (orderAge > maxOrderAge || existingOrder.status === "FAILED") {
        console.log(
          "Order is expired or failed, cancelling and cleaning up..."
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

        // Delete related checkout if exists
        if (existingCheckout) {
          await prisma.checkout.delete({
            where: { id: existingCheckout.id },
          });
        }

        console.log("Expired/failed records cleaned up");
      } else {
        // This should not happen now since we handle pending orders above
        console.log("Unexpected order state, allowing retry");

        // For bank transfer, we simply return the existing order with bank details
        console.log(
          "Valid existing order found, returning bank transfer details"
        );

        // Generate new payment reference for retry
        const newPaymentReference = `PAY_${uuidv4()}_RETRY`;

        // Update order with new payment reference
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            paymentId: newPaymentReference,
            paymentStatus: "UNPAID",
          },
        });

        // Update or create checkout
        let checkoutForRetry;
        if (existingCheckout) {
          checkoutForRetry = await prisma.checkout.update({
            where: { id: existingCheckout.id },
            data: {
              status: "COMPLETED",
              sessionId: newPaymentReference,
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
              sessionId: newPaymentReference,
              status: "COMPLETED",
              totalAmount: existingOrder.totalPrice,
              subtotal: existingOrder.subtotalPrice,
              taxAmount: existingOrder.totalTax,
              shippingAmount: existingOrder.totalShipping,
              discountAmount: existingOrder.totalDiscount,
              currency,
              shippingAddress: cleanShippingAddress,
              billingAddress: cleanBillingAddress,
              paymentMethod: "bank_transfer",
              paymentStatus: "UNPAID",
              couponId,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              items: {
                create: existingOrder.items.map((item) => ({
                  productId: item.productId,
                  title: item.title,
                  quantity: item.quantity,
                  // Sync pricing fields properly
                  fixedPrice: item.fixedPrice !== null ? item.fixedPrice : null,
                  unitPrice: item.unitPrice !== null ? item.unitPrice : null,
                  selectedUnit:
                    item.selectedUnit !== null ? item.selectedUnit : null,
                  totalPrice: item.totalPrice,
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

        // Bank account details from environment variables
        const bankDetails = [
          {
            bankName: process.env.NEXT_PUBLIIC_BANK_ONE_NAME || "",
            accountName: process.env.NEXT_PUBLIIC_BANK_ONE_ACCOUNT_NAME || "",
            accountNumber:
              process.env.NEXT_PUBLIIC_BANK_ONE_ACCOUNT_NUMBER || "",
          },
          {
            bankName: process.env.NEXT_PUBLIIC_BANK_TWO_NAME || "",
            accountName: process.env.NEXT_PUBLIIC_BANK_TWOE_ACCOUNT_NAME || "",
            accountNumber:
              process.env.NEXT_PUBLIIC_BANK_TWO_ACCOUNT_NUMBER || "",
          },
        ];

        // Update or create invoice in database
        let invoiceForRetry;
        if (existingInvoice) {
          invoiceForRetry = await prisma.invoice.update({
            where: { id: existingInvoice.id },
            data: {
              paymentReference: newPaymentReference,
              paymentStatus: "UNPAID",
              status: "SENT",
            },
            include: {
              items: true,
            },
          });
        } else {
          // Create invoice for existing order
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
              companyPhone: process.env.COMPANY_PHONE || "+234 XXX XXX XXXX",
              companyEmail: process.env.COMPANY_EMAIL || "info@yourstore.com",
              issueDate: new Date(),
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              subtotal: existingOrder.subtotalPrice,
              taxAmount: existingOrder.totalTax,
              shippingAmount: existingOrder.totalShipping,
              discountAmount: existingOrder.totalDiscount,
              totalAmount: existingOrder.totalPrice,
              balanceAmount: existingOrder.totalPrice,
              paymentMethod: "bank_transfer",
              paymentStatus: "UNPAID",
              paymentReference: newPaymentReference,
              terms:
                "Payment via bank transfer. Order will be processed once payment is verified.",
              footer: `Thank you for your business! Contact us at ${
                process.env.COMPANY_EMAIL || "info@yourstore.com"
              } for any questions.`,
              items: {
                create: existingOrder.items.map((item) => ({
                  productId: item.productId,
                  title: item.title,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  taxRate: 0,
                  taxAmount: 0,
                })),
              },
            },
            include: {
              items: true,
            },
          });
        }

        // Create invoice display object for retry
        const retryInvoiceDisplay = {
          id: invoiceForRetry.id,
          invoiceNumber: existingOrder.orderNumber,
          orderDate: existingOrder.createdAt,
          dueDate: invoiceForRetry.dueDate,
          status: invoiceForRetry.status,
          customer: {
            name: `${userData.firstName} ${userData.lastName}`,
            email: userData.email,
            phone: userData.phone,
          },
          items: existingOrder.items.map((item) => ({
            name: item.title,
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.totalPrice,
          })),
          subtotal: existingOrder.subtotalPrice,
          tax: existingOrder.totalTax,
          shipping: existingOrder.totalShipping,
          discount: existingOrder.totalDiscount,
          total: existingOrder.totalPrice,
          currency: currency,
          bankDetails,
          deliveryInfo: {
            totalWeight,
            deliveryFee: existingOrder.totalShipping,
          },
          paymentInstructions: [
            `Transfer ₦${existingOrder.totalPrice.toLocaleString()} to any of the account details above`,
            `Use "${existingOrder.orderNumber}" as your payment reference/description`,
            `Send payment confirmation screenshot/receipt to ${
              process.env.SUPPORT_EMAIL || "support@yourstore.com"
            }`,
            "Payment will be verified and your order confirmed within 24 hours",
            "Your order status will be updated once payment is verified by our team",
          ],
        };

        return {
          success: true,
          isRetry: true,
          checkout: checkoutForRetry,
          order: existingOrder,
          invoice: retryInvoiceDisplay,
          showInvoice: true,
          paymentReference: newPaymentReference,
          message:
            "Order found! Please complete payment using the bank details below. Your order will be confirmed once payment is verified.",
          deliveryInfo: {
            totalWeight,
            deliveryFee: existingOrder.totalShipping,
          },
        };
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

    // Create checkout session
    const checkout = await prisma.checkout.create({
      data: {
        userId: user.id,
        clerkId: user.clerkId,
        sessionId: uuidv4(),
        status: CheckoutStatus.COMPLETED,
        totalAmount,
        subtotal: finalSubtotal,
        taxAmount: 0,
        shippingAmount: deliveryFee,
        discountAmount,
        currency,
        shippingAddress: cleanShippingAddress,
        billingAddress: cleanBillingAddress,
        paymentMethod: "bank_transfer",
        paymentStatus: PaymentStatus.UNPAID,
        couponId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            title: item.title,
            quantity: item.quantity,
            // Properly handle both pricing models
            fixedPrice: item.fixedPrice !== null ? item.fixedPrice : null,
            unitPrice: item.unitPrice !== null ? item.unitPrice : null,
            selectedUnit: item.selectedUnit !== null ? item.selectedUnit : null,
            totalPrice: item.totalPrice,
            // Include weight information if needed
            weight: item.weight,
            totalWeight: item.totalWeight,
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

    // Generate unique identifiers
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;
    const paymentReference = `PAY_${uuidv4()}`;

    // Create order with PENDING status for bank transfer (will be updated by admin)
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: user.id,
        clerkId: user.clerkId,
        email: userData.email,
        customerName:
          `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
          undefined,
        phone: userData.phone || "",
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        subtotalPrice: finalSubtotal,
        totalTax: 0,
        totalShipping: deliveryFee,
        totalDiscount: discountAmount,
        totalPrice: totalAmount,
        shippingAddress: cleanShippingAddress,
        paymentMethod: "bank_transfer",
        paymentId: paymentReference,
        items: {
          create: validatedItems.map((item) => ({
            product: { connect: { id: item.productId } },
            title: item.title,
            quantity: item.quantity,
            fixedPrice: item.fixedPrice !== null ? item.fixedPrice : null,
            unitPrice: item.unitPrice !== null ? item.unitPrice : null,
            selectedUnit: item.selectedUnit !== null ? item.selectedUnit : null,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });

    // Then add a runtime check
// After creating the order
if (!order.user) {
  throw new Error("Order created without user association");
}

try {
  if (order.user.email) {
    console.log("Sending order confirmation email to:", order.user.email);
    await emailService.sendOrderConfirmation(order.user, order);
    console.log("Order confirmation email sent successfully");
  } else {
    console.warn("No email found for order:", order.id);
  }
} catch (emailError) {
  console.error("Failed to send order confirmation email:", emailError);
}

    // Link checkout to order
    await prisma.checkout.update({
      where: { id: checkout.id },
      data: {
        orderId: order.id,
        paymentStatus: "UNPAID",
      },
    });

    // Bank account details from environment variables
    const bankDetails = [
      {
        bankName: process.env.NEXT_PUBLIIC_BANK_ONE_NAME || "",
        accountName: process.env.NEXT_PUBLIIC_BANK_ONE_ACCOUNT_NAME || "",
        accountNumber: process.env.NEXT_PUBLIIC_BANK_ONE_ACCOUNT_NUMBER || "",
      },
      {
        bankName: process.env.NEXT_PUBLIIC_BANK_TWO_NAME || "",
        accountName: process.env.NEXT_PUBLIIC_BANK_TWOE_ACCOUNT_NAME || "",
        accountNumber: process.env.NEXT_PUBLIIC_BANK_TWO_ACCOUNT_NUMBER || "",
      },
    ];

    // Create invoice in database
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
        companyAddress: process.env.COMPANY_ADDRESS || "Your Business Address",
        companyPhone: process.env.COMPANY_PHONE || "+234 XXX XXX XXXX",
        companyEmail: process.env.COMPANY_EMAIL || "info@yourstore.com",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subtotal: finalSubtotal,
        taxAmount: 0,
        shippingAmount: deliveryFee,
        discountAmount,
        totalAmount,
        balanceAmount: totalAmount,
        paymentMethod: "bank_transfer",
        paymentStatus: "UNPAID",
        paymentReference,
        terms:
          "Payment via bank transfer. Order will be processed once payment is verified.",
        footer: `Thank you for your business! Contact us at ${
          process.env.COMPANY_EMAIL || "info@yourstore.com"
        } for any questions.`,
        items: {
          create: validatedItems.map((item) => ({
            productId: item.productId,
            title: item.title, // Changed from 'name' to 'title' to match field
            quantity: item.quantity,
            // Sync all pricing fields from validateAndCalculate
            fixedPrice: item.fixedPrice !== null ? item.fixedPrice : null,
            unitPrice: item.unitPrice !== null ? item.unitPrice : null,
            selectedUnit: item.selectedUnit !== null ? item.selectedUnit : null,
            totalPrice: item.totalPrice,
            taxRate: 0,
            taxAmount: 0,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Create invoice display object with bank details
    const invoiceDisplay = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderDate: order.createdAt,
      dueDate: invoice.dueDate,
      status: invoice.status,
      customer: {
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        phone: userData.phone,
      },
      items: validatedItems.map((item) => ({
        name: item.title,
        quantity: item.quantity,
        price: item.price,
        total: item.totalPrice,
      })),
      subtotal: finalSubtotal,
      tax: 0,
      shipping: deliveryFee,
      discount: discountAmount,
      total: totalAmount,
      currency: currency,
      bankDetails,
      deliveryInfo: {
        totalWeight,
        deliveryFee,
      },
      paymentInstructions: [
        `Transfer ₦${totalAmount.toLocaleString()} to any of the account details above`,
        `Use "${orderNumber}" as your payment reference/description`,
        `Send payment confirmation screenshot/receipt to ${
          process.env.SUPPORT_EMAIL || "support@yourstore.com"
        }`,
        "Payment will be verified and your order confirmed within 24 hours",
        "Your order status will be updated once payment is verified by our team",
      ],
    };

    return {
      success: true,
      message:
        "Order created successfully! Please complete payment using the bank details below. Your order will be confirmed once payment is verified.",
      checkout,
      order,
      invoice: invoiceDisplay,
      showInvoice: true,
      deliveryInfo: {
        totalWeight,
        deliveryFee,
      },
    };
  } catch (error) {
    console.error("Error in handleBankTransferPayment:", error);

    // Clean up any created records if there was an error
    try {
      // Check if we have a checkout that was created but the process failed
      const orphanedCheckout = await prisma.checkout.findFirst({
        where: {
          clerkId: user.clerkId,
          status: { in: ["COMPLETED", "PROCESSING"] },
          orderId: null, // Checkout without an order
        },
        orderBy: { createdAt: "desc" },
      });

      if (orphanedCheckout) {
        console.log("Cleaning up orphaned checkout:", orphanedCheckout.id);
        await prisma.checkout.delete({
          where: { id: orphanedCheckout.id },
        });
      }

      // Check for any failed orders that were just created (within last 5 minutes)
      const recentFailedOrder = await prisma.order.findFirst({
        where: {
          clerkId: user.clerkId,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
          },
          status: { in: ["PENDING", "FAILED"] },
          paymentStatus: { in: ["PENDING", "FAILED", "UNPAID"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentFailedOrder) {
        console.log("Cleaning up recent failed order:", recentFailedOrder.id);

        // Update order status to failed
        await prisma.order.update({
          where: { id: recentFailedOrder.id },
          data: {
            status: "FAILED",
            paymentStatus: "FAILED",
          },
        });

        // Clean up associated checkout if exists
        const associatedCheckout = await prisma.checkout.findFirst({
          where: { orderId: recentFailedOrder.id },
        });

        if (associatedCheckout) {
          await prisma.checkout.update({
            where: { id: associatedCheckout.id },
            data: {
              status: "FAILED",
              paymentStatus: "FAILED",
            },
          });
        }

        // Clean up associated invoice if exists
        const associatedInvoice = await prisma.invoice.findUnique({
          where: { orderId: recentFailedOrder.id },
        });

        if (associatedInvoice) {
          await prisma.invoice.update({
            where: { id: associatedInvoice.id },
            data: {
              status: "CANCELLED",
              paymentStatus: "FAILED",
            },
          });
        }
      }

      console.log("Cleanup completed successfully");
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
      // Don't throw cleanup errors, just log them
    }

    // Properly handle the unknown error type
    if (error instanceof Error) {
      throw new Error(
        `Failed to process bank transfer payment: ${error.message}`
      );
    } else {
      throw new Error(
        `Failed to process bank transfer payment: ${String(error)}`
      );
    }
  }
}
