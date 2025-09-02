import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { Category, Product, UnitPrice } from '@prisma/client';


export interface ProductWithRelations extends Product {
    category: Category;
    reviews: { rating: number }[];
    unitPrices: UnitPrice[];
    averageRating: number | null; // Match the original type
    reviewCount?: number;
  }



// PATCH update category status (admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { id } = await context.params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ["ACTIVE", "INACTIVE", "DRAFT"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: "Invalid status value",
          validStatuses 
        },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Update only the status
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { status },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    console.log(`✅ Category ${id} status updated to ${status}`);

    return NextResponse.json({
      ...updatedCategory,
      productsCount: updatedCategory._count?.products || 0,
    });
  } catch (error) {
    console.error("Categories PATCH API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      },
      { status: 500 }
    );
  }
}