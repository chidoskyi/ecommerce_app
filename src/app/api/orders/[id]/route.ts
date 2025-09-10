import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { type AuthenticatedRequest, requireAdminDynamic, requireAuthDynamic, RouteContext } from "@/lib/auth";

// =============================================================================
// GET - Retrieve a specific order (Users can only see their own orders)
// =============================================================================
export const GET = requireAuthDynamic(async (
  request: AuthenticatedRequest,
  ctx: RouteContext
) => {
  try {
    const user = request.user;
    const { id } = await ctx.params;

    // Fetch order with all required relations
    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id }, // Match by database user ID
          { clerkId: user.clerkId } // Or by clerkId for backward compatibility
        ]
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                category: {
                  select: {
                    id: true,
                    name: true
                  }
                },
                unitPrices: true,
                weight: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true
          }
        },
        Invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            createdAt: true
          }
        },
        checkout: {
          select: {
            id: true,
            status: true,
            paymentMethod: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Transform order items with all required fields
    const transformedOrder = {
      ...order,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        title: item.title || item.product?.name || 'Unknown Product',
        name: item.title || item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.fixedPrice || item.unitPrice || 0,
        fixedPrice: item.fixedPrice,
        unitPrice: item.unitPrice,
        selectedUnit: item.selectedUnit,
        totalPrice: item.totalPrice,
        image: item.product?.images?.[0] || null,
        unit: item.selectedUnit || item.product?.unitPrices?.find(up => up.unit === item.selectedUnit)?.unit || null,
        category: item.product?.category?.name || null,
        weight: item.product?.weight || null,
        product: item.product // Include full product details if needed
      }))
    };

    return NextResponse.json({
      success: true,
      data: transformedOrder
    });

  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// PUT - Update order status (Admin only - ADMIN and MODERATOR roles)
// =============================================================================
export const PUT = requireAdminDynamic(async (
  request: AuthenticatedRequest,
  ctx: RouteContext
) => {
  try {
    const admin = request.user; // This is guaranteed to be ADMIN or MODERATOR
    const { id } = await ctx.params;

    const { status, paymentStatus, notes, trackingNumber, paymentProof } =
      await request.json();

    // Find the order (admin can access any order)
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ 
        success: false, 
        error: "Order not found" 
      }, { status: 404 });
    }

    // Build update data - admin can update anything
    const updateData: Record<string, string | number | boolean | object | undefined> = {};

    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (notes !== undefined) updateData.notes = notes;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (paymentProof !== undefined) updateData.paymentProof = paymentProof;

    // Add timestamps based on status changes
    if (status) {
      switch (status) {
        case "PROCESSING":
          updateData.processedAt = new Date();
          break;
        case "SHIPPED":
          updateData.shippedAt = new Date();
          break;
        case "DELIVERED":
          updateData.deliveredAt = new Date();
          break;
        case "CANCELLED":
          updateData.cancelledAt = new Date();
          break;
      }
    }

    // Add payment timestamps
    if (paymentStatus === "PAID") {
      updateData.paidAt = new Date();
    }

    // If no updates provided, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No updates provided",
        },
        { status: 400 }
      );
    }

    // Add audit trail
    updateData.lastModifiedBy = admin.id;
    updateData.lastModifiedAt = new Date();

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
          },
        },
        Invoice: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: "Order updated successfully",
      modifiedBy: admin.email // Include who made the change
    });
  } catch (error: unknown) {
    console.error("Update order error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
});

// =============================================================================
// DELETE - Cancel order (Users can only cancel their own pending orders)
// =============================================================================
export const DELETE = requireAuthDynamic(async (
  request: AuthenticatedRequest,
  ctx: RouteContext
) => {
  try {
    const user = request.user;
    const { id } = await ctx.params;

    // Find the order - user can only access their own orders
    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id }, // Match by database user ID
          { clerkId: user.clerkId } // Or by clerkId for backward compatibility
        ]
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ 
        success: false, 
        error: "Order not found" 
      }, { status: 404 });
    }

    // Check if order can be cancelled
    if (existingOrder.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          error: "Only pending orders can be cancelled",
          currentStatus: existingOrder.status
        },
        { status: 400 }
      );
    }

    // Update order status to cancelled
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        // cancelledBy: user.id // Track who cancelled it
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
      cancelledBy: user.email
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
});