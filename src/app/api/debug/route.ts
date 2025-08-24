import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const productsInCategory = await prisma.product.findMany({
      where: {
        categoryId: "6892432a51989763ecc17a04"
      },
      select: {
        id: true,
        name: true,
        categoryId: true
      }
    });

    return NextResponse.json({
      count: productsInCategory.length,
      products: productsInCategory
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to query products" },
      { status: 500 }
    );
  }
}