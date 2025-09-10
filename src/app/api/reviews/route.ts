// app/api/reviews/route.js
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, AuthenticatedRequest } from '@/lib/auth'
import { Prisma, ReviewStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'APPROVED';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause with proper Prisma types
    const where: Prisma.ReviewWhereInput = {};
    
    // Handle status filter with proper enum typing
    if (status !== 'all') {
      // Convert the string to the actual ReviewStatus enum value
      where.status = status as ReviewStatus;
    }
    
    // Add optional filters
    if (productId) where.productId = productId;
    if (userId) where.userId = userId;

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          product: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.review.count({ where })
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      productId,
      rating,
      title,
      content,
      author,
      images = [], // Handle images array from model
      isVerified = false // Handle isVerified field
    } = await request.json()

    // Validate required fields
    if (!productId || !rating) {
      return NextResponse.json(
        { error: 'Product ID and rating are required' },
        { status: 400 }
      )
    }

   // Convert rating to number and validate range
   const numericRating = parseFloat(rating); // Use parseFloat instead of parseInt
    
   if (isNaN(numericRating) || numericRating < 0.5 || numericRating > 5) {
     return NextResponse.json(
       { error: 'Rating must be between 0.5 and 5, and in 0.5 increments' },
       { status: 400 }
     )
   }

   // Validate that rating is in 0.5 increments
   if (numericRating % 0.5 !== 0) {
     return NextResponse.json(
       { error: 'Rating must be in half-star increments (0.5, 1.0, 1.5, etc.)' },
       { status: 400 }
     )
   }

    // Validate images array if provided
    if (images && !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Images must be an array' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId: user.id,
          productId: productId
        }
      }
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this product' },
        { status: 409 }
      )
    }

    // Create review with PENDING status (requires admin approval)
    const newReview = await prisma.review.create({
      data: {
        userId: user.id,
        productId,
        rating: numericRating,
        title: title || null,
        content: content || null,
        author: author || null,
        images: images || [],
        isVerified: Boolean(isVerified),
        status: 'PENDING', // Will be reviewed by admin
        helpfulCount: 0 // Default from model
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

     // Debug log to verify the rating was stored correctly
     console.log('Created review with rating:', newReview.rating, typeof newReview.rating);

    return NextResponse.json({
      review: newReview,
      message: 'Review submitted successfully. It will be visible after admin approval.'
    }, { status: 201 })
  } catch (error) {
    console.error('Create review error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
