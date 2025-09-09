// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import { Prisma, CategoryStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const statusParam = searchParams.get("status");

    // Validate and parse inputs
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Validate status against the enum
    let status: CategoryStatus | undefined;
    if (statusParam) {
      // Check if the provided status is a valid enum value
      if (Object.values(CategoryStatus).includes(statusParam as CategoryStatus)) {
        status = statusParam as CategoryStatus;
      } else {
        // Handle invalid status - either return error or ignore
        console.warn(`Invalid status parameter: ${statusParam}`);
        // Optionally return error response:
        // return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }
    }

    // Build the where clause with proper typing
    const where: Prisma.CategoryWhereInput = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: {
          _count: {
            select: { products: true },
          },
        },
        skip,
        take: limitNum,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.category.count({ where }),
    ]);

    return NextResponse.json({
      categories: categories.map((category) => ({
        ...category,
        productsCount: category._count?.products || 0,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
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

// POST create new category (admin only)
export const POST = requireAdmin(async (request: NextRequest) => {
  try {

    const body = await request.json();
    const { name, description, image, status = CategoryStatus.ACTIVE } = body;

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = slugify(name);

    // Check for existing slug
    const existingCategory = await prisma.category.findUnique({
      where: { slug },
    });

    if (existingCategory) {
      return NextResponse.json(
        {
          error: "Category with this name already exists",
          suggestion: `Try a slightly different name (generated slug: ${slug})`,
        },
        { status: 400 }
      );
    }

    // Validate images are URLs (already uploaded via Cloudinary)
    const imageArray: string[] = Array.isArray(image) ? image.filter((img): img is string => typeof img === 'string') : [];
    const validImageUrls = imageArray.filter((img) =>
      img.startsWith('http://') || img.startsWith('https://')
    );

    console.log(`🖼️ Using ${validImageUrls.length} valid image URLs`);

    // Prepare category data - single image field
    const categoryData = {
      name,
      slug,
      description,
      status,
      image: validImageUrls.length > 0 ? validImageUrls[0] : null,
    };

    // Create new category
    const category = await prisma.category.create({
      data: categoryData,
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return NextResponse.json(
      {
        ...category,
        productsCount: category._count?.products || 0,
      },
      { status: 201 }
    );
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
})

