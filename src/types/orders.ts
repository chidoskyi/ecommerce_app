import { Address, DateRange } from "@/lib/types";
import { Invoice } from "./invoice";
import { Product } from "./products";
import { CheckoutItem } from "./checkout";

// Order Types aligned with Prisma schema
export interface Order {
    id: string;
    orderNumber: string;
    userId: string | null;
    email: string;
    phone: string | null;
    status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'UNPAID';
    subtotalPrice: number;
    totalTax: number;
    totalShipping: number;
    totalDiscount: number;
    totalPrice: number;
    shippingAddress: Address;
    paymentMethod: string | null;
    paymentId: string | null;
    transactionId: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    cancelledAt: Date | null;
    processedAt: Date | null;
    items: CheckoutItem[]
  }

  export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    title: string;
    image?: string;
    quantity: number;
    price: number;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
    product: Product;
  }
  
  export interface OrderSortConfig {
    key: 'createdAt' | 'totalPrice' | 'email';
    direction: 'asc' | 'desc';
  }
  
  export type OrderStatus = Order['status'];
  
  export interface OrderFiltersType {
    searchQuery: string;
    statusFilter: OrderStatus | 'all';
    dateRange: DateRange;
  }
  
  export interface OrderTableProps {
    orders: Order[];
    loading: boolean;
    invoice: Invoice;
    selectedOrders: string[];
    sortConfig: OrderSortConfig;
    onSort: (key: OrderSortConfig['key']) => void;
    onSelectOrder: (orderId: string) => void;
    onSelectAllOrders: (checked: boolean) => void;
    onStatusChange: (orderId: string, status: OrderStatus) => void;
    onViewDetails: (order: Order) => void;
    filteredOrders: Order[];
  }
  
  export interface OrderDetailsDialogProps {
    order: Order | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange: (orderId: string, status: OrderStatus) => void;
  }
  
  export interface OrderFiltersProps {
    filters: OrderFiltersType;
    onSearchChange: (query: string) => void;
    onStatusFilterChange: (status: OrderStatus | 'all') => void;
    onDateRangeChange: (range: DateRange) => void;
    selectedOrdersCount: number;
    onBulkStatusChange: (status: OrderStatus) => void;
  }
  
  export interface OrderStatusBadgeProps {
    status: OrderStatus;
  }

  export interface Pagination {
    page: number
    limit: number
    total: number
    pages: number
  }
  
  export interface OrderFilters {
    status: string
    paymentStatus: string
  }
  
  export interface OrdersResponse {
    success: boolean
    data: Order[]
    pagination: Pagination
    error?: string
  }
  
  export interface OrderResponse {
    success: boolean
    data: Order
    error?: string
  }
  
  export interface OrderStats {
    total: number
    pending: number
    processing: number
    shipped: number
    delivered: number
    cancelled: number
    totalValue: number
    averageOrderValue: number
  }
  
  export interface OrderState {
    orders: Order[]
    currentOrder: Order | null
    loading: boolean
    error: string | null
    pagination: Pagination
    filters: OrderFilters
  }
  
  export interface FetchOrdersParams {
    page?: number
    limit?: number
    status?: string
    paymentStatus?: string
  }
  
  export interface UpdateOrderParams {
    orderId: string
    updates: Partial<Order>
  }
  
  export interface OptimisticUpdateParams {
    orderId: string
    updates: Partial<Order>
  }