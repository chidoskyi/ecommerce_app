// app/api/dashboard/metrics/route.js
import { NextResponse, NextRequest } from 'next/server'
import { AuthenticatedRequest, requireAdmin } from '@/lib/auth'
import prisma from '@/lib/prisma'


// import { 
//   getProductDisplayPrice
// } from '@/utils/pricing-utils'

// Helper function to get product price based on pricing type (using utils)
// const getProductPrice = (product, unit = null) => {
//   return getProductDisplayPrice(product, unit)
// }

// Helper function to get all possible prices for a variable product
// const getVariablePrices = (product) => {
//   if (!product.hasFixedPrice && product.unitPrices?.length > 0) {
//     return product.unitPrices.map(up => ({
//       unit: up.unit,
//       price: up.price
//     }))
//   }
//   return []
// }

// Get products count from database
const getProductsCount = async () => {
  try {
    const count = await prisma.product.count({
      where: {
        // Only count active products
        status: 'ACTIVE'
      }
    })
    return count
  } catch (error) {
    console.error('Error fetching products count:', error)
    throw new Error('Failed to fetch products count')
  }
}

// Get total revenue from completed orders
const getTotalRevenue = async () => {
  try {
    // Get all confirmed orders with their items
    const orders = await prisma.order.findMany({
      where: {
        status: 'CONFIRMED'
      },
      include: {
        items: true // Changed from orderItems to items based on your schema
      }
    })
    
    let totalRevenue = 0
    
    for (const order of orders) {
      for (const item of order.items) {
        // Use the totalPrice stored in orderItem
        totalRevenue += item.totalPrice
      }
    }
    
    return totalRevenue
  } catch (error) {
    console.error('Error fetching total revenue:', error)
    throw new Error('Failed to fetch total revenue')
  }
}

// Get total orders count
const getTotalOrders = async () => {
  try {
    const count = await prisma.order.count()
    return count
  } catch (error) {
    console.error('Error fetching orders count:', error)
    throw new Error('Failed to fetch orders count')
  }
}

// Get revenue for a specific date range
const getRevenueByDateRange = async (startDate: Date, endDate: Date) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: 'CONFIRMED',
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        items: true
      }
    })
    
    let totalRevenue = 0
    
    for (const order of orders) {
      for (const item of order.items) {
        totalRevenue += item.totalPrice
      }
    }
    
    return totalRevenue
  } catch (error) {
    console.error('Error fetching revenue by date range:', error)
    return 0
  }
}

// Get orders count for a specific date range
const getOrdersByDateRange = async (startDate: Date, endDate: Date) => {
  try {
    const count = await prisma.order.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        }
      }
    })
    return count
  } catch (error) {
    console.error('Error fetching orders by date range:', error)
    return 0
  }
}

// Get products count for a specific date range (newly added products)
const getProductsByDateRange = async (startDate: Date, endDate: Date) => {
  try {
    const count = await prisma.product.count({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate
        },
        status: 'ACTIVE'
      }
    })
    return count
  } catch (error) {
    console.error('Error fetching products by date range:', error)
    return 0
  }
}

// Calculate metrics with growth percentages
// Calculate metrics with growth percentages
const getMetricsWithGrowth = async () => {
  try {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    
    // Get total metrics
    const totalRevenue = await getTotalRevenue()
    const totalOrders = await getTotalOrders()
    const totalProducts = await getProductsCount()
    
    // Current month data
    const currentRevenue = await getRevenueByDateRange(thisMonth, now)
    const currentOrders = await getOrdersByDateRange(thisMonth, now)
    const currentNewProducts = await getProductsByDateRange(thisMonth, now)
    
    // Previous month data for comparison
    const prevRevenue = await getRevenueByDateRange(lastMonth, thisMonth)
    const prevOrders = await getOrdersByDateRange(lastMonth, thisMonth)
    const prevNewProducts = await getProductsByDateRange(lastMonth, thisMonth)
    
    // Calculate growth values as numbers
    const revenueGrowthValue = prevRevenue > 0 
      ? ((currentRevenue - prevRevenue) / prevRevenue * 100)
      : currentRevenue > 0 ? 100 : 0
      
    const ordersGrowthValue = prevOrders > 0
      ? ((currentOrders - prevOrders) / prevOrders * 100)
      : currentOrders > 0 ? 100 : 0
      
    const productsGrowthValue = prevNewProducts > 0
      ? ((currentNewProducts - prevNewProducts) / prevNewProducts * 100)
      : currentNewProducts > 0 ? 100 : 0
    
    return {
      revenue: {
        total: totalRevenue,
        current: currentRevenue,
        previous: prevRevenue,
        growth: `${revenueGrowthValue.toFixed(0)}%`,
        isPositive: revenueGrowthValue >= 0
      },
      orders: {
        total: totalOrders,
        current: currentOrders,
        previous: prevOrders,
        growth: `${ordersGrowthValue.toFixed(0)}%`,
        isPositive: ordersGrowthValue >= 0
      },
      products: {
        total: totalProducts,
        current: currentNewProducts,
        previous: prevNewProducts,
        growth: `${productsGrowthValue.toFixed(0)}%`,
        isPositive: productsGrowthValue >= 0
      }
    }
  } catch (error) {
    console.error('Error calculating metrics with growth:', error)
    throw new Error('Failed to calculate metrics')
  }
}
  
// Get recent products for the table
const getRecentOrders = async (limit = 6) => {
  try {
    console.log('Fetching recent orders with limit:', limit);
    
    const orders = await prisma.order.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: true,
        items: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        // shippingAddress: true,
        payments: true
      }
    });

    // Transform order data for display
    return orders.map(order => {
      // Calculate order totals
      const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      
      // Use the totalPrice from the database instead of recalculating
      const totalPrice = order.totalPrice || 0;

      // FIXED: Proper customer name handling
      const customerName = (() => {
        if (order.user?.firstName && order.user?.lastName) {
          return `${order.user.firstName} ${order.user.lastName}`;
        }
        if (order.user?.firstName) {
          return order.user.firstName;
        }
        if (order.user?.lastName) {
          return order.user.lastName;
        }
        return 'Guest Customer';
      })();

      const transformedOrder = {
        id: order.id,
        orderNumber: order.orderNumber || `ORDER-${order.id.slice(-8).toUpperCase()}`,
        customerName: customerName, // ← Now this will show full name properly
        customerEmail: order.user?.email || 'No email',
        status: order.status,
        totalItems,
        totalPrice, // ← Use database totalPrice
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        // Shipping information
        shippingAddress: order.shippingAddress ? {
          street: order.shippingAddress.address,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state,
          zipCode: order.shippingAddress.zip,
          country: order.shippingAddress.country
        } : null,
        // Payment information
        paymentStatus: order.paymentStatus || 'PENDING',
        paymentMethod: order.paymentMethod || 'Unknown',
        // Order items details
        items: order.items?.map(item => ({
          productName: item.product?.name || 'Unknown Product',
          category: item.product?.category?.name || 'Uncategorized',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })) || []
      };

      return transformedOrder;
    });
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }
};

// Main API route handler
export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const user = (request as AuthenticatedRequest).user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all metrics
    const metrics = await getMetricsWithGrowth()
    
    // Fetch recent products
    const orders = await getRecentOrders()
    
    const dashboardData = {
      metrics: [
        {
          title: "Total Revenue",
          value: `₦${metrics.revenue.total.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          change: metrics.revenue.growth,
          isPositive: metrics.revenue.isPositive,
          link: "Total Revenue",
          href: "/admin"
        },
        {
          title: "Total Order",
          value: metrics.orders.total.toLocaleString(),
          change: metrics.orders.growth,
          // isPositive: metrics.orders.isPositive,
          link: "Manage Orders",
          href: "/admin/orders"
        },
        {
          title: "Total Products",
          value: metrics.products.total.toLocaleString(),
          change: metrics.products.growth,
          // isPositive: metrics.products.isPositive,
          link: "Manage Products",
          href: "/admin/products"
        }
      ],
      orders: orders,
      lastUpdated: new Date().toISOString(),
      // Additional metadata
      metadata: {
        period: 'current_month',
        revenueComparison: `vs ₦${metrics.revenue.previous.toLocaleString('en-NG', { minimumFractionDigits: 2 })} last month`,
        ordersComparison: `vs ${metrics.orders.previous} last month`,
        productsComparison: `vs ${metrics.products.previous} new products last month`,
        // adminUser: adminCheck.user?.email || 'Unknown'
      }
    }
    
    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard API Error:', error);
    
    // Proper type checking
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'An unknown error occurred';
    
    // Return structured error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data',
        message: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
})
