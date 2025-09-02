import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// GET - Fetch single product by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // 👈 make params a promise
) {
  try {
    const { id } = await context.params // 👈 await before using

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,  // Changed from 'name' to actual fields
                lastName: true,   // in your User model
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const averageRating = product.reviews.length > 0 
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0

    return NextResponse.json({
      ...product,
      averageRating,
      reviewCount: product.reviews.length
    })
  } catch (error) {
    console.error('Product GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update product by ID (Admin only)
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Apply admin middleware first
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { id } = params;
    const body = await request.json();

    const {
      name,
      description,
      hasFixedPrice,
      priceType,
      fixedPrice,
      unitPrices,
      sku,
      categoryId,
      images = [],
      slug,
      isFeatured,
      isFruit,
      isVegetable,
      isTrending,
      isDealOfTheDay,
      isNewArrival,
      status
    } = body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if SKU already exists (if updating SKU)
    if (sku && sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku }
      });
      if (existingSku) {
        return NextResponse.json(
          { error: 'SKU already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: any = {};
    
    // Handle text fields
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (slug !== undefined) updateData.slug = slug;
    if (sku !== undefined) updateData.sku = sku;
    if (status !== undefined) updateData.status = status.toUpperCase();
    
    // Handle pricing
    if (hasFixedPrice !== undefined) updateData.hasFixedPrice = Boolean(hasFixedPrice);
    if (priceType !== undefined) updateData.priceType = priceType;
    if (fixedPrice !== undefined) {
      updateData.fixedPrice = hasFixedPrice ? parseFloat(fixedPrice) : null;
    }
    
    // Handle unit prices
    if (unitPrices !== undefined) {
      if (Array.isArray(unitPrices)) {
        updateData.unitPrices = unitPrices;
      } else if (unitPrices?.options) {
        updateData.unitPrices = unitPrices.options;
      } else {
        updateData.unitPrices = [];
      }
    }

    // Handle category relationship
    if (categoryId !== undefined) {
      updateData.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
    }

    // Handle images array
    if (images !== undefined) {
      updateData.images = Array.isArray(images) ? images : 
                         typeof images === 'string' ? [images] : [];
    }

    // Handle boolean flags
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (isFruit !== undefined) updateData.isFruit = Boolean(isFruit);
    if (isVegetable !== undefined) updateData.isVegetable = Boolean(isVegetable);
    if (isTrending !== undefined) updateData.isTrending = Boolean(isTrending);
    if (isDealOfTheDay !== undefined) updateData.isDealOfTheDay = Boolean(isDealOfTheDay);
    if (isNewArrival !== undefined) updateData.isNewArrival = Boolean(isNewArrival);

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        variants: true,
        reviews: {
          include: {
            user: {
              select: { 
                firstName: true,
                lastName: true, 
                avatar: true 
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Calculate average rating
    const averageRating = product.reviews.length > 0 
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    return NextResponse.json({
      ...product,
      averageRating,
      reviewCount: product.reviews.length
    });
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete product by ID (Admin only)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Apply admin middleware first
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { id } = params;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Hard delete
    await prisma.product.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}