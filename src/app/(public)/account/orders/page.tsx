"use client";

import { useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import {
  fetchOrders,
  selectOrders,
  selectLoading,
  selectError,
  selectPagination,
  setPage // Import setPage action
} from "@/app/store/slices/orderSlice";
import { useDispatch, useSelector } from "react-redux";
import Image from "next/image";
import { AppDispatch } from "@/app/store";
import Link from "next/link";
import { Pagination } from "@/components/reuse/Pagination";

export default function OrdersPage() {
  const dispatch = useDispatch<AppDispatch>();
  const orders = useSelector(selectOrders);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const pagination = useSelector(selectPagination);

  // Add debug logging
  console.log("DEBUG - Component state:", {
    orders,
    ordersLength: orders?.length,
    loading,
    error,
    pagination
  });

  const ORDER_STATUSES = {
    pending: {
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: Clock,
      label: "Pending",
    },
    confirmed: {
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: CheckCircle,
      label: "Confirmed",
    },
    processing: {
      color: "bg-purple-100 text-purple-800 border-purple-200",
      icon: Package,
      label: "Processing",
    },
    shipped: {
      color: "bg-indigo-100 text-indigo-800 border-indigo-200",
      icon: Truck,
      label: "Shipped",
    },
    delivered: {
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircle,
      label: "Delivered",
    },
    cancelled: {
      color: "bg-red-100 text-red-800 border-red-200",
      icon: AlertCircle,
      label: "Cancelled",
    },
  };

  // Fetch orders on component mount - FIXED
  useEffect(() => {
    console.log("DEBUG - Fetching initial orders, resetting to page 1");
    // Reset to page 1 first, then fetch
    dispatch(setPage(1));
    dispatch(fetchOrders({ page: 1, limit: 3 }));
  }, [dispatch]);

  // Handle page change
  const handlePageChange = (page: number) => {
    console.log("DEBUG - Fetching orders for page:", page);
    dispatch(fetchOrders({ page, limit: pagination.limit }));
  };

  if (loading) {
    console.log("DEBUG - Showing loading state");
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-start gap-2 mb-5">
            <Package />
            <h1>Order History</h1>
          </CardTitle>
          <CardDescription>View and manage your orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <p>Loading orders...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.log("DEBUG - Showing error state:", error);
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-start gap-2 mb-5">
            <Package />
            <h1>Order History</h1>
          </CardTitle>
          <CardDescription>View and manage your orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <p className="text-red-600">Error loading orders: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    console.log("DEBUG - Showing no orders state. Orders:", orders);
    return (
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center justify-start gap-2 mb-5">
            <Package />
            <h1>Order History</h1>
          </CardTitle>
          <CardDescription>View and manage your orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-center">
              <p>No orders found.</p>
              <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-4 rounded">
                <p className="font-semibold">Debug Info:</p>
                <p>Orders: {JSON.stringify(orders)}</p>
                <p>Loading: {loading.toString()}</p>
                <p>Error: {error || 'none'}</p>
                <p>Current Page: {pagination.page}</p>
                <p>Total Pages: {pagination.pages}</p>
                <p>Total Items: {pagination.total}</p>
              </div>
              {/* Add button to try fetching page 1 explicitly */}
              <Button 
                onClick={() => {
                  console.log("Manual fetch - page 1");
                  dispatch(fetchOrders({ page: 1, limit: 10 }));
                }}
                className="mt-4"
                variant="outline"
              >
                Try Reload (Page 1)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log("DEBUG - Rendering orders list, count:", orders.length);

  // const handleDownloadInvoice = (orderId: string) => {
  //   console.log(`Downloading invoice for order ${orderId}`);
  // };

  const getStatusConfig = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || "pending";
    return (
      ORDER_STATUSES[normalizedStatus as keyof typeof ORDER_STATUSES] ||
      ORDER_STATUSES.pending
    );
  };

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-start gap-2 mb-5">
          <Package />
          <h1>Order History</h1>
        </CardTitle>
        <CardDescription>View and manage your orders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Show pagination info */}
          <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded">
            <p>Showing {orders.length} orders on page {pagination.page} of {pagination.pages} (Total: {pagination.total})</p>
          </div>
          
          {orders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={order.id} className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-4 pb-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        Order #{order.orderNumber || order.id}
                      </h3>
                      <Badge
                        className={`flex items-center px-2 py-1 rounded-full ${statusConfig.color}`}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Placed on {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="cursor-pointer text-white bg-orange-600 hover:bg-orange-700">
                        {/* <Eye className="mr-2 h-4 w-4" /> */}
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-4">
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                          <Image
                            src={item.product.images[0] || "/placeholder.svg"}
                            alt={item.title}
                            width={60}
                            height={60}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            <PriceFormatter
                              amount={item.price || item.totalPrice || 0}
                              showDecimals
                            />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-3 border-t flex justify-between">
                    <p className="font-medium">Total</p>
                    <p className="font-bold text-orange-600">
                      <PriceFormatter
                        amount={order.totalPrice || order.subtotalPrice || 0}
                        showDecimals
                      />
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Add pagination component if you have more than one page */}
          {pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}