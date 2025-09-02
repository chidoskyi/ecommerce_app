import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AuthenticatedRequest, requireAdmin } from "@/lib/auth";

// GET - Fetch all orders with filtering and pagination (admin only)
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); // For searching by user email/name

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};
    
    // Status filters
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    // Date filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Add 23:59:59 to end date to include the entire day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    // Search functionality - Only search by user information
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      
      where.OR = [
        {
          user: {
            OR: [
              { email: { contains: trimmedSearch, mode: 'insensitive' } },
              { firstName: { contains: trimmedSearch, mode: 'insensitive' } },
              { lastName: { contains: trimmedSearch, mode: 'insensitive' } }
            ]
          }
        }
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  category: {
                    select: {
                      id: true,
                      name: true
                    }
                  },
                  unitPrices: true,
                  weight: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              clerkId: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true
            }
          },
          Invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              createdAt: true
            }
          },
          checkout: {
            select: {
              id: true,
              status: true,
              paymentMethod: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    // Transform orders for consistent data structure
    const transformedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        title: item.title || item.product?.name || 'Unknown Product',
        name: item.title || item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.fixedPrice || item.unitPrice || 0,
        fixedPrice: item.fixedPrice,
        unitPrice: item.unitPrice,
        selectedUnit: item.selectedUnit,
        totalPrice: item.totalPrice,
        image: item.product?.images?.[0] || null,
        unit: item.selectedUnit || item.product?.unitPrices?.find(up => up.unit === item.selectedUnit)?.unit || null,
        category: item.product?.category?.name || null,
        weight: item.product?.weight || null,
        product: item.product
      }))
    }));

    return NextResponse.json({
      success: true,
      data: transformedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        status,
        paymentStatus,
        startDate,
        endDate,
        search
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
});
