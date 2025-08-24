import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AuthenticatedRequest, requireAdmin, requireAuth } from "@/lib/auth";

// GET - Retrieve a specific order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Fetch order with all required relations
    const order = await prisma.order.findFirst({
      where: {
        id,
        OR: [
          { userId: user.id }, // Match by user ID
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
}


// PUT - Update order status (admin only for most fields)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First check admin status
    const adminCheck = await requireAdmin(request);
    if (adminCheck) {
      return adminCheck; // Returns the error response if not admin
    }

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { status, paymentStatus, notes, trackingNumber, paymentProof } =
      await request.json();

    // Find the order (admin can access any order)
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Build update data - admin can update anything
    const updateData: any = {};

    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (notes !== undefined) updateData.notes = notes;
    if (trackingNumber !== undefined)
      updateData.trackingNumber = trackingNumber;
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
    });
  } catch (error) {
    console.error("Update order error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Cancel order (user can only cancel their own pending orders)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First check auth status
    const authCheck = await requireAuth(request);
    if (authCheck) {
      return authCheck; // Returns the error response if not admin
    }

    const user = await (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the order
    const existingOrder = await prisma.order.findFirst({
      where: {
        id,
        userId: user.clerkId,
      },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order can be cancelled
    if (existingOrder.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "Only pending orders can be cancelled",
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
      },
    });

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
