import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  getCart,
  findExistingCartItem,
  validatePricingData,
  transformCartItems,
  calculateCartSummary,
} from "../route";

export const POST = requireAuth(async (req: NextRequest) => {
  let requestBody: any = null;
  
  try {
    const user = (req as any).user;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Read request body once and store it
    requestBody = await req.json();
    const { guestId } = requestBody;
    
    if (!guestId) {
      return NextResponse.json(
        { success: false, error: "Guest ID is required" },
        { status: 400 }
      );
    }

    const clerkUserId = user.clerkId;

    // Find both carts in parallel using helper functions
    const [guestCartResult, userCartResult] = await Promise.all([
      getCart(null, guestId),
      getCart(clerkUserId, null)
    ]);

    const guestCart = guestCartResult.cartItems;
    const userCart = userCartResult.cartItems;

    // If no guest cart items, return user cart
    if (guestCart.length === 0) {
      const { subtotal, itemCount, totalWeight } = calculateCartSummary(userCart);
      return NextResponse.json({
        success: true,
        data: { 
          items: transformCartItems(userCart),
          subtotal,
          itemCount,
          totalWeight
        },
        message: "No guest items to merge"
      });
    }

    // If user has no cart, simply convert guest items to user items
    if (userCart.length === 0) {
      await prisma.cartItem.updateMany({
        where: { guestId },
        data: { 
          clerkId: clerkUserId,
          guestId: null
        }
      });

      const { cartItems: updatedCart } = await getCart(clerkUserId, null);
      const { subtotal, itemCount, totalWeight } = calculateCartSummary(updatedCart);

      return NextResponse.json({
        success: true,
        data: { 
          items: transformCartItems(updatedCart),
          subtotal,
          itemCount,
          totalWeight
        },
        message: "Guest cart converted to user cart"
      });
    }

    // Merge carts using transaction following business rules:
    // 1. If product exists in both carts → sum quantities
    // 2. If product only in guest cart → add to user cart
    // 3. If product only in user cart → keep it (no action needed)
    await prisma.$transaction(async (tx) => {
      for (const guestItem of guestCart) {
        try {
          // Validate pricing data before processing
          if (!validatePricingData(guestItem.product, guestItem.selectedUnit, guestItem.unitPrice)) {
            console.warn(`Skipping item ${guestItem.id} due to invalid pricing data`);
            // Delete invalid guest item and continue
            await tx.cartItem.delete({ where: { id: guestItem.id } });
            continue;
          }

          // Business Rule Check: Use helper but also do direct check for constraint fields
          // The helper function logic might not match the database constraint exactly
          const [helperResult, directResult] = await Promise.all([
            findExistingCartItem(
              clerkUserId,
              null,
              guestItem.productId,
              guestItem.product.hasFixedPrice,
              guestItem.selectedUnit
            ),
            // Direct check that matches your application's clerkId logic
            tx.cartItem.findFirst({
              where: {
                clerkId: clerkUserId,
                productId: guestItem.productId,
                selectedUnit: guestItem.selectedUnit
              }
            })
          ]);

          // Use direct result as it matches the constraint exactly
          const existingUserItem = directResult || helperResult;

          if (existingUserItem) {
            // Business Rule 1: Product exists in both carts → sum quantities
            console.log(`Merging quantities for product ${guestItem.productId}: ${existingUserItem.quantity} + ${guestItem.quantity}`);
            
            await tx.cartItem.update({
              where: { id: existingUserItem.id },
              data: { 
                quantity: existingUserItem.quantity + guestItem.quantity 
              }
            });
          } else {
            // Business Rule 2: Product only in guest cart → add to user cart
            console.log(`Adding new product ${guestItem.productId} to user cart`);
            
            await tx.cartItem.create({
              data: {
                productId: guestItem.productId,
                clerkId: clerkUserId,
                quantity: guestItem.quantity,
                selectedUnit: guestItem.selectedUnit,
                fixedPrice: guestItem.fixedPrice,
                unitPrice: guestItem.unitPrice
              }
            });
          }

          // Clean up: Remove guest item after processing
          await tx.cartItem.delete({
            where: { id: guestItem.id }
          });

        } catch (itemError) {
          console.error(`Error processing guest item ${guestItem.id}:`, itemError);
          // Re-throw to abort the transaction - we want all-or-nothing behavior
          throw itemError;
        }
      }

      // Business Rule 3: Products only in user cart are kept automatically
      // (no action needed - they remain unchanged)
    });

    // Get final merged cart using helper function
    const { cartItems: mergedCart } = await getCart(clerkUserId, null);
    const { subtotal, itemCount, totalWeight } = calculateCartSummary(mergedCart);

    return NextResponse.json({
      success: true,
      data: { 
        items: transformCartItems(mergedCart),
        subtotal,
        itemCount,
        totalWeight
      },
      message: "Carts merged successfully"
    });

  } catch (error: any) {
    console.error("Cart merge error:", error);
    
    // Additional cleanup attempt if main transaction fails
    try {
      if (requestBody?.guestId) {
        // Try to clean up guest items to prevent future conflicts
        await prisma.cartItem.deleteMany({
          where: { guestId: requestBody.guestId }
        });
        console.log(`Emergency cleanup: deleted guest items for guestId: ${requestBody.guestId}`);
      }
    } catch (cleanupError) {
      console.error("Emergency cleanup failed:", cleanupError);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: process.env.NODE_ENV === "development" 
          ? error.message 
          : "Failed to merge carts"
      },
      { status: 500 }
    );
  }
});

// Prevent other HTTP methods
export const GET = () => 
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });

export const PUT = () => 
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });

export const DELETE = () => 
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });