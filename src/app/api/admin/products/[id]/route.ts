import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Category, Product, UnitPrice } from "@prisma/client";

export interface ProductWithRelations extends Product {
  category: Category;
  reviews: { rating: number }[];
  unitPrices: UnitPrice[];
  averageRating: number | null; // Match the original type
  reviewCount?: number;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { id } = await params;

    // Check if request has a body
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    // Try to parse the JSON body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON format in request body" },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if SKU exists (excluding current product)
    if (body.sku && body.sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: body.sku },
      });
      if (existingSku) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 400 }
        );
      }
    }

    // Validate images are URLs (already uploaded)
    const images = Array.isArray(body.images) ? body.images : [];
    const validImageUrls = images.filter((img: any) => 
      typeof img === 'string' && img.startsWith('http')
    );

    // Prepare update data
    const updateData: any = {};

    // Only update fields that are provided
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.hasFixedPrice !== undefined) updateData.hasFixedPrice = Boolean(body.hasFixedPrice);
    if (body.priceType !== undefined) updateData.priceType = body.priceType;
    if (body.sku !== undefined) updateData.sku = body.sku;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.isFruit !== undefined) updateData.isFruit = Boolean(body.isFruit);
    if (body.isVegetable !== undefined) updateData.isVegetable = Boolean(body.isVegetable);
    if (body.isTrending !== undefined) updateData.isTrending = Boolean(body.isTrending);
    if (body.isFeatured !== undefined) updateData.isFeatured = Boolean(body.isFeatured);
    if (body.isDealOfTheDay !== undefined) updateData.isDealOfTheDay = Boolean(body.isDealOfTheDay);
    if (body.isNewArrival !== undefined) updateData.isNewArrival = Boolean(body.isNewArrival);
    if (body.status !== undefined) updateData.status = body.status.toUpperCase();

    // Update images
    updateData.images = validImageUrls;

    // Handle category relationship
    if (body.categoryId !== undefined) {
      if (body.categoryId) {
        const categoryExists = await prisma.category.findUnique({
          where: { id: body.categoryId },
        });

        if (!categoryExists) {
          return NextResponse.json(
            { error: "Category not found" },
            { status: 400 }
          );
        }

        updateData.category = {
          connect: { id: body.categoryId },
        };
      } else {
        updateData.category = {
          disconnect: true,
        };
      }
    }

    // Handle pricing updates
    if (body.hasFixedPrice !== undefined) {
      if (body.hasFixedPrice) {
        if (body.fixedPrice !== undefined) {
          updateData.fixedPrice = parseFloat(body.fixedPrice);
        }
        updateData.unitPrices = [];
      } else {
        updateData.fixedPrice = 0;
        if (body.unitPrices !== undefined && Array.isArray(body.unitPrices)) {
          updateData.unitPrices = body.unitPrices.map((up: any) => ({
            unit: up.unit,
            price: parseFloat(up.price),
          }));
        } else {
          updateData.unitPrices = [];
        }
      }
    } else {
      // Handle individual price updates based on existing type
      if (existingProduct.hasFixedPrice && body.fixedPrice !== undefined) {
        updateData.fixedPrice = parseFloat(body.fixedPrice);
      } else if (!existingProduct.hasFixedPrice && body.unitPrices !== undefined && Array.isArray(body.unitPrices)) {
        updateData.unitPrices = body.unitPrices.map((up: any) => ({
          unit: up.unit,
          price: parseFloat(up.price),
        }));
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    // ✅ Return format that Redux expects
    return NextResponse.json({
      id: updatedProduct.id,
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Products PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply admin middleware first
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { id } = params;
    const body = await request.json();

    // Extract only the status field from the request body
    const { status } = body;

    // Validate that status is provided and is a valid value
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["ACTIVE", "INACTIVE"];
    if (!validStatuses.includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: "Invalid status value. Must be ACTIVE or INACTIVE" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Update only the status field and return the full product
    const product = (await prisma.product.update({
      where: { id },
      data: {
        status: status.toUpperCase(),
      },
      include: {
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        unitPrices: true,
      },
    })) as unknown as ProductWithRelations;

    // Calculate average rating
    const averageRating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          product.reviews.length
        : 0;

    return NextResponse.json({
      ...product,
      averageRating: averageRating, // This will be a number or 0
      reviewCount: product.reviews.length,
    });
  } catch (error) {
    console.error("Product status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply admin middleware first
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Check if product exists and get its data (including images)
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        images: true,
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Collect all image URLs to delete
    const imagesToDelete: string[] = [];

    // Add all images from the images array
    if (existingProduct.images && Array.isArray(existingProduct.images)) {
      imagesToDelete.push(
        ...existingProduct.images.filter((url) => url && url.trim() !== "")
      );
    }

    // ✅ REMOVED: Cloudinary deletion logic here
    // Images will be deleted through the separate image deletion endpoint

    // Hard delete the product from database
    const deletedProduct = await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
      id: deletedProduct.id,
      product: {
        id: deletedProduct.id,
        name: existingProduct.name,
        deletedImages: imagesToDelete.length,
      },
    });
  } catch (error) {
    console.error("Products DELETE error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Foreign key constraint")) {
        return NextResponse.json(
          {
            error:
              "Cannot delete product: it may be referenced by orders or other records",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
