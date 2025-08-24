// store/orderSlice.ts (Fixed Version)
import api from '@/lib/api';
import { FetchOrdersParams, OptimisticUpdateParams, Order, OrderFilters, OrderResponse, OrdersResponse, OrderState, Pagination, UpdateOrderParams } from '@/types/orders'
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { handleApiError } from '@/lib/error'
import { AddressType } from '@prisma/client';

// Helper function to generate temporary IDs for optimistic updates
const generateTempId = (): string => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Initial state
const initialState: OrderState = {
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  filters: {
    status: '',
    paymentStatus: ''
  }
}

// Fetch user's orders with pagination and filters
export const fetchOrders = createAsyncThunk<
  { orders: Order[]; pagination: Pagination },
  FetchOrdersParams,
  { state: { order: OrderState }; rejectValue: string }
>(
  'orders/fetchOrders',
  async (customFilters = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState().order
      const filters = { ...state.filters, ...customFilters }
      const { page, limit } = state.pagination

      // Build query parameters
      const params: Record<string, string | number> = {
        page: customFilters.page || page,
        limit: customFilters.limit || limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus })
      }

      const response = await api.get<OrdersResponse>('/api/orders', { params })

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch orders')
      }

      return {
        orders: response.data.data || [],
        pagination: response.data.pagination || state.pagination
      }
    } catch (error) {
      return rejectWithValue(handleApiError(error))
    }
  }
)

// Fetch single order by ID
export const fetchOrderById = createAsyncThunk<
  Order,
  string,
  { rejectValue: string }
>(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      console.log(`Fetching order ${orderId} from API`);
      const response = await api.get<OrderResponse>(`/api/orders/${orderId}`);
      console.log('API response:', response.data);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch order');
      }

      if (!response.data.data) {
        throw new Error('Order data is empty');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching order:', error);
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Create new order (Updated to handle bank transfer)
export const createOrder = createAsyncThunk<
  { order: Order; paymentUrl?: string; requiresInvoice?: boolean; redirectUrl?: string },
  Partial<Order> & { 
    paymentMethod?: string;
    items?: Array<{
      productId: string;
      title: string;
      quantity: number;
      price?: number;
      fixedPrice?: number;
      unitPrice?: { price: number };
      totalPrice?: number;
      fromCart?: boolean;
    }>;
    shippingAddress?: AddressType;
    subtotalPrice?: number;
    totalTax?: number;
    totalShipping?: number;
    totalDiscount?: number;
    phone?: string;
    notes?: string;
  },
  { rejectValue: string }
>(
  'orders/createOrder',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post<OrderResponse & { 
        paymentUrl?: string; 
        requiresInvoice?: boolean;
        redirectUrl?: string;
      }>('/api/orders', orderData, {
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create order')
      }

      // Handle different payment methods
      const result = {
        order: response.data.data,
        paymentUrl: response.data.paymentUrl,
        requiresInvoice: orderData.paymentMethod === 'bank_transfer',
        redirectUrl: response.data.redirectUrl
      }

      return result
    } catch (error) {
      return rejectWithValue(handleApiError(error))
    }
  }
)

// Update order
export const updateOrder = createAsyncThunk<
  Order,
  UpdateOrderParams,
  { rejectValue: string }
>(
  'orders/updateOrder',
  async ({ orderId, updates }, { rejectWithValue }) => {
    try {
      const response = await api.put<OrderResponse>(`/api/orders/${orderId}`, updates, {
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update order')
      }

      return response.data.data
    } catch (error) {
      return rejectWithValue(handleApiError(error))
    }
  }
)

// Cancel order
export const cancelOrder = createAsyncThunk<
  { orderId: string; data: Order },
  string,
  { rejectValue: string }
>(
  'orders/cancelOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.delete<OrderResponse>(`/api/orders/${orderId}`)

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to cancel order')
      }

      return { orderId, data: response.data.data }
    } catch (error) {
      return rejectWithValue(handleApiError(error))
    }
  }
)

// Order slice
const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    // Basic setters
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.orders = action.payload
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setPagination: (state, action: PayloadAction<Pagination>) => {
      state.pagination = action.payload
    },
    
    // Filter management
    updateFilters: (state, action: PayloadAction<Partial<OrderFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
      state.pagination.page = 1 // Reset to page 1 when filters change
    },
    clearFilters: (state) => {
      state.filters = { status: '', paymentStatus: '' }
      state.pagination.page = 1
    },

    // Optimistic updates
    addOrderOptimistic: (state, action: PayloadAction<Partial<Order>>) => {
      const tempOrder: Order = { 
        ...action.payload, 
        id: generateTempId(),
        orderNumber: action.payload.orderNumber || '',
        email: action.payload.email || '',
        status: action.payload.status || 'PENDING',
        paymentStatus: action.payload.paymentStatus || 'PENDING',
        items: action.payload.items || [],
        subtotalPrice: action.payload.subtotalPrice || 0,
        totalPrice: action.payload.totalPrice || 0,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        updatedAt: action.payload.updatedAt || new Date().toISOString()
      } as Order
      state.orders.unshift(tempOrder)
    },
    updateOrderOptimistic: (state, action: PayloadAction<OptimisticUpdateParams>) => {
      const { orderId, updates } = action.payload
      const orderIndex = state.orders.findIndex(order => order.id === orderId)
      if (orderIndex !== -1) {
        state.orders[orderIndex] = { ...state.orders[orderIndex], ...updates }
      }
    },
    removeOrderOptimistic: (state, action: PayloadAction<string>) => {
      state.orders = state.orders.filter(order => order.id !== action.payload)
    },

    // Pagination
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload
      state.pagination.page = 1
    },

    // Clear actions
    clearStore: () => {
      return initialState
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false
        state.orders = action.payload.orders
        state.pagination = action.payload.pagination
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to fetch orders'
        state.orders = []
      })
      
      // Fetch order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false
        state.currentOrder = action.payload
        
        // Update the order in the orders list if it exists
        const orderIndex = state.orders.findIndex(order => order.id === action.payload.id)
        if (orderIndex !== -1) {
          state.orders[orderIndex] = action.payload
        }
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to fetch order'
      })
      
      // Create order (Updated to handle bank transfer)
      .addCase(createOrder.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false
        const { order } = action.payload
        state.orders.unshift(order)
        state.currentOrder = order
        
        // For bank transfer orders, mark as awaiting payment
        if (action.payload.requiresInvoice) {
          console.log('🏦 Bank transfer order created, invoice required')
        }
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to create order'
      })
      
      // Update order
      .addCase(updateOrder.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        state.loading = false
        const updatedOrder = action.payload
        
        // Update in orders list
        const orderIndex = state.orders.findIndex(order => order.id === updatedOrder.id)
        if (orderIndex !== -1) {
          state.orders[orderIndex] = updatedOrder
        }
        
        // Update current order if it matches
        if (state.currentOrder?.id === updatedOrder.id) {
          state.currentOrder = updatedOrder
        }
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to update order'
      })
      
      // Cancel order
      .addCase(cancelOrder.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.loading = false;
        const { orderId } = action.payload;
        const cancelledAt = new Date(); // Create Date object once
        
        // Update order status in orders list (immutable update)
        state.orders = state.orders.map(order => 
          order.id === orderId
            ? {
                ...order,
                status: 'CANCELLED',
                cancelledAt: cancelledAt // Using Date object directly
              }
            : order
        );
        
        // Update current order if it matches (immutable update)
        if (state.currentOrder?.id === orderId) {
          state.currentOrder = {
            ...state.currentOrder,
            status: 'CANCELLED',
            cancelledAt: cancelledAt // Using same Date object
          };
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Failed to cancel order'
      })
  }
})

export const {
  setOrders,
  setCurrentOrder,
  setLoading,
  setError,
  setPagination,
  updateFilters,
  clearFilters,
  addOrderOptimistic,
  updateOrderOptimistic,
  removeOrderOptimistic,
  setPage,
  setPageSize,
  clearStore,
  clearCurrentOrder,
  clearError
} = orderSlice.actions

export default orderSlice.reducer

// Selectors - Updated to match 'order' key in state
export const selectOrders = (state: { order: OrderState }) =>
  state.order?.orders || [];

export const selectCurrentOrder = (state: { order: OrderState }) =>
  state.order?.currentOrder || null;

export const selectLoading = (state: { order: OrderState }) =>
  state.order?.loading || false;

export const selectError = (state: { order: OrderState }) =>
  state.order?.error || null;

export const selectPagination = (state: { order: OrderState }) =>
  state.order?.pagination || initialState.pagination;

export const selectFilters = (state: { order: OrderState }) =>
  state.order?.filters || initialState.filters;

// Complex selectors
export const selectOrderById = (state: { order: OrderState }, orderId: string) =>
  state.order?.orders?.find(order => order.id === orderId) || null;

export const selectOrdersByStatus = (state: { order: OrderState }, status: string) =>
  state.order?.orders?.filter(order => order.status === status) || [];

export const selectOrdersByPaymentStatus = (state: { order: OrderState }, paymentStatus: string) =>
  state.order?.orders?.filter(order => order.paymentStatus === paymentStatus) || [];

export const selectPendingOrders = (state: { order: OrderState }) =>
  state.order?.orders?.filter(order => order.status === 'PENDING') || [];

export const selectProcessingOrders = (state: { order: OrderState }) =>
  state.order?.orders?.filter(order => order.status === 'PROCESSING') || [];

export const selectShippedOrders = (state: { order: OrderState }) =>
  state.order?.orders?.filter(order => order.status === 'SHIPPED') || [];

export const selectDeliveredOrders = (state: { order: OrderState }) =>
  state.order?.orders?.filter(order => order.status === 'DELIVERED') || [];

export const selectCancelledOrders = (state: { order: OrderState }) =>
  state.order?.orders?.filter(order => order.status === 'CANCELLED') || [];

export const selectBankTransferOrders = (state: { order: OrderState }) =>
  state.order?.orders?.filter(order => 
    order.paymentMethod === 'bank_transfer' && 
    order.paymentStatus === 'PENDING'
  ) || [];

export const selectOrdersAwaitingPayment = (state: { order: OrderState }) =>
  state.order?.orders?.filter(order => 
    order.paymentStatus === 'PENDING' && 
    (order.paymentMethod === 'bank_transfer')
  ) || [];

export const selectOrdersStats = (state: { order: OrderState }) => {
  const orders = state.order?.orders || [];
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    awaitingPayment: orders.filter(o => o.paymentStatus === 'PENDING' && o.paymentMethod === 'bank_transfer').length,
    totalValue: orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0),
    averageOrderValue: orders.length > 0 
      ? orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0) / orders.length 
      : 0
  };
};

export const selectSearchOrders = (state: { order: OrderState }, query: string) => {
  const orders = state.order?.orders || [];
  if (!query) return orders;
  
  const lowercaseQuery = query.toLowerCase();
  return orders.filter(order =>
    order.orderNumber?.toLowerCase().includes(lowercaseQuery) ||
    order.email?.toLowerCase().includes(lowercaseQuery) ||
    order.items?.some(item => 
      item.title?.toLowerCase().includes(lowercaseQuery)
    )
  );
};

// Utility selectors for order calculations
export const selectOrderTotal = (state: { order: OrderState }, order: Order | null) =>
  order?.totalPrice || 0;

export const selectOrderSubtotal = (state: { order: OrderState }, order: Order | null) =>
  order?.subtotalPrice || 0;

export const selectOrderItemsCount = (state: { order: OrderState }, order: Order | null) =>
  order?.items?.reduce((total, item) => total + item.quantity, 0) || 0;