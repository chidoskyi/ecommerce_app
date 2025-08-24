// app/api/reviews/[id]/route.js
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, AuthenticatedRequest } from "@/lib/auth";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id;

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error("Get review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = params.id;
    const { rating, title, body } = await request.json();

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if user owns this review
    if (existingReview.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData = {};
    if (rating) updateData.rating = parseInt(rating);
    if (title !== undefined) updateData.title = title || null;
    if (body !== undefined) updateData.body = body || null;

    // Reset to PENDING status if content changes (requires re-approval)
    if (Object.keys(updateData).length > 0) {
      updateData.status = "PENDING";
    }

    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json({
      review: updatedReview,
      message:
        "Review updated successfully. It will be visible after admin approval.",
    });
  } catch (error) {
    console.error("Update review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reviewId = params.id;

    // Find existing review
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existingReview) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Check if user owns this review
    if (existingReview.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return NextResponse.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
