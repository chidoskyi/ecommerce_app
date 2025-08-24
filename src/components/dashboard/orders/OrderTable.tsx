// components/OrderTable.tsx
import React from "react";
import {
  MoreHorizontal,
  Eye,
  Download,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  XCircle,
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
import { Order, OrderStatus, OrderTableProps } from "@/lib/types";
import { downloadInvoicePDF } from "@/utils/invoice-utils";
import { toast } from "react-toastify";


export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  loading,
  selectedOrders,
  sortConfig,
  onSort,
  onSelectOrder,
  onSelectAllOrders,
  onStatusChange,
  onViewDetails,
  filteredOrders,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // const handleDownloadPDF = async () => {
  //   try {
  //     toast.info("Generating PDF...")
  //     await downloadInvoicePDF()
  //     toast.success("PDF downloaded successfully!")
  //   } catch (error) {
  //     console.error("Error downloading PDF:", error)
  //     toast.error("Failed to download PDF")
  //   }
  // }

  // const formatCurrency = (amount: number): string => {
  //   return new Intl.NumberFormat("en-US", {
  //     style: "currency",
  //     currency: "USD",
  //   }).format(amount);
  // };

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortConfig.key === "date") {
      return sortConfig.direction === "asc"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    }

    if (sortConfig.key === "total") {
      return sortConfig.direction === "asc"
        ? a.total - b.total
        : b.total - a.total;
    }

    if (sortConfig.key === "customer") {
      return sortConfig.direction === "asc"
        ? a.customer.name.localeCompare(b.customer.name)
        : b.customer.name.localeCompare(a.customer.name);
    }

    return 0;
  });

  const handleSelectAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectAllOrders(e.target.checked);
  };

  const renderStatusMenuItems = (order: Order) => {
    const statuses: {
      value: OrderStatus;
      label: string;
      icon: React.ReactNode;
      className: string;
    }[] = [
      {
        value: "pending",
        label: "Mark as Pending",
        icon: <Package className="mr-2 h-4 w-4" />,
        className: " cursor-pointer text-yellow-600 hover:bg-yellow-100",
      },
      {
        value: "processing",
        label: "Mark as Processing",
        icon: <Clock className="mr-2 h-4 w-4" />,
        className: "text-blue-600 hover:bg-blue-100  cursor-pointer",
      },
      {
        value: "shipped",
        label: "Mark as Shipped",
        icon: <Truck className="mr-2 h-4 w-4" />,
        className: "text-purple-600 hover:bg-purple-100 cursor-pointer",
      },
      {
        value: "completed",
        label: "Mark as Completed",
        icon: <CheckCircle2 className="mr-2 h-4 w-4" />,
        className: "text-green-600 hover:bg-green-100 cursor-pointer",
      },
      {
        value: "cancelled",
        label: "Mark as Cancelled",
        icon: <XCircle className="mr-2 h-4 w-4" />,
        className: "text-red-600 hover:bg-red-100 cursor-pointer",
      },
    ];

    return statuses.map((status) => (
      <DropdownMenuItem
        key={status.value}
        onClick={() => onStatusChange(order.id, status.value)}
        disabled={order.status === status.value}
        className={`${status.className} w-full justify-start`}
      >
        {status.icon}
        {status.label}
      </DropdownMenuItem>
    ));
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={
                  selectedOrders.length === filteredOrders.length &&
                  filteredOrders.length > 0
                }
                onCheckedChange={(checked) => onSelectAllOrders(Boolean(checked))}
                className="cursor-pointer"
              />
            </TableHead>
            <TableHead>Order ID</TableHead>
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
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={() => onSelectOrder(order.id)}
                    className="cursor-pointer"
                  />
                </TableCell>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{order.customer.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {order.customer.email}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{formatDate(order.date)}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell>
                  <PriceFormatter amount={order.total} showDecimals={true} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer"
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
                      {/* <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleDownloadPDF} className="cursor-pointer">
                        <Download className="mr-2 h-4 w-4" />
                        Download Invoice
                      </DropdownMenuItem> */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};
