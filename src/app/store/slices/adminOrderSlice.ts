import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { AdminOrderState, initialState, Order, OrderFilters, OrdersResponse, SingleOrderResponse, UpdateOrderPayload } from '@/types/orders';
import { ApiError } from 'next/dist/server/api-utils';
import { AppDispatch, RootState } from '..';

// Async Thunks
export const fetchOrders = createAsyncThunk<OrdersResponse, Partial<OrderFilters>>(
  'adminOrders/fetchOrders',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      
      // Add pagination
      params.append('page', (filters.page || 1).toString());
      params.append('limit', (filters.limit || 10).toString());
      
      // Add filters - convert Date objects to ISO strings
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.startDate) {
        const startDateValue = typeof filters.startDate === 'object' && filters.startDate !== null && 'toISOString' in filters.startDate
          ? (filters.startDate as Date).toISOString()
          : filters.startDate;
        params.append('startDate', startDateValue as string);
      }
      if (filters.endDate) {
        const endDateValue = typeof filters.endDate === 'object' && filters.endDate !== null && 'toISOString' in filters.endDate
          ? (filters.endDate as Date).toISOString()
          : filters.endDate;
        params.append('endDate', endDateValue as string);
      }
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/api/admin/orders?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to fetch orders'
      );
    }
  }
);

export const fetchOrderById = createAsyncThunk<SingleOrderResponse, string>(
  'adminOrders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/orders/${orderId}`);
      return response.data;
    } catch (error) {
          return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to fetch order'
      );
    }
  }
);


export const updateOrder = createAsyncThunk<SingleOrderResponse, UpdateOrderPayload>(
  'adminOrders/updateOrder',
  async (updateData, { rejectWithValue }) => {
    try {
      const { id, ...data } = updateData;
      const response = await api.put(`/api/admin/orders/${id}`, data);
      return response.data;
      } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to update order'
      );
    }
  }
);

export const cancelOrder = createAsyncThunk<SingleOrderResponse, string>(
  'adminOrders/cancelOrder',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/admin/orders/${orderId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to cancel order'
      );
    }
  }
);

// Download Receipt thunk
export const downloadReceipt = createAsyncThunk(
  'adminOrders/downloadReceipt',
  async (orderNumber: string, { rejectWithValue }) => {
    try {
      console.log('Starting receipt download for order:', orderNumber);
      
      const response = await api.post('/api/admin/orders/receipt', 
        { orderNumber },
        { 
          responseType: 'blob' // This is crucial for PDF downloads
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Get the PDF blob from response data
      const blob = response.data;
      console.log('Blob size:', blob.size);
      
      if (blob.size === 0) {
        throw new Error('Empty PDF file received');
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${orderNumber}.pdf`;
      a.style.display = 'none'; // Hide the element
      
      // Add to DOM, click, then remove
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log('Download initiated successfully');
      return { orderNumber, success: true };

    } catch (error) {
      console.error('Receipt download error:', error);
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to download receipt'
      );
    }
        }
);

// Add bulk operations thunk
export const bulkUpdateOrderStatus = createAsyncThunk<
  { success: boolean; updatedCount: number; message: string },
  { orderIds: string[]; status: Order['status'] }
>(
  'adminOrders/bulkUpdateOrderStatus',
  async ({ orderIds, status }, { rejectWithValue, dispatch }) => {
    try {
      // Execute all updates in parallel
      const updatePromises = orderIds.map(id => 
        dispatch(updateOrder({ id, status })).unwrap()
      );
      
      await Promise.all(updatePromises);
      
      return {
        success: true,
        updatedCount: orderIds.length,
        message: `${orderIds.length} orders updated to ${status}`
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to update orders'
      );
    }
  }
);

// Slice
const adminOrderSlice = createSlice({
  name: 'adminOrders',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<OrderFilters>>) => {
      // Ensure dates are stored as ISO strings in Redux
      const newFilters = { ...action.payload };
      
      if (newFilters.dateRange) {
        newFilters.dateRange = {
          from: newFilters.dateRange.from 
            ? (typeof newFilters.dateRange.from === 'string' 
               ? newFilters.dateRange.from 
               : newFilters.dateRange.from.toISOString())
            : null,
          to: newFilters.dateRange.to 
            ? (typeof newFilters.dateRange.to === 'string' 
               ? newFilters.dateRange.to 
               : newFilters.dateRange.to.toISOString())
            : null,
        };
      }
      
      state.filters = { ...state.filters, ...newFilters };
      
      // Reset to page 1 when filters change (except when only changing page)
      if (action.payload.page === undefined) {
        state.filters.page = 1;
      }
    },
      
    clearFilters: (state) => {
      state.filters = {
        page: 1,
        limit: state.filters.limit, // Keep current limit
        searchQuery: '',
        statusFilter: 'all',
        dateRange: { from: null, to: null }, // Properly initialize dateRange
      };
    },
        
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },
    
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Clear receipt error
    clearReceiptError: (state) => {
      state.receipt.error = null;
    },
    
    // Optimistic updates for better UX
    optimisticUpdateOrder: (state, action: PayloadAction<{ id: string; updates: Partial<Order> }>) => {
      const { id, updates } = action.payload;
      
      // Update in orders list
      const orderIndex = state.orders.findIndex(order => order.id === id);
      if (orderIndex !== -1) {
        state.orders[orderIndex] = { ...state.orders[orderIndex], ...updates };
      }
      
      // Update current order if it matches
      if (state.currentOrder?.id === id) {
        state.currentOrder = { ...state.currentOrder, ...updates };
      }
    },
    
    // Remove order from list (for cancelled orders)
    removeOrder: (state, action: PayloadAction<string>) => {
      state.orders = state.orders.filter(order => order.id !== action.payload);
      if (state.currentOrder?.id === action.payload) {
        state.currentOrder = null;
      }
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Orders
    builder
  .addCase(fetchOrders.pending, (state) => {
    state.loading = true;
    state.error = null;
  })
  .addCase(fetchOrders.fulfilled, (state, action) => {
    state.loading = false;
    state.orders = action.payload.data;
    state.pagination = action.payload.pagination;
    
    // Ensure filters maintain proper date format (ISO strings)
    const filters = { ...action.payload.filters };
    
    // Keep dates as ISO strings in Redux state
    if (filters.startDate) {
      filters.startDate = typeof filters.startDate === 'string' 
        ? filters.startDate 
        : new Date(filters.startDate).toISOString();
    }
    if (filters.endDate) {
      filters.endDate = typeof filters.endDate === 'string' 
        ? filters.endDate 
        : new Date(filters.endDate).toISOString();
    }
    
    state.filters = { ...state.filters, ...filters };
  })
  .addCase(fetchOrders.rejected, (state, action) => {
    state.loading = false;
    state.error = action.payload as string;
  });

    // Fetch Order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload.data;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.currentOrder = null;
      });

    // Update Order
    builder
      .addCase(updateOrder.pending, (state, action) => {
        state.actionLoading.updating = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updateOrder.fulfilled, (state, action) => {
        state.actionLoading.updating = null;
        
        const updatedOrder = action.payload.data;
        
        // Update in orders list
        const orderIndex = state.orders.findIndex(order => order.id === updatedOrder.id);
        if (orderIndex !== -1) {
          state.orders[orderIndex] = updatedOrder;
        }
        
        // Update current order if it matches
        if (state.currentOrder?.id === updatedOrder.id) {
          state.currentOrder = updatedOrder;
        }
      })
      .addCase(updateOrder.rejected, (state, action) => {
        state.actionLoading.updating = null;
        state.error = action.payload as string;
      });

    // Cancel Order
    builder
      .addCase(cancelOrder.pending, (state, action) => {
        state.actionLoading.deleting = action.meta.arg;
        state.error = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.actionLoading.deleting = null;
        
        const cancelledOrder = action.payload.data;
        
        // Update in orders list
        const orderIndex = state.orders.findIndex(order => order.id === cancelledOrder.id);
        if (orderIndex !== -1) {
          state.orders[orderIndex] = cancelledOrder;
        }
        
        // Update current order if it matches
        if (state.currentOrder?.id === cancelledOrder.id) {
          state.currentOrder = cancelledOrder;
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.actionLoading.deleting = null;
        state.error = action.payload as string;
      });

    // Bulk Update Order Status
    builder
      .addCase(bulkUpdateOrderStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(bulkUpdateOrderStatus.fulfilled, (state) => {
        state.loading = false;
        // Clear selected orders after successful bulk update
        state.selectedOrders = [];
      })
      .addCase(bulkUpdateOrderStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Download Receipt
    builder
      .addCase(downloadReceipt.pending, (state) => {
        state.receipt.isDownloading = true;
        state.receipt.error = null;
      })
      .addCase(downloadReceipt.fulfilled, (state, action) => {
        state.receipt.isDownloading = false;
        state.receipt.error = null;
        state.receipt.lastDownloadedOrder = action.payload.orderNumber;
      })
      .addCase(downloadReceipt.rejected, (state, action) => {
        state.receipt.isDownloading = false;
        state.receipt.error = action.payload as string;
      });
  },
});

// Action creators
export const {
  setFilters,
  clearFilters,
  setCurrentOrder,
  clearCurrentOrder,
  clearError,
  clearReceiptError,
  optimisticUpdateOrder,
  removeOrder,
} = adminOrderSlice.actions;

// Selectors
export const selectOrders = (state: { adminOrders: AdminOrderState }) => state.adminOrders.orders;
export const selectCurrentOrder = (state: { adminOrders: AdminOrderState }) => state.adminOrders.currentOrder;
export const selectOrdersLoading = (state: { adminOrders: AdminOrderState }) => state.adminOrders.loading;
export const selectOrdersError = (state: { adminOrders: AdminOrderState }) => state.adminOrders.error;
export const selectOrdersFilters = (state: { adminOrders: AdminOrderState }) => state.adminOrders.filters;
export const selectOrdersPagination = (state: { adminOrders: AdminOrderState }) => state.adminOrders.pagination;
export const selectActionLoading = (state: { adminOrders: AdminOrderState }) => state.adminOrders.actionLoading;

// Receipt selectors
export const selectReceiptState = (state: { adminOrders: AdminOrderState }) => state.adminOrders.receipt;
export const selectIsDownloadingReceipt = (state: { adminOrders: AdminOrderState }) => state.adminOrders.receipt.isDownloading;
export const selectReceiptError = (state: { adminOrders: AdminOrderState }) => state.adminOrders.receipt.error;
export const selectLastDownloadedOrder = (state: { adminOrders: AdminOrderState }) => state.adminOrders.receipt.lastDownloadedOrder;

// Complex selectors
export const selectOrderById = (orderId: string) => (state: { adminOrders: AdminOrderState }) =>
  state.adminOrders.orders.find(order => order.id === orderId);

export const selectOrdersByStatus = (status: Order['status']) => (state: { adminOrders: AdminOrderState }) =>
  state.adminOrders.orders.filter(order => order.status === status);

export const selectOrdersByPaymentStatus = (paymentStatus: Order['paymentStatus']) => (state: { adminOrders: AdminOrderState }) =>
  state.adminOrders.orders.filter(order => order.paymentStatus === paymentStatus);

export const selectOrdersStats = (state: { adminOrders: AdminOrderState }) => {
  const orders = state.adminOrders.orders;
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
    cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    totalRevenue: orders
      .filter(o => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.totalPrice, 0),
    pendingPayments: orders.filter(o => o.paymentStatus === 'PENDING').length,
  };
};

export const selectIsOrderUpdating = (orderId: string) => (state: { adminOrders: AdminOrderState }) =>
  state.adminOrders.actionLoading.updating === orderId;

export const selectIsOrderDeleting = (orderId: string) => (state: { adminOrders: AdminOrderState }) =>
  state.adminOrders.actionLoading.deleting === orderId;

export default adminOrderSlice.reducer;

// Helper function to create filter query string
export const createFilterQuery = (filters: Partial<OrderFilters>): string => {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.search) params.append('search', filters.search);
  
  return params.toString();
};

// Action creators for common operations
export const refreshOrders = (filters?: Partial<OrderFilters>) => (dispatch: AppDispatch, getState: () => RootState) => {
  const currentFilters = getState().adminOrders.filters;
  dispatch(fetchOrders({ ...currentFilters, ...filters }));
};

export const updateOrderStatus = (orderId: string, status: Order['status']) => (dispatch: AppDispatch) => {
  // Optimistic update
  dispatch(optimisticUpdateOrder({ id: orderId, updates: { status } }));
  
  // Actual update
  return dispatch(updateOrder({ id: orderId, status }));
};

export const updatePaymentStatus = (orderId: string, paymentStatus: Order['paymentStatus']) => (dispatch: AppDispatch) => {
  // Optimistic update
  dispatch(optimisticUpdateOrder({ id: orderId, updates: { paymentStatus } }));
  
  // Actual update
  return dispatch(updateOrder({ id: orderId, paymentStatus }));
};

export const searchOrders =
  (searchTerm: string) =>
  (
    dispatch: AppDispatch,
    getState: () => { adminOrders: { filters: OrderFilters } }
  ) => {
    const currentFilters = getState().adminOrders.filters;
    dispatch(setFilters({ search: searchTerm, page: 1 }));
    dispatch(fetchOrders({ ...currentFilters, search: searchTerm, page: 1 }));
  };

  export const filterOrdersByDate = (startDate?: Date, endDate?: Date) => (dispatch: AppDispatch, getState: () => RootState) => {
  const currentFilters = getState().adminOrders.filters;
  
  // Store dates as ISO strings in Redux
  const newFilters = {
    ...currentFilters,
    dateRange: {
      from: startDate ? startDate.toISOString() : null,
      to: endDate ? endDate.toISOString() : null,
    },
    startDate: startDate ? startDate.toISOString() : undefined,
    endDate: endDate ? endDate.toISOString() : undefined,
    page: 1
  };
  
  dispatch(setFilters(newFilters));
  
  // For the API call, use ISO strings
  dispatch(fetchOrders({ 
    ...currentFilters, 
    startDate: startDate ? startDate.toISOString() : undefined, 
    endDate: endDate ? endDate.toISOString() : undefined, 
    page: 1 
  }));
};

export const filterOrdersByStatus = (status?: string, paymentStatus?: string) => (dispatch: AppDispatch, getState: () => RootState) => {
  const currentFilters = getState().adminOrders.filters;
  dispatch(setFilters({ status, paymentStatus, page: 1 }));
  dispatch(fetchOrders({ ...currentFilters, status, paymentStatus, page: 1 }));
};