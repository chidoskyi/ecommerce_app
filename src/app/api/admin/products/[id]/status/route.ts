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

// Separate endpoint for status updates only
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      // Apply admin middleware first
      const adminCheck = await requireAdmin(request);
      if (adminCheck instanceof NextResponse) {
        return adminCheck;
      }
  
      const { id } = await params;
      const body = await request.json();
  
      // Extract only the status field from the request body
      const { status } = body;
  
      // Validate that status is provided and is a valid value
      if (!status) {
        return NextResponse.json(
          { error: 'Status is required' },
          { status: 400 }
        );
      }
  
      const validStatuses = ['ACTIVE', 'INACTIVE'];
      if (!validStatuses.includes(status.toUpperCase())) {
        return NextResponse.json(
          { error: 'Invalid status value. Must be ACTIVE or INACTIVE' },
          { status: 400 }
        );
      }
  
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
  
      // Update only the status field and return the full product
      const product = await prisma.product.update({
        where: { id },
        data: {
          status: status.toUpperCase()
        },
        include: {
          category: true,
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
          },
          unitPrices: true
        }
      }) as unknown as ProductWithRelations;
  
      // Calculate average rating
      const averageRating = product.reviews.length > 0 
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;
  
      return NextResponse.json({
        ...product,
        averageRating: averageRating, // This will be a number or 0
        reviewCount: product.reviews.length
      });
    } catch (error) {
      console.error('Product status update error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }