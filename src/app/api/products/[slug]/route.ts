import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProductWithReviews } from '@/types/products';
import { Review } from '@/types/reviews';

// GET - Fetch single product by Slug
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        reviews: {
          where: {
            status: "APPROVED", // Changed from PENDING to APPROVED to show approved reviews
            // user: { deletedAt: null }
          },
          include: {
            user: {
              select: {
                firstName: true, 
                lastName: true,  
                avatar: true
              }
            }
          },
          // FIXED: Use array syntax for multiple orderBy criteria
          orderBy: [
            { createdAt: 'desc' },
            { helpfulCount: 'desc' },
            { isVerified: 'desc' }
          ]
        }
      }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    const productWithReviews = product as unknown as ProductWithReviews;

    const averageRating = productWithReviews.reviews.length > 0 
      ? productWithReviews.reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / productWithReviews.reviews.length
      : 0;

    const ratingDistribution = calculateRatingDistribution(productWithReviews.reviews);

    return NextResponse.json({
      ...product,
      slug,
      averageRating,
      reviewCount: productWithReviews.reviews.length,
      ratingDistribution
    })
  } catch (error: unknown) {
    console.error('Product GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateRatingDistribution(reviews: Review[]): Record<number, number> {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(review => {
    distribution[review.rating as keyof typeof distribution]++;
  });
  return distribution;
}