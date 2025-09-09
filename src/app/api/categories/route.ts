// app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// import { requireAdmin } from "@/lib/auth";
// import { slugify } from "@/lib/slugify";
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