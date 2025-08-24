// app/api/admin/reviews/route.js
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AuthenticatedRequest } from "@/lib/auth";

// export async function GET(request: NextRequest) {
//   try {
//     const user = await getAuthenticatedUser()
//     // Apply admin middleware
//     const adminCheck = await requireAdmin(request);
//     if (adminCheck instanceof NextResponse) {
//     return adminCheck;
//     }

//     const { searchParams } = new URL(request.url)
//     const status = searchParams.get('status') || 'PENDING'
//     const page = parseInt(searchParams.get('page') || '1')
//     const limit = parseInt(searchParams.get('limit') || '20')
//     const skip = (page - 1) * limit

//     const where = status === 'all' ? {} : { status }

//     const [reviews, totalCount, statusCounts] = await Promise.all([
//       prisma.review.findMany({
//         where,
//         include: {
//           user: {
//             select: {
//               id: true,
//               firstName: true,
//               lastName: true,
//               email: true
//             }
//           },
//           product: {
//             select: {
//               id: true,
//               name: true,
//               slug: true,
//               images: true
//             }
//           }
//         },
//         orderBy: [
//           { createdAt: 'desc' }
//         ],
//         skip,
//         take: limit
//       }),
//       prisma.review.count({ where }),
//       // Get counts for each status
//       prisma.review.groupBy({
//         by: ['status'],
//         _count: {
//           status: true
//         }
//       })
//     ])

//     // Format status counts for easy access
//     const statusCountsFormatted = statusCounts.reduce((acc, item) => {
//       acc[item.status] = item._count.status
//       return acc
//     }, {})

//     return NextResponse.json({
//       reviews,
//       pagination: {
//         page,
//         limit,
//         totalCount,
//         totalPages: Math.ceil(totalCount / limit)
//       },
//       statusCounts: statusCountsFormatted
//     })
//   } catch (error) {
//     console.error('Admin get reviews error:', error)
//     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
//   }
// }

// app/api/admin/reviews/route.js 
export async function GET(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "PENDING";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where = status === "all" ? {} : { status };

    const [reviews, totalCount, statusCounts] = await Promise.all([
      prisma.review.findMany({
        where,
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
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
    ]);

    // Format status counts for admin dashboard
    const counts = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      statusCounts: counts,
    });
  } catch (error) {
    console.error("Admin get reviews error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("id");

    // Strict validation for reviewId
    if (!reviewId || typeof reviewId !== "string" || reviewId.trim() === "") {
      return NextResponse.json(
        {
          error: "Valid review ID is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, isVerified, action } = body;

    // Handle action-based updates (approve/reject)
    let finalStatus = status;
    if (action) {
      if (!["approve", "reject"].includes(action)) {
        return NextResponse.json(
          { error: 'Action must be "approve" or "reject"' },
          { status: 400 }
        );
      }
      finalStatus = action === "approve" ? "APPROVED" : "REJECTED";
    }

    // Validate status
    if (
      !finalStatus ||
      !["PENDING", "APPROVED", "REJECTED"].includes(finalStatus)
    ) {
      return NextResponse.json(
        { error: "Status must be PENDING, APPROVED, or REJECTED" },
        { status: 400 }
      );
    }

    // Check if review exists before updating
    const existingReview = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        status: true,
        isVerified: true,
        userId: true,
        productId: true,
      },
    });

    if (!existingReview) {
      return NextResponse.json(
        {
          error: "Review not found",
        },
        { status: 404 }
      );
    }

    // Check for status conflicts
    if (existingReview.status === finalStatus) {
      return NextResponse.json(
        {
          error: `Review is already ${finalStatus.toLowerCase()}`,
          currentStatus: existingReview.status,
        },
        { status: 409 }
      );
    }

    // Build update data with proper typing
    const updateData: {
      status: string;
      isVerified?: boolean;
      updatedAt: Date;
    } = {
      status: finalStatus,
      updatedAt: new Date(),
    };

    // Add isVerified if provided
    if (isVerified !== undefined) {
      updateData.isVerified = Boolean(isVerified);
    }

    // Update the review
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

    // Generate appropriate message
    let message = `Review ${finalStatus.toLowerCase()} successfully`;
    if (action) {
      message = `Review ${action}d successfully`;
    }
    if (isVerified !== undefined) {
      message += ` and verification status updated`;
    }

    return NextResponse.json({
      review: updatedReview,
      message,
      previousStatus: existingReview.status,
      newStatus: finalStatus,
      timestamp: updateData.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Update review error:", error);

    // Enhanced error handling
    if (error.code === "P2025") {
      return NextResponse.json(
        {
          error: "Review not found",
        },
        { status: 404 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        {
          error: "Database constraint violation",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get("id");

    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    await prisma.review.delete({
      where: { id: reviewId },
    });

    return NextResponse.json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Delete review error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
