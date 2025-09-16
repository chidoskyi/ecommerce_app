import { Address, DateRange } from "@/types";
import { Invoice } from "./invoice";
import { Product } from "./products";
import { CheckoutItem } from "./checkout";
import { User } from "./users";
import { BillingAddress, User as UserData, PaymentStatus, ShippingAddress, UnitPrice } from "@prisma/client";

// Order Types aligned with Prisma schema
export interface OrderP {
  id: string;
  orderNumber: string;
  userId: string | null;
  clerkId: string | null;
  email: string;
  customerName: string | null | undefined;
  phone: string | null;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
    | "FAILED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "UNPAID" | "CANCELLED";
  subtotalPrice: number;
  totalTax: number;
  totalShipping: number;
  totalDiscount: number;
  user: User | null; // ← Change this to nullable
  totalPrice: number;
  shippingAddress: Address;
  paymentMethod: string | null;
  paymentId: string | null;
  transactionId?: string | null;
  notes: string | null;
  createdAt: Date;
  paidAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  processedAt: Date | null;
  items: OrderItem[] | CheckoutItem[];
  // product: Product[]
  [key: string]: unknown;
}
export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  clerkId: string | null;
  email: string;
  customerName: string | null | undefined;
  phone: string | null;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED"
    | "FAILED";
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "UNPAID" | "CANCELLED";
  subtotalPrice: number;
  totalTax: number;
  totalShipping: number;
  totalDiscount: number;
  user: UserData | null; // ← Change this to nullable
  totalPrice: number;
  shippingAddress: Address;
  paymentMethod: string | null;
  paymentId: string | null;
  transactionId?: string | null;
  notes: string | null;
  createdAt: Date;
  paidAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  processedAt: Date | null;
  items: OrderItem[] | CheckoutItem[];
  // product: Product[]
  [key: string]: unknown;
}

export interface OrderItem {
  id: string;
  orderId: string;
  checkoutId?: string;
  productId: string;
  title: string;
  image?: string;
  quantity: number;
  price?: number;
  fixedPrice?: number;  
  selectedUnit?: UnitPrice
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
  product: Product;
}

export interface OrderSortConfig {
  key: "createdAt" | "totalPrice" | "email";
  direction: "asc" | "desc";
}

export type OrderStatus = Order["status"];

export interface OrderFiltersType {
  searchQuery: string;
  statusFilter: OrderStatus | "all";
  dateRange: DateRange;
}

export interface OrderTableProps {
  orders: Order[];
  loading: boolean;
  invoice: Invoice;
  selectedOrders: string[];
  sortConfig: OrderSortConfig;
  onSort: (key: OrderSortConfig["key"]) => void;
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
  onStatusFilterChange: (status: OrderStatus | "all") => void;
  onDateRangeChange: (range: DateRange) => void;
  selectedOrdersCount: number;
  onBulkStatusChange: (status: OrderStatus) => void;
}
export interface OrdersTableProps {
  orders: Order[]
  onProductView?: (productName: string) => void
}

export interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination: OrderPagination;
  error?: string;
}

export interface OrderResponse {
  success: boolean;
  data: Order;
  error?: string;
}

export interface OrderStats {
  total: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  confirmed: number;
  totalValue: number;
  averageOrderValue: number;
}

export interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  pagination: OrderPagination;
  filters: OrderFilters;
}

export interface FetchOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
}

export interface UpdateOrderParams {
  orderId: string;
  updates: Partial<Order>;
}

export interface OptimisticUpdateParams {
  orderId: string;
  updates: Partial<Order>;
}


export interface OrderFilters {
  page: number;
  limit: number;
  searchQuery?: string;
  statusFilter: OrderStatus | "all";
  dateRange?: { 
    from: string | null;
    to: string | null;
  };
  status?: OrderStatus | '';
  paymentStatus?: PaymentStatus | ''; 
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  search?: string;
}


export interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: Partial<OrderFilters>;
}

export interface SingleOrderResponse {
  success: boolean;
  data: Order;
  message?: string;
}

export interface UpdateOrderPayload {
  id: string;
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
  notes?: string;
  trackingNumber?: string;
  paymentProof?: string;
  shippingAddress?: ShippingAddress;
  billingAddress?: BillingAddress;
}

export interface CreateOrderPayload {
  userId?: string;
  clerkId?: string;
  items: Array<{
    productId: string;
    title?: string;
    quantity: number;
    unitPrice?: number;
    selectedUnit?: string;
    fixedPrice?: number;
  }>;
  shippingAddress?: ShippingAddress;
  billingAddress?: BillingAddress;
  notes?: string;
  status?: Order['status'];
  paymentStatus?: Order['paymentStatus'];
  paymentMethod?: string;
}

export interface AdminOrderState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
  filters: OrderFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  actionLoading: {
    updating: string | null; // order ID being updated
    creating: boolean;
    deleting: string | null; // order ID being deleted
  };
   selectedOrders: string[]; // For bulk operations
     receipt: {
    isDownloading: boolean;
    error: string | null;
    lastDownloadedOrder: string | null;
  };
}

export const initialState: AdminOrderState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
    searchQuery: '',
    statusFilter: 'all',
    dateRange: { from: null, to: null },
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  },
  actionLoading: {
    updating: null,
    creating: false,
    deleting: null,
  },
  selectedOrders: [], // For bulk operations
  receipt: {
    isDownloading: false,
    error: null,
    lastDownloadedOrder: null,
  },
};