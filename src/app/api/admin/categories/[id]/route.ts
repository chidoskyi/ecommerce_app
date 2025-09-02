// app/api/admin/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { slugify } from '@/lib/slugify';

export async function GET(
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

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...category,
      productsCount: category._count?.products || 0
    });
  } catch (error) {
    console.error('Category API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Unknown error' 
        })
      },
      { status: 500 }
    );
  }
}

// PUT update existing category (admin only)
export async function PUT(
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
    const { name, description, image, status } = body;

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

    // Generate new slug if name is being updated
    let slug = existingCategory.slug;
    if (name && name !== existingCategory.name) {
      slug = slugify(name);

      // Check if new slug is already taken by another category
      const slugConflict = await prisma.category.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (slugConflict) {
        return NextResponse.json(
          {
            error: "Category with this updated name already exists",
            suggestion: `Try a slightly different name (generated slug: ${slug})`,
          },
          { status: 400 }
        );
      }
    }

    // Handle image update - expect Cloudinary URL from frontend
    let finalImageUrl = existingCategory.image;
    if (image !== undefined) {
      if (image === null || image === "") {
        // User wants to remove the image
        finalImageUrl = null;
      } else if (typeof image === 'string' && (image.startsWith('http') || image.startsWith('https'))) {
        // User is updating with a new Cloudinary URL
        finalImageUrl = image;
      } else {
        // Invalid image format
        return NextResponse.json(
          { error: "Image must be a valid URL" },
          { status: 400 }
        );
      }
    }

    console.log(`🖼️ Final image URL: ${finalImageUrl}`);

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? existingCategory.name,
        slug,
        description: description ?? existingCategory.description,
        image: finalImageUrl,
        status: status ?? existingCategory.status,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json({
      ...updatedCategory,
      productsCount: updatedCategory._count?.products || 0,
    });
  } catch (error) {
    console.error("Categories API error:", error);
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

// DELETE delete existing category (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    console.log("🗑️ DELETE /api/categories called");

    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      console.log("⛔ Admin check failed");
      return adminCheck;
    }
    console.log("✅ Admin check passed");

    const { id } = await context.params;

    console.log("🔍 Extracted ID:", id);

    // Check if category exists
    console.log("📦 Checking category in database...");
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    console.log("🔎 Category lookup result:", existingCategory);

    if (!existingCategory) {
      console.warn(`⚠️ Category with ID ${id} not found`);
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Prevent deletion if category has products
    if (existingCategory._count.products > 0) {
      console.warn(
        `⚠️ Cannot delete category ${id}, it has ${existingCategory._count.products} products`
      );
      return NextResponse.json(
        {
          error: "Cannot delete category with associated products",
          productsCount: existingCategory._count.products,
        },
        { status: 400 }
      );
    }

    // Delete category
    console.log(`🗑️ Deleting category with ID: ${id}`);
    await prisma.category.delete({
      where: { id },
    });

    console.log(`✅ Category ${id} deleted successfully`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("❌ Categories API error:", error);
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