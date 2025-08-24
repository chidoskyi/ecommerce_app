// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/middleware';
import { slugify } from '@/lib/slugify';

// GET single category by ID (public)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // 👈 make params a promise
) {
  try {
    const { id } = await context.params // 👈 await before using

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...category,
      productsCount: category._count?.products || 0
    })
  } catch (error) {
    console.error('Category API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Unknown error' 
        })
      },
      { status: 500 }
    )
  }
}

// PUT update category by ID (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, image, status } = body;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
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
          NOT: { id }
        }
      });
      
      if (slugConflict) {
        return NextResponse.json(
          { 
            error: 'Category with this updated name already exists',
            suggestion: `Try a slightly different name (generated slug: ${slug})`
          },
          { status: 400 }
        );
      }
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? existingCategory.name,
        slug,
        description: description ?? existingCategory.description,
        image: image ?? existingCategory.image,
        status: status ?? existingCategory.status
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({
      ...updatedCategory,
      productsCount: updatedCategory._count?.products || 0
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


// DELETE category by ID (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { id } = params;

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Prevent deletion if category has products
    if (existingCategory._count.products > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete category with associated products',
          productsCount: existingCategory._count.products
        },
        { status: 400 }
      );
    }

    // Delete category
    await prisma.category.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
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