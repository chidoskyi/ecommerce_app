// /api/checkout/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, AuthenticatedRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
        // First check auth status
        const authCheck = await requireAuth(request);
        if (authCheck) {
          return authCheck;
        }
    
        const user = (request as AuthenticatedRequest).user;
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }

      const checkout = await prisma.checkout.findUnique({
        where: {
          id: params.id,
          userId: user.id, // Ensure user can only access their own checkouts
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  fixedPrice: true,
                  weight: true,
                  images: true,
                  description: true,
                },
              },
            },
          },
          coupon: true,
          order: {
            include: {
              items: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!checkout) {
        return NextResponse.json(
          { error: "Checkout not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        checkout,
      });
    } catch (error) {
      console.error("Update checkout error:", error);
      return NextResponse.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  };

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First check auth status
    const authCheck = await requireAuth(request);
    if (authCheck) {
      return authCheck;
    }

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { status, paymentStatus } = await request.json();

    // Verify checkout belongs to user
    const existingCheckout = await prisma.checkout.findUnique({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!existingCheckout) {
      return NextResponse.json(
        { error: "Checkout not found" },
        { status: 404 }
      );
    }

    // Update checkout
    const updatedCheckout = await prisma.checkout.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        coupon: true,
        order: true,
      },
    });

    return NextResponse.json({
      success: true,
      checkout: updatedCheckout,
    });
  } catch (error) {
    console.error("Update checkout error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
