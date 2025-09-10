// pages/OrderListPage.tsx - Mobile Responsive Version
"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "react-toastify";
import {
  Order,
  OrderStatus,
  OrderFilters as OrderFiltersType,
} from "@/types/orders";
import { OrderDetailsDialog } from "@/components/dashboard/orders/OrderDetailsDialog";
import { OrderTable } from "@/components/dashboard/orders/OrderTable";
import { OrderFilters } from "@/components/dashboard/orders/OrderFilters";
import { CategoryPagination } from "@/components/dashboard/categories/CategoryPagination";
import {
  selectOrders,
  selectCurrentOrder,
  selectOrdersLoading,
  selectOrdersError,
  selectOrdersFilters,
  selectOrdersPagination,
  selectOrdersStats,
  fetchOrders,
  setCurrentOrder,
  clearCurrentOrder,
  clearError,
  setFilters,
  updateOrderStatus,
  bulkUpdateOrderStatus,
} from "@/app/store/slices/adminOrderSlice";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";

export const OrdersList: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux selectors
  const orders = useAppSelector(selectOrders);
  const currentOrder = useAppSelector(selectCurrentOrder);
  const loading = useAppSelector(selectOrdersLoading);
  const error = useAppSelector(selectOrdersError);
  const filters = useAppSelector(selectOrdersFilters);
  const pagination = useAppSelector(selectOrdersPagination);
  const stats = useAppSelector(selectOrdersStats);

  // Local state for UI interactions
  const [selectedOrders, setSelectedOrders] = React.useState<string[]>([]);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] =
    React.useState<boolean>(false);
  const [sortConfig, setSortConfig] = React.useState<{
    key: string;
    direction: "asc" | "desc";
  }>({
    key: "date",
    direction: "desc",
  });

  // Memoize the filters conversion to prevent unnecessary re-renders
  const apiFilters = useMemo(() => {
    return {
      ...filters,
      startDate: filters.dateRange?.from ?? undefined,
      endDate: filters.dateRange?.to ?? undefined,
      search: filters.searchQuery,
      status:
        filters.statusFilter !== "all"
          ? (filters.statusFilter as OrderStatus | "") // Cast to the correct type
          : undefined,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.page,
    filters.limit,
    filters.searchQuery,
    filters.statusFilter,
    filters.dateRange?.from,
    filters.dateRange?.to,
  ]);

  // Fetch orders on component mount and when filters change
  useEffect(() => {
    dispatch(fetchOrders(apiFilters));
  }, [dispatch, apiFilters]);

  // Handle errors with toast notifications
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Use Redux orders directly - API handles all filtering
  const filteredOrders = orders;

  // Handle status change for individual order
  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus): Promise<void> => {
      try {
        await dispatch(updateOrderStatus(orderId, newStatus)).unwrap();
        toast.success(`Order status updated to ${newStatus}`);
      } catch (error) {
        console.error("Error updating order status:", error);
        toast.error("Failed to update order status");
      }
    },
    [dispatch]
  );

  // Handle bulk status change
  const handleBulkStatusChange = useCallback(
    async (newStatus: OrderStatus): Promise<void> => {
      if (selectedOrders.length === 0) {
        toast.warning("No orders selected");
        return;
      }

      try {
        await dispatch(
          bulkUpdateOrderStatus({
            orderIds: selectedOrders,
            status: newStatus,
          })
        ).unwrap();

        toast.success(
          `${selectedOrders.length} orders updated to ${newStatus}`
        );
        setSelectedOrders([]);
      } catch (error) {
        console.error("Error updating order status:", error);
        toast.error("Failed to update order status");
      }
    },
    [dispatch, selectedOrders]
  );

  // Handle sorting - memoize to prevent unnecessary re-renders
  const handleSort = useCallback((key: string): void => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  // Handle order selection - memoize callbacks
  const handleSelectAllOrders = useCallback(
    (checked: boolean): void => {
      if (checked) {
        setSelectedOrders(orders.map((order) => order.id));
      } else {
        setSelectedOrders([]);
      }
    },
    [orders]
  );

  const handleSelectOrder = useCallback((orderId: string): void => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  }, []);

  // Handle view details
  const handleViewDetails = useCallback(
    (order: Order): void => {
      dispatch(setCurrentOrder(order));
      setIsOrderDetailsOpen(true);
    },
    [dispatch]
  );

  const handleCloseDetails = useCallback((): void => {
    setIsOrderDetailsOpen(false);
    setTimeout(() => {
      dispatch(clearCurrentOrder());
    }, 300); // Wait for dialog animation to complete
  }, [dispatch]);

  // Handle pagination
  const handlePageChange = useCallback(
    (page: number): void => {
      dispatch(setFilters({ page }));
    },
    [dispatch]
  );

  // Handle filters change
  const handleFiltersChange = useCallback(
    (newFilters: Partial<OrderFiltersType>): void => {
      // Convert UI filters to the format expected by Redux
      const serializedFilters: Partial<OrderFiltersType> = {
        // Map searchQuery to search
        search: newFilters.searchQuery,
  
        // Map statusFilter to status (convert "all" to undefined)
        status:
          newFilters.statusFilter === "all"
            ? undefined
            : (newFilters.statusFilter as OrderStatus | ''),
  
        // Map dateRange to startDate/endDate - they're already strings
        startDate: newFilters.dateRange?.from || undefined,
        endDate: newFilters.dateRange?.to || undefined,
  
        // Preserve existing pagination if needed, or reset to page 1
        page: 1, // Typically you want to reset to page 1 when filters change
      };
  
      // Remove undefined values to avoid overwriting existing filters
      const cleanedFilters = Object.fromEntries(
        Object.entries(serializedFilters).filter(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          ([_, value]) => value !== undefined
        )
      ) as Partial<OrderFiltersType>;
  
      dispatch(setFilters(cleanedFilters));
    },
    [dispatch]
  );

  // Memoize props to prevent unnecessary re-renders
  const memoizedSortConfig = useMemo(
    () => sortConfig,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortConfig.key, sortConfig.direction]
  );
  const memoizedSelectedOrders = useMemo(
    () => selectedOrders,
    [selectedOrders]
  );

  return (
    <div className="p-3 sm:p-6">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Order Management
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View and manage customer orders
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {stats.confirmed}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm col-span-2 lg:col-span-1">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                <PriceFormatter amount={stats.totalRevenue} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table Section */}
        <div className="flex flex-col space-y-4">
          <Card className="shadow-md border-gray-300">
            <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg sm:text-xl">Orders</CardTitle>
              </div>
              <CardDescription className="text-sm">
                View and manage all customer orders
              </CardDescription>

              {/* Filters Section - Mobile Optimized */}
              <div className="pt-4">
                <OrderFilters
                  selectedOrdersCount={selectedOrders.length}
                  selectedOrders={memoizedSelectedOrders}
                  onFiltersChange={handleFiltersChange}
                  onBulkStatusChange={handleBulkStatusChange}
                />
              </div>
            </CardHeader>

            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              {/* Orders Table */}
              <div className="overflow-hidden">
                <OrderTable
                  filteredOrders={filteredOrders}
                  loading={loading}
                  selectedOrders={memoizedSelectedOrders}
                  sortConfig={memoizedSortConfig}
                  onSort={handleSort}
                  onSelectOrder={handleSelectOrder}
                  onSelectAllOrders={handleSelectAllOrders}
                  onStatusChange={handleStatusChange}
                  onViewDetails={handleViewDetails}
                />
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="mt-4 sm:mt-6 flex justify-center">
                  <div className="w-full sm:w-auto">
                    <CategoryPagination
                      currentPage={pagination.page}
                      totalPages={pagination.pages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={currentOrder}
        isOpen={isOrderDetailsOpen}
        onClose={handleCloseDetails}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};
