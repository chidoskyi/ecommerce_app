// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import { CategoryStatus } from "@prisma/client";


// GET all categories (Admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status");

    // Validate and parse inputs
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build the where clause
    const where: any = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    // Handle sorting by productsCount differently
    if (sortBy === "productsCount") {
      // For sorting by product count, we need to use a different approach
      const categories = await prisma.category.findMany({
        where,
        include: {
          _count: {
            select: { products: true },
          },
        },
        skip,
        take: limitNum,
      });

      // Sort manually by products count
      categories.sort((a, b) => {
        const countA = a._count.products;
        const countB = b._count.products;
        return sortOrder === "asc" ? countA - countB : countB - countA;
      });

      const total = await prisma.category.count({ where });

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
    } else {
      // For all other sort fields, use the regular Prisma approach
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
    }
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
export async function POST(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck; // Return error response if not admin
    }

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
    const imageArray = Array.isArray(image) ? image : [];
    const validImageUrls = imageArray.filter((img: any) => 
      typeof img === 'string' && (img.startsWith('http') || img.startsWith('https'))
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
}

