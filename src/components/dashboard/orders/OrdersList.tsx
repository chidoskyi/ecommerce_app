// pages/OrderListPage.tsx - Fixed Redux Connected
"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import { Order, OrderStatus } from "@/types/orders";
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
} from '@/app/store/slices/adminOrderSlice';
import { PriceFormatter } from "@/components/reuse/FormatCurrency";

export const OrdersList: React.FC = () => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const orders = useSelector(selectOrders);
  const currentOrder = useSelector(selectCurrentOrder);
  const loading = useSelector(selectOrdersLoading);
  const error = useSelector(selectOrdersError);
  const filters = useSelector(selectOrdersFilters);
  const pagination = useSelector(selectOrdersPagination);
  const stats = useSelector(selectOrdersStats);

  // Local state for UI interactions
  const [selectedOrders, setSelectedOrders] = React.useState<string[]>([]);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = React.useState<boolean>(false);
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: "date", 
    direction: "desc" 
  });

  // Memoize the filters conversion to prevent unnecessary re-renders
  const apiFilters = useMemo(() => {
    return {
      ...filters,
      // Handle date conversion safely - check if it's already a string or if it's a Date object
      startDate: filters.dateRange?.from 
        ? (typeof filters.dateRange.from === 'string' 
           ? filters.dateRange.from 
           : filters.dateRange.from.toISOString())
        : undefined,
      endDate: filters.dateRange?.to 
        ? (typeof filters.dateRange.to === 'string' 
           ? filters.dateRange.to 
           : filters.dateRange.to.toISOString())
        : undefined,
      search: filters.searchQuery,
      status: filters.statusFilter !== "all" ? filters.statusFilter : undefined,
    };
  }, [
    filters.page,
    filters.limit,
    filters.searchQuery,
    filters.statusFilter,
    filters.dateRange?.from,
    filters.dateRange?.to
  ]);

  // Fetch orders on component mount and when filters change
  useEffect(() => {
    dispatch<any>(fetchOrders(apiFilters));
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
  const handleStatusChange = useCallback(async (orderId: string, newStatus: OrderStatus): Promise<void> => {
    try {
      await dispatch(updateOrderStatus(orderId, newStatus)).unwrap();
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  }, [dispatch]);

  // Handle bulk status change
  const handleBulkStatusChange = useCallback(async (newStatus: OrderStatus): Promise<void> => {
    if (selectedOrders.length === 0) {
      toast.warning("No orders selected");
      return;
    }

    try {
      await dispatch(bulkUpdateOrderStatus({ 
        orderIds: selectedOrders, 
        status: newStatus 
      })).unwrap();
      
      toast.success(`${selectedOrders.length} orders updated to ${newStatus}`);
      setSelectedOrders([]);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  }, [dispatch, selectedOrders]);

  // Handle sorting - memoize to prevent unnecessary re-renders
  const handleSort = useCallback((key: string): void => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  }, []);

  // Handle order selection - memoize callbacks
  const handleSelectAllOrders = useCallback((checked: boolean): void => {
    if (checked) {
      setSelectedOrders(orders.map((order) => order.id));
    } else {
      setSelectedOrders([]);
    }
  }, [orders]);

  const handleSelectOrder = useCallback((orderId: string): void => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
  }, []);

  // Handle view details
  const handleViewDetails = useCallback((order: Order): void => {
    dispatch(setCurrentOrder(order));
    setIsOrderDetailsOpen(true);
  }, [dispatch]);

  const handleCloseDetails = useCallback((): void => {
    setIsOrderDetailsOpen(false);
    setTimeout(() => {
      dispatch(clearCurrentOrder());
    }, 300); // Wait for dialog animation to complete
  }, [dispatch]);

  // Handle pagination
  const handlePageChange = useCallback((page: number): void => {
    dispatch(setFilters({ page }));
  }, [dispatch]);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: any): void => {
    // Convert Date objects to ISO strings for Redux state
    const serializedFilters = {
      ...newFilters,
      dateRange: newFilters.dateRange ? {
        from: newFilters.dateRange.from 
          ? (newFilters.dateRange.from instanceof Date 
             ? newFilters.dateRange.from.toISOString() 
             : newFilters.dateRange.from)
          : null,
        to: newFilters.dateRange.to 
          ? (newFilters.dateRange.to instanceof Date 
             ? newFilters.dateRange.to.toISOString() 
             : newFilters.dateRange.to)
          : null,
      } : null
    };
    
    dispatch(setFilters(serializedFilters));
  }, [dispatch]);

  // Memoize props to prevent unnecessary re-renders
  const memoizedSortConfig = useMemo(() => sortConfig, [sortConfig.key, sortConfig.direction]);
  const memoizedSelectedOrders = useMemo(() => selectedOrders, [selectedOrders]);

  return (
    <div className="">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">View and manage customer orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                <PriceFormatter amount={stats.totalRevenue} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col space-y-4">
          <Card className="shadow-md border-gray-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Orders</CardTitle>
              </div>
              <CardDescription>View and manage all customer orders</CardDescription>
              
              <div className="pt-4">
                <OrderFilters
                  selectedOrdersCount={selectedOrders.length}
                  selectedOrders={memoizedSelectedOrders}
                  onFiltersChange={handleFiltersChange}
                  onBulkStatusChange={handleBulkStatusChange}
                />
              </div>
            </CardHeader>
            
            <CardContent>
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
              
              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="mt-4 flex justify-center">
                  <CategoryPagination
                    currentPage={pagination.page}
                    totalPages={pagination.pages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderDetailsDialog
        order={currentOrder}
        isOpen={isOrderDetailsOpen}
        onClose={handleCloseDetails}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};