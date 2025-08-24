// app/api/wishlist/route.ts - Fixed with correct middleware usage
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { ProductStatus } from "@prisma/client";

// GET - Retrieve user's wishlist
export const GET = requireAuth(async (request: NextRequest) => {
  try {
    // Get user from the authenticated request
    const user = (request as any).user;
    const token = (request as any).token;

    console.log(`🛍️ GET wishlist for user: ${user.id} (has token: ${!!token})`);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    console.log("📄 Pagination:", { page, limit, skip });

    const [wishlistItems, total] = await Promise.all([
      prisma.wishlistItem.findMany({
        where: { userId: user.id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              category: true,
              slug: true,
              description: true,
              hasFixedPrice: true,
              priceType: true,
              fixedPrice: true,
              unitPrices: true, // Add this if you need unit prices
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.wishlistItem.count({
        where: { userId: user.id },
      }),
    ]);

    console.log(
      `✅ Found ${wishlistItems.length} wishlist items (${total} total)`
    );

    return NextResponse.json({
      success: true,
      items: wishlistItems,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("❌ Get wishlist error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch wishlist",
      },
      { status: 500 }
    );
  }
});

// POST - Add item to wishlist
export const POST = requireAuth(async (request: NextRequest) => {
  try {
    // Get user from the authenticated request
    const user = (request as any).user;
    const token = (request as any).token;

    console.log(
      `➕ POST wishlist for user: ${user.id} (has token: ${!!token})`
    );

    const body = await request.json();
    const { productId } = body;

    console.log("Product ID to add:", productId);

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    // Check if product exists and is active
    const product = await prisma.product.findUnique({
      where: {
        id: productId,
        status: ProductStatus.ACTIVE, // Filter condition goes in WHERE clause
      },
      select: {
        id: true,
        name: true,
        images: true,
        category: true,
        status: true, // Just true to select the field
        slug: true,
        hasFixedPrice: true,
        fixedPrice: true,
        unitPrices: true,
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

    if (!product.status || product.status !== ProductStatus.ACTIVE) {
      return NextResponse.json(
        {
          success: false,
          error: "Product is not available",
        },
        { status: 400 }
      );
    }

    // Check if item already exists in wishlist
    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Product already in wishlist",
          item: existingItem,
        },
        { status: 409 }
      );
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        productId: product.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            images: true,
            status: true, // Just true to select the field
            category: true,
            slug: true,
            hasFixedPrice: true,
            fixedPrice: true,
            unitPrices: true,
          },
        },
      },
    });

    console.log("✅ Added to wishlist:", wishlistItem.id);

    return NextResponse.json(
      {
        success: true,
        message: "Product added to wishlist",
        item: wishlistItem,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Add to wishlist error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add item to wishlist",
      },
      { status: 500 }
    );
  }
});



// PUT - Toggle wishlist item (add if not exists, remove if exists)
export const PUT = requireAuth(async (request: NextRequest) => {
  try {
    // Get user from the authenticated request
    const user = (request as any).user;
    const token = (request as any).token;

    console.log(
      `🔄 PUT wishlist toggle for user: ${user.id} (has token: ${!!token})`
    );

    const body = await request.json();
    const { productId } = body;

    console.log("Product ID to toggle:", productId);

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: "Product ID is required",
        },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        isActive: true,
        images: true,
        category: true,
        brand: true,
        slug: true,
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

    // Check if item already exists in wishlist
    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId,
        },
      },
    });

    if (existingItem) {
      // Remove from wishlist
      await prisma.wishlistItem.delete({
        where: { id: existingItem.id },
      });

      console.log("✅ Toggled OFF (removed):", existingItem.id);

      return NextResponse.json({
        success: true,
        message: "Product removed from wishlist",
        action: "removed",
        inWishlist: false,
        productId,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    } else {
      // Add to wishlist (only if product is active)
      if (!product.status || product.status !== ProductStatus.ACTIVE) {
        return NextResponse.json(
          {
            success: false,
            error: "Product is not available",
          },
          { status: 400 }
        );
      }

      const wishlistItem = await prisma.wishlistItem.create({
        data: {
          userId: user.id,
          productId,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              images: true,
              stock: true,
              category: true,
              brand: true,
              slug: true,
              isActive: true,
            },
          },
        },
      });

      console.log("✅ Toggled ON (added):", wishlistItem.id);

      return NextResponse.json({
        success: true,
        message: "Product added to wishlist",
        action: "added",
        item: wishlistItem,
        inWishlist: true,
        productId,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    }
  } catch (error) {
    console.error("❌ Toggle wishlist error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to toggle wishlist item",
      },
      { status: 500 }
    );
  }
});

// PATCH - Update wishlist item (for future use - notes, priority, etc.)
export const PATCH = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const token = (request as any).token;

    console.log(
      `🔧 PATCH wishlist for user: ${user.id} (has token: ${!!token})`
    );

    const body = await request.json();
    const { itemId, notes, priority } = body;

    if (!itemId) {
      return NextResponse.json(
        {
          success: false,
          error: "Item ID is required",
        },
        { status: 400 }
      );
    }

    // Check if item exists and belongs to user
    const existingItem = await prisma.wishlistItem.findFirst({
      where: {
        id: itemId,
        userId: user.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Wishlist item not found",
        },
        { status: 404 }
      );
    }

    // Update the item
    const updatedItem = await prisma.wishlistItem.update({
      where: { id: itemId },
      data: {
        ...(notes !== undefined && { notes }),
        ...(priority !== undefined && { priority }),
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            category: true,
            slug: true,
          },
        },
      },
    });

    console.log("✅ Updated wishlist item:", updatedItem.id);

    return NextResponse.json({
      success: true,
      message: "Wishlist item updated",
      item: updatedItem,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("❌ Update wishlist item error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update wishlist item",
      },
      { status: 500 }
    );
  }
});

// DELETE - Remove item from wishlist
export const DELETE = requireAuth(async (request: NextRequest) => {
  try {
    // Get user from the authenticated request
    const user = (request as any).user;


    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const itemId = searchParams.get("itemId");

    console.log("Delete params:", { productId, itemId });

    if (!productId && !itemId) {
      return NextResponse.json(
        {
          success: false,
          error: "Either productId or itemId is required",
        },
        { status: 400 }
      );
    }

    let deleteCondition: any = { userId: user.id };

    if (itemId) {
      deleteCondition.id = itemId;
    } else if (productId) {
      deleteCondition.productId = productId;
    }

    // Check if item exists
    const existingItem = await prisma.wishlistItem.findFirst({
      where: deleteCondition,
    });

    if (!existingItem) {
      return NextResponse.json(
        {
          success: false,
          error: "Wishlist item not found",
        },
        { status: 404 }
      );
    }

    // Remove from wishlist
    await prisma.wishlistItem.delete({
      where: { id: existingItem.id },
    });

    console.log("✅ Removed from wishlist:", existingItem.id);

    return NextResponse.json({
      success: true,
      message: "Product removed from wishlist",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("❌ Remove from wishlist error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove item from wishlist",
      },
      { status: 500 }
    );
  }
});
