// store/slices/checkoutSlice.ts
import {
  Checkout,
  CheckoutState,
  CreateCheckoutResponse,
  CreateCheckoutRequest,
  DeliveryInfo,
} from "@/types/checkout";
import { Order } from "@/types/orders";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import { handleApiError } from "@/lib/error";
import axios from "axios";
import { Invoice } from "@/types/invoice";

// Initial state
const initialState: CheckoutState = {
  currentCheckout: null,
  checkouts: [],
  currentOrder: null,
  orders: [],
  currentInvoice: null,
  paymentUrl: null,
  paymentReference: null,
  deliveryInfo: null,
  isCreatingCheckout: false,
  isFetchingCheckouts: false,
  isFetchingOrder: false,
  checkoutError: null,
  orderError: null,
  showInvoice: false,
  paymentMethod: null,
};


// Create checkout session
export const createCheckout = createAsyncThunk<
  { // Return type - match what you're actually returning
    checkout: CreateCheckoutResponse;
    order: Order;
    showInvoice: boolean;
    success: boolean;
    invoice?: Invoice;
    paymentUrl?: string;
    paymentReference?: string;
    deliveryInfo?: DeliveryInfo;
    message?: string;
  },
  CreateCheckoutRequest,
  { rejectValue: string }
>("checkout/createCheckout", async (checkoutData, { rejectWithValue }) => {
  try {
    const response = await api.post<CreateCheckoutResponse>(
      "/api/checkout",
      checkoutData,
    );

    // Ensure the response contains all necessary order data
    if (!response.data.order) {
      throw new Error("Order data missing from response");
    }

    // Return the response data directly with proper structure
    return {
      ...response.data, // This includes paymentUrl, paymentReference, etc.
      checkout: response.data,
      order: response.data.order,
      showInvoice: checkoutData.paymentMethod === 'bank_transfer'
    };
    
  } catch (error) {
    return rejectWithValue(handleApiError(error));
  }
});

// Fetch checkout sessions
export const fetchCheckouts = createAsyncThunk<
  Checkout[],
  void,
  { rejectValue: string }
>("checkout/fetchCheckouts", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/api/checkout", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    return response.data;
  } catch (error) {
    return rejectWithValue(handleApiError(error));
  }
});

// Fetch specific checkout by ID
export const fetchCheckoutById = createAsyncThunk<
  Checkout,
  string,
  { rejectValue: string }
>("checkout/fetchCheckoutById", async (checkoutId, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/checkout/${checkoutId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return rejectWithValue(data.error || "Failed to fetch checkout");
    }

    return data.checkout;
  } catch (error) {
    return rejectWithValue(handleApiError(error));
  }
});

// Fetch order by ID
export const fetchOrderById = createAsyncThunk<
  Order,
  string,
  { rejectValue: string }
>("checkout/fetchOrderById", async (orderId, { rejectWithValue }) => {
  try {
    const response = await api.get(`/api/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch order')
      }

    return response.data.data;
  } catch (error) {
    return rejectWithValue(handleApiError(error));
  }
});

// Update checkout status
export const updateCheckoutStatus = createAsyncThunk<
  Checkout,
  { checkoutId: string; status: string },
  { rejectValue: string }
>(
  "checkout/updateCheckoutStatus",
  async ({ checkoutId, status }, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`/api/checkout/${checkoutId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to update status')
      }

      return response.data.data;
    } catch (error) {
        return rejectWithValue(handleApiError(error));
      }
  }
);

// Verify payment status
export const verifyPayment = createAsyncThunk<
  { order: Order; paymentStatus: string },
  string,
  { rejectValue: string }
>("checkout/verifyPayment", async (paymentReference, { rejectWithValue }) => {
  try {
    const response = await fetch(`/api/payments/verify/${paymentReference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return rejectWithValue(data.error || "Failed to verify payment");
    }

    return data;
} catch (error) {
    return rejectWithValue(handleApiError(error));
  }
});

// Create checkout slice
const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    // Clear current checkout
    clearCurrentCheckout: (state) => {
      state.currentCheckout = null;
      state.paymentUrl = null;
      state.paymentReference = null;
      state.checkoutError = null;
    },

    // Clear current order
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
      state.orderError = null;
    },

    // Clear current invoice
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
      state.showInvoice = false;
    },

    // Set payment method
    setPaymentMethod: (
      state,
      action: PayloadAction<"opay" | "bank_transfer">
    ) => {
      state.paymentMethod = action.payload;
    },

    // Toggle invoice display
    toggleInvoiceDisplay: (state) => {
      state.showInvoice = !state.showInvoice;
    },

    // Set show invoice
    setShowInvoice: (state, action: PayloadAction<boolean>) => {
      state.showInvoice = action.payload;
    },

    // Clear errors
    clearErrors: (state) => {
      state.checkoutError = null;
      state.orderError = null;
    },

    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },

    // Reset checkout state
    resetCheckoutState: () => initialState,
  },

  extraReducers: (builder) => {
    // Create checkout
    builder
      .addCase(createCheckout.pending, (state) => {
        state.isCreatingCheckout = true;
        state.checkoutError = null;
      })
      .addCase(createCheckout.fulfilled, (state, action) => {
        state.isCreatingCheckout = false;

        if (action.payload.checkout) {
          state.currentCheckout = action.payload.checkout;
          state.checkouts.push(action.payload.checkout);
        }

        if (action.payload.order) {
          state.currentOrder = action.payload.order;
        }

        if (action.payload.invoice) {
          state.currentInvoice = action.payload.invoice;
        }

        if (action.payload.paymentUrl) {
          state.paymentUrl = action.payload.paymentUrl;
        }

        if (action.payload.paymentReference) {
          state.paymentReference = action.payload.paymentReference;
        }

        if (action.payload.deliveryInfo) {
          state.deliveryInfo = action.payload.deliveryInfo;
        }

        if (action.payload.showInvoice) {
          state.showInvoice = action.payload.showInvoice;
        }
      })
      .addCase(createCheckout.rejected, (state, action) => {
        state.isCreatingCheckout = false;
        state.checkoutError = action.payload || "Failed to create checkout";
      });

    // Fetch checkouts
    builder
      .addCase(fetchCheckouts.pending, (state) => {
        state.isFetchingCheckouts = true;
        state.checkoutError = null;
      })
      .addCase(fetchCheckouts.fulfilled, (state, action) => {
        state.isFetchingCheckouts = false;
        state.checkouts = action.payload;
      })
      .addCase(fetchCheckouts.rejected, (state, action) => {
        state.isFetchingCheckouts = false;
        state.checkoutError = action.payload || "Failed to fetch checkouts";
      });

    // Fetch checkout by ID
    builder
      .addCase(fetchCheckoutById.pending, (state) => {
        state.isFetchingCheckouts = true;
        state.checkoutError = null;
      })
      .addCase(fetchCheckoutById.fulfilled, (state, action) => {
        state.isFetchingCheckouts = false;
        state.currentCheckout = action.payload;

        // Update in checkouts array if it exists
        const index = state.checkouts.findIndex(
          (c) => c.id === action.payload.id
        );
        if (index !== -1) {
          state.checkouts[index] = action.payload;
        }
      })
      .addCase(fetchCheckoutById.rejected, (state, action) => {
        state.isFetchingCheckouts = false;
        state.checkoutError = action.payload || "Failed to fetch checkout";
      });

    // Fetch order by ID
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.isFetchingOrder = true;
        state.orderError = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.isFetchingOrder = false;
        state.currentOrder = action.payload;

        // Update in orders array if it exists
        const index = state.orders.findIndex((o) => o.id === action.payload.id);
        if (index !== -1) {
          state.orders[index] = action.payload;
        } else {
          state.orders.push(action.payload);
        }
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.isFetchingOrder = false;
        state.orderError = action.payload || "Failed to fetch order";
      });

    // Update checkout status
    builder.addCase(updateCheckoutStatus.fulfilled, (state, action) => {
      state.currentCheckout = action.payload;

      // Update in checkouts array
      const index = state.checkouts.findIndex(
        (c) => c.id === action.payload.id
      );
      if (index !== -1) {
        state.checkouts[index] = action.payload;
      }
    });

    // Verify payment
    builder.addCase(verifyPayment.fulfilled, (state, action) => {
      if (action.payload.order) {
        state.currentOrder = action.payload.order;

        // Update in orders array
        const index = state.orders.findIndex(
          (o) => o.id === action.payload.order.id
        );
        if (index !== -1) {
          state.orders[index] = action.payload.order;
        }
      }
    });
  },
});

// Export actions
export const {
  clearCurrentCheckout,
  clearCurrentOrder,
  clearCurrentInvoice,
  setPaymentMethod,
  toggleInvoiceDisplay,
  setShowInvoice,
  clearErrors,
  resetCheckoutState,
} = checkoutSlice.actions;

// Selectors
export const selectCurrentCheckout = (state: { checkout: CheckoutState }) =>
  state.checkout.currentCheckout;
export const selectCheckouts = (state: { checkout: CheckoutState }) =>
  state.checkout.checkouts;
export const selectCurrentOrder = (state: { checkout: CheckoutState }) =>
  state.checkout.currentOrder;
export const selectOrders = (state: { checkout: CheckoutState }) =>
  state.checkout.orders;
export const selectCurrentInvoice = (state: { checkout: CheckoutState }) =>
  state.checkout.currentInvoice;
export const selectPaymentUrl = (state: { checkout: CheckoutState }) =>
  state.checkout.paymentUrl;
export const selectPaymentReference = (state: { checkout: CheckoutState }) =>
  state.checkout.paymentReference;
export const selectDeliveryInfo = (state: { checkout: CheckoutState }) =>
  state.checkout.deliveryInfo;
export const selectIsCreatingCheckout = (state: { checkout: CheckoutState }) =>
  state.checkout.isCreatingCheckout;
export const selectIsFetchingCheckouts = (state: { checkout: CheckoutState }) =>
  state.checkout.isFetchingCheckouts;
export const selectIsFetchingOrder = (state: { checkout: CheckoutState }) =>
  state.checkout.isFetchingOrder;
export const selectCheckoutError = (state: { checkout: CheckoutState }) =>
  state.checkout.checkoutError;
export const selectOrderError = (state: { checkout: CheckoutState }) =>
  state.checkout.orderError;
export const selectShowInvoice = (state: { checkout: CheckoutState }) =>
  state.checkout.showInvoice;
export const selectPaymentMethod = (state: { checkout: CheckoutState }) =>
  state.checkout.paymentMethod;

// Export reducer
export default checkoutSlice.reducer;
