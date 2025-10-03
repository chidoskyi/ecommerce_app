// app/api/carts/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
// import { CartItem } from "@/types/carts";
// import { Product } from "@/types/products";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { CategoryStatus, PriceType, Prisma, ProductStatus } from "@prisma/client";

function generateGuestId() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 12);
  return `guest_${timestamp}_${randomStr}`;
}




export type CartItemWithProduct = {
  id: string;
  clerkId: string | null;
  guestId: string | null;
  productId: string;
  quantity: number;
  selectedUnit: string | null;
  unitPrice: number | null;
  fixedPrice: number | null;
  weight: number | null;
  totalWeight: number | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  product: {
    id: string;
    name: string;
    status: ProductStatus;
    rating: number | null;
    images: string[];
    fixedPrice: number;
    weight: number | null;
    description: string | null;
    slug: string;
    hasFixedPrice: boolean;
    priceType: PriceType;
    categoryId: string | null;
    createdAt: Date;
    updatedAt: Date;
    // ... other product fields
    category: {
      id: string;
      name: string;
      status: CategoryStatus;
      createdAt: Date;
      updatedAt: Date;
      description: string | null;
      slug: string;
      image: string | null;
    } | null;
    unitPrices: {
      unit: string;
      price: number;
    }[];
  };
};

// helper function
export const getCart = async (
  clerkId: string | null,
  guestId: string | null
): Promise<{
  cartItems: CartItemWithProduct[];
  clerkId: string | null;
}> => {
  console.log(
    `[getCart] Searching for cart - clerkId: ${clerkId}, guestId: ${guestId}`
  );

  let whereCondition = {};

  if (clerkId) {
    whereCondition = { clerkId };
  } else if (guestId) {
    whereCondition = { guestId };
  }

  const cartItems = await prisma.cartItem.findMany({
    where: whereCondition,
    include: {
      product: {
        include: {
          category: true,
          // unitPrices: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    cartItems,
    clerkId,
  };
};

export const findExistingCartItem = async (
  clerkId: string | null,
  guestId: string | null,
  productId: string,
  hasFixedPrice: boolean,
  unit?: string
) => {
  const baseCondition = clerkId
    ? { clerkId, productId }
    : { guestId, productId };

  const whereCondition = hasFixedPrice
    ? baseCondition
    : { ...baseCondition, selectedUnit: unit };

  return await prisma.cartItem.findFirst({
    where: whereCondition,
  });
};

export const calculateCartSummary = (cartItems: CartItemWithProduct[]) => {
  const subtotal = cartItems.reduce((sum, item) => {
    let itemPrice = 0;

    if (item.fixedPrice !== null && item.fixedPrice !== undefined) {
      itemPrice = item.fixedPrice;
    } else if (item.unitPrice !== null && item.unitPrice !== undefined) {
      itemPrice = item.unitPrice;
    } else if (item.product?.fixedPrice) {
      itemPrice = item.product.fixedPrice;
    }

    return sum + Number(itemPrice) * item.quantity;
  }, 0);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const totalWeight = cartItems.reduce((sum, item) => {
    const weight = item.product?.weight;
    // Check if it's a number (including floats)
    const numericWeight =
      typeof weight === "number" && !isNaN(weight) ? weight : 0;
    return sum + numericWeight * item.quantity;
  }, 0);

  return { subtotal, itemCount, totalWeight };
};

export const validatePricingData = (
  product: CartItemWithProduct["product"],
  unit: string | null | undefined, // Accept both null and undefined
  price: number | null
) => {
  if (product.hasFixedPrice) {
    return product.fixedPrice !== null && product.fixedPrice !== undefined;
  } else {
    return unit && price && price > 0;
  }
};

// Transform cart items to match frontend expectations
export const transformCartItems = (cartItems: CartItemWithProduct[]) => {
  return cartItems.map((item) => ({
    ...item,
    weight: item.product?.weight || 0, // Include weight from product
    totalWeight: (Number(item.product?.weight) || 0) * item.quantity, // Calculate total weight
    selectedUnit:
      item.selectedUnit && item.unitPrice
        ? {
            unit: item.selectedUnit,
            price: item.unitPrice,
          }
        : undefined,
  }));
};

// GET - Retrieve cart
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const guestId = searchParams.get("guestId");
    const clerkUserId = searchParams.get("userId"); // Still using userId param name for consistency

    // If no user and no guestId, return empty cart
    if (!clerkUserId && !guestId) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          subtotal: 0,
          itemCount: 0,
          totalWeight: 0,
          isAuthenticated: false,
          user: null,
          guestId: null,
        },
        message: "Empty cart",
      });
    }

    // Get cart with clerkId directly
    const { cartItems, clerkId } = await getCart(clerkUserId, guestId);
    const transformedItems = transformCartItems(cartItems);
    const { subtotal, itemCount, totalWeight } =
      calculateCartSummary(cartItems);

    return NextResponse.json({
      success: true,
      data: {
        items: transformedItems,
        subtotal,
        itemCount,
        totalWeight, // Include total weight in response
        isAuthenticated: !!clerkUserId,
        user: clerkUserId
          ? {
              clerkId: clerkId,
              userId: clerkId, // For backward compatibility
            }
          : null,
        guestId,
      },
    });
  } catch (error) {
    console.error("[CARTS_GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
};

// POST - Add item to cart
export async function POST(req: NextRequest) {
  try {
    const {
      productId,
      quantity = 1,
      userId: clerkUserId,
      guestId,
      price,
      unit,
    } = await req.json();

    // Validation
    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Quantity must be greater than 0",
        },
        { status: 400 }
      );
    }

    // Generate guestId if neither clerkUserId nor guestId provided
    let finalGuestId = guestId;
    if (!clerkUserId && !guestId) {
      finalGuestId = generateGuestId();
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        // unitPrices: true
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 }
      );
    }

    // Validate pricing data
    if (!validatePricingData(product, unit, price)) {
      console.error("Invalid pricing data:", {
        hasFixedPrice: product.hasFixedPrice,
        fixedPrice: product.fixedPrice,
        unit,
        price,
        unitPrices: product.unitPrices,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pricing data provided",
        },
        { status: 400 }
      );
    }

    // Check for existing cart item
    const existingCartItem = await findExistingCartItem(
      clerkUserId,
      finalGuestId,
      productId,
      product.hasFixedPrice,
      unit
    );

    let cartItem;

    if (existingCartItem) {
      // Update existing cart item
      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + quantity,
        },
        include: {
          product: {
            include: {
              category: true,
              // unitPrices: true
            },
          },
        },
      });
    } else {
      // Create new cart item using Prisma's proper relationship syntax
      const createData: Prisma.CartItemCreateInput = {
        quantity,
        product: {
          connect: { id: productId }
        },
      };
    
      // Set user or guest identification
      if (clerkUserId) {
        createData.clerkId = clerkUserId;
        createData.guestId = null;
      } else {
        createData.clerkId = null;
        createData.guestId = finalGuestId;
      }
    
      // Add pricing data
      if (product.hasFixedPrice) {
        createData.fixedPrice = product.fixedPrice;
      } else {
        createData.selectedUnit = unit;
        createData.unitPrice = price;
      }
    
      cartItem = await prisma.cartItem.create({
        data: createData,
        include: {
          product: {
            include: {
              category: true,
              // unitPrices: true,
            },
          },
        },
      });
    }

    // Get updated cart summary using getCart helper
    const { cartItems } = await getCart(clerkUserId, finalGuestId);
    const transformedItems = transformCartItems(cartItems);
    const { subtotal, itemCount, totalWeight } =
      calculateCartSummary(cartItems);

    return NextResponse.json({
      success: true,
      data: {
        cartItem,
        cartSummary: {
          items: transformedItems,
          subtotal,
          itemCount,
          totalWeight,
          isAuthenticated: !!clerkUserId,
          userId: clerkUserId, // For backward compatibility
          guestId: finalGuestId,
        },
      },
      message: `Item added to ${
        clerkUserId ? "user" : "guest"
      } cart successfully`,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export const PUT = async (req: NextRequest) => {
  console.log("🔥 PUT API route called");

  try {
    const body = await req.json();
    console.log("📦 Request body:", JSON.stringify(body, null, 2));

    const { cartItemId, quantity, userId: clerkUserId, guestId } = body;

    // Validate required fields
    if (!cartItemId || quantity === undefined) {
      console.log("❌ Missing required fields:", { cartItemId, quantity });
      return NextResponse.json(
        {
          success: false,
          error: "Cart item ID and quantity are required",
        },
        { status: 400 }
      );
    }

    if (!clerkUserId && !guestId) {
      console.log("❌ Missing user identification:", { clerkUserId, guestId });
      return NextResponse.json(
        {
          success: false,
          error: "Either userId or guestId is required",
        },
        { status: 400 }
      );
    }

    // Build where condition using clerkId
    const whereCondition: Record<
      string,
      string | number | boolean | object | undefined
    > = { id: cartItemId };
    if (clerkUserId) {
      whereCondition.clerkId = clerkUserId;
    } else {
      whereCondition.guestId = guestId;
    }

    console.log("🔍 Where condition:", JSON.stringify(whereCondition, null, 2));

    // Check if cart item exists before updating
    const existingItem = await prisma.cartItem.findFirst({
      where: whereCondition,
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingItem) {
      console.log("❌ Cart item not found with condition:", whereCondition);
      return NextResponse.json(
        {
          success: false,
          error: "Cart item not found",
        },
        { status: 404 }
      );
    }

    console.log("✅ Found existing item:", {
      id: existingItem.id,
      currentQuantity: existingItem.quantity,
      productName: existingItem.product?.name,
      clerkId: existingItem.clerkId,
      guestId: existingItem.guestId,
    });

    let updatedItem;

    if (quantity <= 0) {
      console.log("🗑️ Deleting item (quantity <= 0)");
      await prisma.cartItem.delete({
        where: { id: cartItemId },
      });
      console.log("✅ Item deleted successfully");
    } else {
      console.log("🔄 Updating item quantity to:", quantity);

      updatedItem = await prisma.cartItem.update({
        where: { id: cartItemId },
        data: {
          quantity: parseInt(quantity.toString()),
          updatedAt: new Date(),
        },
        include: {
          product: {
            include: {
              category: true,
              // unitPrices: true,
            },
          },
        },
      });

      console.log("✅ Item updated successfully:", {
        id: updatedItem.id,
        newQuantity: updatedItem.quantity,
        updatedAt: updatedItem.updatedAt,
      });
    }

    // Fetch updated cart using clerkId
    console.log("📊 Fetching updated cart...");
    const { cartItems } = await getCart(clerkUserId, guestId);
    console.log("📋 Cart items count:", cartItems.length);

    const transformedItems = transformCartItems(cartItems);
    const { subtotal, itemCount, totalWeight } =
      calculateCartSummary(cartItems);

    console.log("💰 Cart summary:", { subtotal, itemCount });

    const response = {
      success: true,
      data: {
        items: transformedItems,
        subtotal,
        itemCount,
        totalWeight,
        isAuthenticated: !!clerkUserId,
        userId: clerkUserId, // For backward compatibility
        guestId,
      },
      message:
        quantity <= 0
          ? "Item removed from cart"
          : "Cart item updated successfully",
    };

    console.log("🎉 Sending response:", {
      success: response.success,
      itemCount: response.data.itemCount,
      message: response.message,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("💥 Cart PUT API error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      code:
        error instanceof PrismaClientKnownRequestError
          ? error.code
          : "Unknown code",
    });

    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          success: false,
          error: "Cart item not found or already deleted",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `Database error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
};

// DELETE - Remove items or clear cart
export const DELETE = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const cartItemId = searchParams.get("cartItemId");
    const clearCart = searchParams.get("clearCart");
    const reduceQuantity = searchParams.get("reduceQuantity");
    const userId = searchParams.get("userId"); // This will be clerkId
    const guestId = searchParams.get("guestId");

    // Validate that we have either userId (clerkId) or guestId
    if (!userId && !guestId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either userId or guestId is required",
        },
        { status: 400 }
      );
    }

    if (clearCart === "true") {
      // Clear entire cart using clerkId
      const whereCondition = userId ? { clerkId: userId } : { guestId };

      const deletedCount = await prisma.cartItem.deleteMany({
        where: whereCondition,
      });

      return NextResponse.json({
        success: true,
        data: {
          items: [],
          subtotal: 0,
          itemCount: 0,
          totalWeight: 0,
          isAuthenticated: !!userId,
          userId,
          guestId,
        },
        message: "Cart cleared successfully",
        deletedCount: deletedCount.count,
      });
    } else if (cartItemId && reduceQuantity === "true") {
      // Reduce quantity by 1
      const whereCondition = userId
        ? { id: cartItemId, clerkId: userId }
        : { id: cartItemId, guestId };

      const cartItem = await prisma.cartItem.findFirst({
        where: whereCondition,
      });

      if (!cartItem) {
        return NextResponse.json(
          {
            success: false,
            error: "Cart item not found",
          },
          { status: 404 }
        );
      }

      if (cartItem.quantity > 1) {
        await prisma.cartItem.update({
          where: { id: cartItemId },
          data: { quantity: cartItem.quantity - 1 },
        });
      } else {
        // If quantity is 1, remove the item
        await prisma.cartItem.delete({
          where: { id: cartItemId },
        });
      }

      // Return updated cart summary
      const { cartItems } = await getCart(userId, guestId);
      const transformedItems = transformCartItems(cartItems);
      const { subtotal, itemCount, totalWeight } =
        calculateCartSummary(cartItems);

      return NextResponse.json({
        success: true,
        data: {
          items: transformedItems,
          subtotal,
          itemCount,
          totalWeight,
          isAuthenticated: !!userId,
          userId,
          guestId,
        },
        message:
          cartItem.quantity > 1
            ? "Quantity reduced by 1"
            : "Item removed from cart",
      });
    } else if (cartItemId) {
      // Delete specific item entirely
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const whereCondition = userId
        ? { id: cartItemId, clerkId: userId }
        : { id: cartItemId, guestId };

      await prisma.cartItem.delete({
        where: { id: cartItemId }, // Use direct ID for delete
      });

      // Return updated cart summary
      const { cartItems } = await getCart(userId, guestId);
      const transformedItems = transformCartItems(cartItems);
      const { subtotal, itemCount, totalWeight } =
        calculateCartSummary(cartItems);

      return NextResponse.json({
        success: true,
        data: {
          items: transformedItems,
          subtotal,
          itemCount,
          totalWeight,
          isAuthenticated: !!userId,
          userId,
          guestId,
        },
        message: "Item removed from cart",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Valid parameters not provided",
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error("Cart DELETE API error:", error);

    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json(
        {
          success: false,
          error: "Cart item not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
};
