// pages/OrderListPage.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-toastify";
import { Order, OrderSortConfig, OrderStatus, OrderFiltersType } from "@/lib/types";
import { OrderDetailsDialog } from "@/components/dashboard/orders/OrderDetailsDialog";
import { OrderTable } from "@/components/dashboard/orders/OrderTable";
import { OrderFilters } from "@/components/dashboard/orders/OrderFilters";
import { ordersData } from "@/data/orders";



export const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<OrderSortConfig>({ key: "date", direction: "desc" });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<OrderFiltersType>({
    searchQuery: "",
    statusFilter: "all",
    dateRange: { from: null, to: null },
  });

  // Fetch orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async (): Promise<void> => {
    setLoading(true);
    try {
      // Mock data for demonstration
      // Ensure all order statuses and payment statuses are valid enum values
      const mockOrders: Order[] = ordersData.map((order) => ({
        ...order,
        status: order.status as OrderStatus,
        payment: {
          ...order.payment,
          status: order.payment.status as Order["payment"]["status"],
        },
      }));

      setOrders(mockOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus): Promise<void> => {
    try {
      // In a real app, you would call your API
      // await api.updateOrderStatus(orderId, newStatus)

      const updatedOrders = orders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      );

      setOrders(updatedOrders);
      
      // Update selected order if it's the one being changed
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleBulkStatusChange = async (newStatus: OrderStatus): Promise<void> => {
    if (selectedOrders.length === 0) {
      toast.warning("No orders selected");
      return;
    }

    try {
      // In a real app, you would call your API
      // await Promise.all(selectedOrders.map(id => api.updateOrderStatus(id, newStatus)))

      const updatedOrders = orders.map((order) =>
        selectedOrders.includes(order.id) ? { ...order, status: newStatus } : order
      );

      setOrders(updatedOrders);
      toast.success(`${selectedOrders.length} orders updated to ${newStatus}`);
      setSelectedOrders([]);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    }
  };

  const handleSort = useCallback((key: OrderSortConfig['key']): void => {
    let direction: OrderSortConfig['direction'] = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  // Filter orders based on search query, status, and date range
  const filteredOrders = orders.filter((order) => {
    // Search filter
    const searchMatch =
      order.id.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(filters.searchQuery.toLowerCase());

    // Status filter
    const statusMatch = filters.statusFilter === "all" || order.status === filters.statusFilter;

    // Date range filter
    let dateMatch = true;
    if (filters.dateRange.from && filters.dateRange.to) {
      const orderDate = new Date(order.date);
      dateMatch = orderDate >= filters.dateRange.from && orderDate <= filters.dateRange.to;
    }

    return searchMatch && statusMatch && dateMatch;
  });

  const handleSelectAllOrders = useCallback((checked: boolean): void => {
    if (checked) {
      setSelectedOrders(filteredOrders.map((order) => order.id));
    } else {
      setSelectedOrders([]);
    }
  }, [filteredOrders]);

  const handleSelectOrder = useCallback((orderId: string): void => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  }, [selectedOrders]);

  const handleViewDetails = useCallback((order: Order): void => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  }, []);

  const handleCloseDetails = useCallback((): void => {
    setIsOrderDetailsOpen(false);
    setSelectedOrder(null);
  }, []);

  // Filter handlers
  const handleSearchChange = useCallback((query: string): void => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  }, []);

  const handleStatusFilterChange = useCallback((status: OrderStatus | 'all'): void => {
    setFilters(prev => ({ ...prev, statusFilter: status }));
  }, []);

  const handleDateRangeChange = useCallback((dateRange: OrderFiltersType['dateRange']): void => {
    setFilters(prev => ({ ...prev, dateRange }));
  }, []);

  return (
    <div className="">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
          <p className="text-muted-foreground">View and manage customer orders</p>
        </div>

        <div className="flex flex-col space-y-4">
          <Card className="shadow-md border-gray-300" >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Orders</CardTitle>
              </div>
              <CardDescription>View and manage all customer orders</CardDescription>
              
              <div className="pt-4">
                <OrderFilters
                  filters={filters}
                  onSearchChange={handleSearchChange}
                  onStatusFilterChange={handleStatusFilterChange}
                  onDateRangeChange={handleDateRangeChange}
                  selectedOrdersCount={selectedOrders.length}
                  onBulkStatusChange={handleBulkStatusChange}
                />
              </div>
            </CardHeader>
            
            <CardContent>
              <OrderTable
                orders={orders}
                loading={loading}
                selectedOrders={selectedOrders}
                sortConfig={sortConfig}
                onSort={handleSort}
                onSelectOrder={handleSelectOrder}
                onSelectAllOrders={handleSelectAllOrders}
                onStatusChange={handleStatusChange}
                onViewDetails={handleViewDetails}
                filteredOrders={filteredOrders}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <OrderDetailsDialog
        order={selectedOrder}
        isOpen={isOrderDetailsOpen}
        onClose={handleCloseDetails}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};
