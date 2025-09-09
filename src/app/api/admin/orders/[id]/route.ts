import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { type AuthenticatedRequest, requireAdminDynamic, requireAuthDynamic, RouteContext } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// =============================================================================
// GET - Retrieve a specific order (Admins see all, Users see only their own)
// =============================================================================
export const GET = requireAuthDynamic(
  async (
    request: AuthenticatedRequest,
    ctx: RouteContext
  ) => {
    try {
      const user = request.user;
      const params = await ctx.params; // Await the params promise first
      const { id } = params; // Then destructure

    // Check if user is admin
    const isAdmin = user.role === "ADMIN" || user.role === "MODERATOR";

    // Build where clause based on user role
    const whereClause: Prisma.OrderWhereInput = { id };

    if (!isAdmin) {
      // Non-admin users can only access their own orders
      whereClause.OR = [
        { userId: user.id },
        { clerkId: user.clerkId }
      ];
    }

    // Fetch order with all required relations
    const order = await prisma.order.findFirst({
      where: whereClause,
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
                    name: true,
                  },
                },
                unitPrices: true,
                weight: true,
              },
            },
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
        Invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            createdAt: true,
          },
        },
        checkout: {
          select: {
            id: true,
            status: true,
            paymentMethod: true,
          },
        },
      },
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
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.title || item.product?.name || "Unknown Product",
        name: item.title || item.product?.name || "Unknown Product",
        quantity: item.quantity,
        price: item.fixedPrice || item.unitPrice || 0,
        fixedPrice: item.fixedPrice,
        unitPrice: item.unitPrice,
        selectedUnit: item.selectedUnit,
        totalPrice: item.totalPrice,
        image: item.product?.images?.[0] || null,
        unit:
          item.selectedUnit ||
          item.product?.unitPrices?.find((up) => up.unit === item.selectedUnit)
            ?.unit ||
          null,
        category: item.product?.category?.name || null,
        weight: item.product?.weight || null,
        product: item.product,
      })),
    };

    return NextResponse.json({
      success: true,
      data: transformedOrder,
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
export const PUT = requireAdminDynamic(
  async (
    request: AuthenticatedRequest,
    ctx: RouteContext
  ) => {
    try {
      const admin = request.user;
      const params = await ctx.params; // Await the params promise first
      const { id } = params; // Then destructure

    const {
      status,
      paymentStatus,
      notes,
      shippingAddress,
    } = await request.json();

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
    const updateData: Prisma.OrderUpdateInput = {};

    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (notes !== undefined) updateData.notes = notes;
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress;
    
    // Add timestamps based on status changes
    if (status) {
      switch (status) {
        case "PROCESSING":
        case "CONFIRMED":
          updateData.processedAt = new Date();
          // Auto-mark as paid when confirming/processing the order if not already paid
          if (existingOrder.paymentStatus !== "PAID") {
            updateData.paymentStatus = "PAID";
            updateData.paidAt = new Date();
          }
          break;
        case "SHIPPED":
          updateData.shippedAt = new Date();
          // Ensure payment is marked as paid when shipping
          if (existingOrder.paymentStatus !== "PAID") {
            updateData.paymentStatus = "PAID";
            updateData.paidAt = new Date();
          }
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

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
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
                    name: true,
                  },
                },
                unitPrices: true,
                weight: true,
              },
            },
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
        Invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            createdAt: true,
          },
        },
        checkout: {
          select: {
            id: true,
            status: true,
            paymentMethod: true,
          },
        },
      },
    });

    // Transform the updated order
    const transformedOrder = {
      ...order,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.title || item.product?.name || "Unknown Product",
        name: item.title || item.product?.name || "Unknown Product",
        quantity: item.quantity,
        price: item.fixedPrice || item.unitPrice || 0,
        fixedPrice: item.fixedPrice,
        unitPrice: item.unitPrice,
        selectedUnit: item.selectedUnit,
        totalPrice: item.totalPrice,
        image: item.product?.images?.[0] || null,
        unit:
          item.selectedUnit ||
          item.product?.unitPrices?.find((up) => up.unit === item.selectedUnit)
            ?.unit ||
          null,
        category: item.product?.category?.name || null,
        weight: item.product?.weight || null,
        product: item.product,
      })),
    };

    return NextResponse.json({
      success: true,
      data: transformedOrder,
      message: "Order updated successfully",
      modifiedBy: admin.email // Include who made the change
    });
  } catch (error) {
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
// DELETE - Cancel order (Admin only)
// =============================================================================
export const DELETE = requireAdminDynamic(
  async (
    request: AuthenticatedRequest,
    ctx: RouteContext
  ) => {
    try {
      const admin = request.user;
      const params = await ctx.params; // Await the params promise first
      const { id } = params; // Then destructure

    // Check if order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        Invoice: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if order can be cancelled (not already shipped/delivered)
    if (["SHIPPED", "DELIVERED"].includes(existingOrder.status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot cancel order that has been shipped or delivered",
          currentStatus: existingOrder.status
        },
        { status: 400 }
      );
    }

    // Update order status to cancelled instead of deleting
    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        // cancelledBy: admin.id, // Track who cancelled it
        notes: existingOrder.notes
          ? `${existingOrder.notes}\n\nOrder cancelled by admin (${admin.email}) on ${new Date().toISOString()}`
          : `Order cancelled by admin (${admin.email}) on ${new Date().toISOString()}`,
      },
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
      data: cancelledOrder,
      message: "Order cancelled successfully",
      cancelledBy: admin.email // Include who cancelled it
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