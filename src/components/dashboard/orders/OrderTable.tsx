// components/OrderTable.tsx - Mobile Responsive Version
import React, { useMemo, useCallback } from "react";
import {
  MoreHorizontal,
  Eye,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  XCircle,
  Download,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import { Order, OrderStatus } from "@/types/orders";
import {
  selectOrdersLoading,
  selectActionLoading,
  // selectIsDownloadingReceipt,
  // setCurrentOrder,
  downloadReceipt,
} from "@/app/store/slices/adminOrderSlice";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";

export interface OrderTableProps {
  filteredOrders: Order[];
  selectedOrders: string[];
  sortConfig: { key: string; direction: "asc" | "desc" };
  onSort: (key: string) => void;
  onSelectOrder: (orderId: string) => void;
  onSelectAllOrders: (selected: boolean) => void;
  onViewDetails: (order: Order) => void;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  loading?: boolean; // Optional loading override
}

export const OrderTable: React.FC<OrderTableProps> = React.memo(
  ({
    filteredOrders = [], // Default to empty array
    selectedOrders = [], // Default to empty array
    sortConfig,
    onSort,
    onSelectOrder,
    onSelectAllOrders,
    onViewDetails,
    onStatusChange,
    loading: externalLoading,
  }) => {
    const dispatch = useAppDispatch();
    const reduxLoading = useAppSelector(selectOrdersLoading);
    const actionLoading = useAppSelector(selectActionLoading);

    // Use external loading if provided, otherwise use Redux loading
    const loading = externalLoading ?? reduxLoading;

    // Memoize the safe arrays to prevent unnecessary recalculations
    const safeFilteredOrders = useMemo(
      () => (Array.isArray(filteredOrders) ? filteredOrders : []),
      [filteredOrders]
    );

    const safeSelectedOrders = useMemo(
      () => (Array.isArray(selectedOrders) ? selectedOrders : []),
      [selectedOrders]
    );

    // Memoize the allSelected calculation
    const allSelected = useMemo(
      () =>
        safeFilteredOrders.length > 0 &&
        safeSelectedOrders.length === safeFilteredOrders.length,
      [safeFilteredOrders.length, safeSelectedOrders.length]
    );

    const formatDate = useCallback((dateString: string | Date): string => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    }, []);

    const formatDateMobile = useCallback((dateString: string | Date): string => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    }, []);

    const handleDownloadPDF = (orderNumber: string) => {
      dispatch(downloadReceipt(orderNumber));
    };

    const handleStatusChange = useCallback(
      (orderId: string, newStatus: OrderStatus) => {
        onStatusChange(orderId, newStatus);
      },
      [onStatusChange]
    );

    // Memoize the handleSelectAll callback to prevent unnecessary re-renders
    const handleSelectAll = useCallback(
      (checked: boolean) => {
        onSelectAllOrders(checked);
      },
      [onSelectAllOrders]
    );

    // Memoize the handleSelectOrder callback
    const handleSelectOrder = useCallback(
      (orderId: string) => {
        onSelectOrder(orderId);
      },
      [onSelectOrder]
    );

    // Sort orders safely with memoization
    const sortedOrders = useMemo(() => {
      if (!Array.isArray(safeFilteredOrders)) return [];

      return [...safeFilteredOrders].sort((a, b) => {
        if (sortConfig.key === "date") {
          return sortConfig.direction === "asc"
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }

        if (sortConfig.key === "customer") {
          const nameA = a.customerName?.toLowerCase() || "";
          const nameB = b.customerName?.toLowerCase() || "";
          return sortConfig.direction === "asc"
            ? nameA.localeCompare(nameB)
            : nameB.localeCompare(nameA);
        }

        if (sortConfig.key === "total") {
          return sortConfig.direction === "asc"
            ? a.totalPrice - b.totalPrice
            : b.totalPrice - a.totalPrice;
        }

        if (sortConfig.key === "status") {
          const statusA = a.status.toLowerCase();
          const statusB = b.status.toLowerCase();
          return sortConfig.direction === "asc"
            ? statusA.localeCompare(statusB)
            : statusB.localeCompare(statusA);
        }

        return 0;
      });
    }, [safeFilteredOrders, sortConfig]);

    const renderStatusMenuItems = useCallback(
      (order: Order) => {
        const statuses: {
          value: OrderStatus;
          label: string;
          icon: React.ReactNode;
          className: string;
        }[] = [
          {
            value: "PENDING",
            label: "Mark as Pending",
            icon: <Package className="mr-2 h-4 w-4" />,
            className: "cursor-pointer text-yellow-600 hover:bg-yellow-100",
          },
          {
            value: "CONFIRMED",
            label: "Mark as Confirmed",
            icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
            className: "text-green-600 hover:bg-green-100 cursor-pointer",
          },
          {
            value: "PROCESSING",
            label: "Mark as Processing",
            icon: <Clock className="mr-2 h-4 w-4" />,
            className: "text-blue-600 hover:bg-blue-100 cursor-pointer",
          },
          {
            value: "SHIPPED",
            label: "Mark as Shipped",
            icon: <Truck className="mr-2 h-4 w-4" />,
            className: "text-purple-600 hover:bg-purple-100 cursor-pointer",
          },
          {
            value: "DELIVERED",
            label: "Mark as Delivered",
            icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
            className: "text-green-600 hover:bg-green-100 cursor-pointer",
          },
          {
            value: "CANCELLED",
            label: "Mark as Cancelled",
            icon: <XCircle className="mr-2 h-4 w-4" />,
            className: "text-red-600 hover:bg-red-100 cursor-pointer",
          },
        ];

        return statuses.map((status) => (
          <DropdownMenuItem
            key={status.value}
            onClick={() => handleStatusChange(order.id, status.value)}
            disabled={
              order.status === status.value ||
              actionLoading.updating === order.id
            }
            className={`${status.className} w-full justify-start`}
          >
            {status.icon}
            {status.label}
          </DropdownMenuItem>
        ));
      },
      [handleStatusChange, actionLoading.updating]
    );

    // Mobile Card Component
    const MobileOrderCard = ({ order }: { order: Order }) => (
      <div className="bg-white border rounded-lg p-4 mb-3 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={safeSelectedOrders.includes(order.id)}
              onCheckedChange={() => handleSelectOrder(order.id)}
              className="cursor-pointer"
            />
            <div>
              <div className="font-medium text-sm">{order.orderNumber}</div>
              <div className="text-xs text-gray-500">{formatDateMobile(order.createdAt)}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer h-8 w-8"
                disabled={actionLoading.updating === order.id}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onViewDetails(order)}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              {renderStatusMenuItems(order)}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDownloadPDF(order.orderNumber)}
                className="cursor-pointer"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">
                {order.customerName ||
                  (order.user
                    ? `${order.user.firstName} ${order.user.lastName}`
                    : "Unknown Customer")}
              </div>
              <div className="text-xs text-gray-500 truncate">{order.email}</div>
            </div>
            <div className="flex-shrink-0 ml-2">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-sm text-gray-600">Total:</span>
            <span className="font-semibold">
              <PriceFormatter
                amount={order.totalPrice}
                showDecimals={true}
              />
            </span>
          </div>
        </div>
      </div>
    );

    return (
      <>
        {/* Desktop Table - Hidden on mobile */}
        <div className="hidden md:block rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    className="cursor-pointer"
                  />
                </TableHead>
                <TableHead>Order Number</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("customer")}
                >
                  <div className="flex items-center gap-1">
                    Customer
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("date")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => onSort("total")}
                >
                  <div className="flex items-center gap-1">
                    Total
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sortedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                sortedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={safeSelectedOrders.includes(order.id)}
                        onCheckedChange={() => handleSelectOrder(order.id)}
                        className="cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {order.customerName ||
                            (order.user
                              ? `${order.user.firstName} ${order.user.lastName}`
                              : "Unknown Customer")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <PriceFormatter
                        amount={order.totalPrice}
                        showDecimals={true}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer"
                            disabled={actionLoading.updating === order.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onViewDetails(order)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          {renderStatusMenuItems(order)}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDownloadPDF(order.orderNumber)}
                            className="cursor-pointer"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Invoice
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View - Hidden on desktop */}
        <div className="md:hidden">
          {/* Mobile Header with Select All */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg border border-b-0">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                className="cursor-pointer"
              />
              <span className="text-sm font-medium">
                {safeSelectedOrders.length > 0 
                  ? `${safeSelectedOrders.length} selected` 
                  : 'Select all'}
              </span>
            </div>
            
            {/* Mobile Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  Sort <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => onSort("date")} className="cursor-pointer">
                  <Clock className="mr-2 h-4 w-4" />
                  Sort by Date
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSort("customer")} className="cursor-pointer">
                  <Package className="mr-2 h-4 w-4" />
                  Sort by Customer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSort("total")} className="cursor-pointer">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Sort by Total
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSort("status")} className="cursor-pointer">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Sort by Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Cards Container */}
          <div className="border border-t-0 rounded-b-lg p-4 bg-gray-50">
            {loading ? (
              <div className="text-center py-10">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No orders found
              </div>
            ) : (
              <div className="space-y-3">
                {sortedOrders.map((order) => (
                  <MobileOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }
);

OrderTable.displayName = "OrderTable";