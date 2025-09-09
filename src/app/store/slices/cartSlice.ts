// store/slices/cartSlice.js
import { Product, UnitPrice } from "@/types/products";
import { CartItemWithProduct } from "@/types/carts";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import axios from "axios";
import api from "@/lib/api";
import { createSelector } from '@reduxjs/toolkit';
import { StorageUtil, STORAGE_KEYS } from '@/lib/storageKeys';
import { RootState } from "..";
import { handleApiError } from "@/lib/error";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CartState {
  items: CartItemWithProduct[];
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  guestId: string | null;
  userId: string | null;
  subtotal: number;
  itemCount: number;
  isAuthenticated: boolean;
}

// Authentication token helper (only for merge operation)
const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("auth_token");
  return token ? `Bearer ${token}` : null;
};

const saveCartToStorage = (cartData: {
  items: CartItemWithProduct[];
  subtotal: number;
  itemCount: number;
  timestamp?: number;
  guestId?: string | null;
  isAuthenticated?: boolean;
}) => {
  if (typeof window === "undefined") return;

  try {
    if (!cartData) {
      console.warn("Cart data is undefined, skipping localStorage save");
      return;
    }

    const dataToSave = {
      items: Array.isArray(cartData.items) ? cartData.items : [],
      subtotal: typeof cartData.subtotal === "number" ? cartData.subtotal : 0,
      itemCount:
        typeof cartData.itemCount === "number" ? cartData.itemCount : 0,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.CART_DATA_KEY, JSON.stringify(dataToSave));
  } catch (error) {
    console.error("Failed to save cart to localStorage:", error);
  }
};

const loadCartFromStorage = () => {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CART_DATA_KEY);
    if (!stored) return null;

    const cartData = JSON.parse(stored);

    // Check if data is not too old (e.g., 30 days)
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - cartData.timestamp > thirtyDaysInMs) {
      localStorage.removeItem(STORAGE_KEYS.CART_DATA_KEY);
      return null;
    }

    return cartData;
  } catch (error) {
    console.error("Failed to load cart from localStorage:", error);
    localStorage.removeItem(STORAGE_KEYS.CART_DATA_KEY);
    return null;
  }
};


const calculateTotals = (items: CartItemWithProduct[]) => {
  const subtotal = items.reduce((sum, item) => {
    let price: number;

    // Determine price based on product pricing structure
    if (item.product?.hasFixedPrice && item.fixedPrice !== undefined) {
      price = item.fixedPrice;
    } else if (!item.product?.hasFixedPrice && item.unitPrice !== undefined) {
      price = item.unitPrice;
    } else if (!item.product?.hasFixedPrice && item.selectedUnit) {
      price = item.selectedUnit.price;
    } else if (item.product?.fixedPrice !== undefined) {
      // Fallback to product's fixed price
      price = item.product.fixedPrice;
    } else if (item.product?.unitPrices && item.product.unitPrices.length > 0) {
      // Fallback to first unit price
      price = item.product.unitPrices[0].price;
    } else {
      price = 0;
    }

    return sum + Number(price) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return { subtotal, itemCount };
};

// Fetch cart for a user
export const fetchCart = createAsyncThunk(
  "cart/fetchCart",
  async ({ userId, guestId }: { userId?: string | null; guestId?: string | null }, { rejectWithValue }) => {
    try {
      const response = await axios.get("/api/carts", {
        params: { userId, guestId }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch cart"
      );
    }
  }
);

export const addItemToCart = createAsyncThunk(
  "cart/addItem",
  async (
    {
      product,
      quantity = 1,
      selectedUnit,
      userId, 
    }: {
      product: Product;
      quantity?: number;
      selectedUnit?: UnitPrice | null;
      userId?: string | null; 
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const currentGuestId = state.cart.guestId ||  StorageUtil.getGuestId();

      // Determine the price to use based on product structure
      let itemPrice: number;
      let priceUnit: string | null = null;

      if (product.hasFixedPrice && product.fixedPrice !== undefined) {
        itemPrice = product.fixedPrice;
        priceUnit = null;
      } else if (!product.hasFixedPrice && product.unitPrices && selectedUnit) {
        itemPrice = selectedUnit.price;
        priceUnit = selectedUnit.unit;
      } else if (
        !product.hasFixedPrice &&
        product.unitPrices &&
        product.unitPrices.length > 0
      ) {
        itemPrice = product.unitPrices[0].price;
        priceUnit = product.unitPrices[0].unit;
      } else {
        return rejectWithValue("Product pricing information is incomplete");
      }

      // Prepare cart item data - userId here is actually clerkId
      const cartItemData = {
        productId: product.id,
        quantity,
        price: itemPrice,
        unit: priceUnit,
        userId: userId || null, // API treats this as clerkId
        guestId: userId ? null : currentGuestId,
      };

      console.log("Adding item to cart:", cartItemData);

      // Single API call without auth headers (works for both authenticated and guest users)
      try {
        const response = await axios.post("/api/carts", cartItemData);
        const cartSummary = response.data.data.cartSummary;

        // Update guest ID if returned from server and no userId
        if (!userId && cartSummary.guestId && typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.GUEST_ID_KEY, cartSummary.guestId);
        }

        // Save to localStorage as backup
        saveCartToStorage(cartSummary);

        return cartSummary;
      } catch (apiError) {
        console.log("API failed, adding item to localStorage cart");

        // Fallback to localStorage management for guests only
        if (userId) {
          throw apiError; // Don't fallback for authenticated users
        }

        const currentCart = loadCartFromStorage() || {
          items: [],
          subtotal: 0,
          itemCount: 0,
        };

        // Check if item already exists
        const existingItemIndex = currentCart.items.findIndex(
          (item: CartItemWithProduct) => {
            const isSameProduct =
              item.productId === product.id || item.product?.id === product.id;

            if (product.hasFixedPrice) {
              return isSameProduct;
            }

            return isSameProduct && item.selectedUnit?.unit === priceUnit;
          }
        );

        if (existingItemIndex >= 0) {
          // Update existing item
          currentCart.items[existingItemIndex].quantity += quantity;
        } else {
          // Add new item
          const newItem: CartItemWithProduct = {
            id: StorageUtil.generateCartItemId(),
            productId: product.id,
            quantity,
            product,
            fixedPrice: product.hasFixedPrice ? itemPrice : undefined,
            unitPrice: !product.hasFixedPrice ? itemPrice : undefined,
            selectedUnit:
              !product.hasFixedPrice && selectedUnit ? selectedUnit : undefined,
          };
          currentCart.items.push(newItem);
        }

        // Recalculate totals
        const { subtotal, itemCount } = calculateTotals(currentCart.items);

        const updatedCart = {
          items: currentCart.items,
          subtotal,
          itemCount,
          guestId: currentGuestId,
          isAuthenticated: false,
        };

        saveCartToStorage(updatedCart);
        return updatedCart;
      }
    } catch (error: unknown) { 
      return rejectWithValue(
        handleApiError(error) || "Failed to add item to cart"
      );
    }
  }
);

// Update quantity (no auth headers needed - uses userId/guestId params)
export const updateCartQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ cartItemId, quantity }: { cartItemId: string; quantity: number }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { userId, guestId } = state.cart; // userId is actually clerkId in state
      
      try {
        // Make API call without auth headers (uses userId/guestId params)
        const response = await axios.put('/api/carts', {
          cartItemId,
          quantity,
          userId, // API treats this as clerkId
          guestId
        });

        if (response.data.success) {
          const updatedCart = response.data.data;
          
          // Save the authoritative cart state from API
          saveCartToStorage(updatedCart);
          return updatedCart;
        } else {
          throw new Error(response.data.error || 'Update failed');
        }
        
      } catch (apiError: unknown) {
        console.log('API failed, updating quantity in localStorage cart:', 
          apiError instanceof Error ? apiError.message : 'Unknown error');
        
        // Fallback to localStorage update for guests only
        if (userId) {
          throw apiError; // Don't fallback for authenticated users
        }
        
        const currentCart = loadCartFromStorage() || { items: [], subtotal: 0, itemCount: 0 };
        const itemIndex = currentCart.items.findIndex((item: CartItemWithProduct) => item.id === cartItemId);
        
        if (itemIndex >= 0) {
          if (quantity > 0) {
            currentCart.items[itemIndex].quantity = quantity;
          } else {
            currentCart.items.splice(itemIndex, 1);
          }
          
          const { subtotal, itemCount } = calculateTotals(currentCart.items);
          const updatedCart = {
            ...currentCart,
            items: currentCart.items,
            subtotal,
            itemCount,
          };
          
          saveCartToStorage(updatedCart);
          return updatedCart;
        }
        
        throw new Error('Cart item not found in local storage');
      }
      
    } catch (error: unknown) { 
      return rejectWithValue(handleApiError(error) || 'Failed to update cart item');
    }
  }
);

// Remove item (no auth headers needed - uses userId/guestId params)
export const removeCartItem = createAsyncThunk(
  "cart/removeItem",
  async (cartItemId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { userId, guestId } = state.cart; // userId is actually clerkId in state
      
      try {
        // API treats userId as clerkId
        const queryParams = new URLSearchParams({
          cartItemId,
          ...(userId && { userId }), // API treats this as clerkId
          ...(guestId && { guestId })
        });
        
        const response = await axios.delete(`/api/carts?${queryParams}`);
        
        const updatedCartSummary = response.data.data;
        saveCartToStorage(updatedCartSummary);
        return updatedCartSummary;
      } catch (apiError) {
        console.log("API failed, removing item from localStorage cart");

        // Fallback to localStorage for guests only
        if (userId) {
          throw apiError;
        }

        const currentCart = loadCartFromStorage() || {
          items: [],
          subtotal: 0,
          itemCount: 0,
        };

        currentCart.items = currentCart.items.filter(
          (item: CartItemWithProduct) => item.id !== cartItemId
        );

        const { subtotal, itemCount } = calculateTotals(currentCart.items);
        const updatedCart = {
          items: currentCart.items,
          subtotal,
          itemCount,
        };

        saveCartToStorage(updatedCart);
        return updatedCart;
      }
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error) || "Failed to remove item");
    }
  }
);

// Reduce quantity (no auth headers needed - uses userId/guestId params)
export const reduceCartQuantity = createAsyncThunk(
  "cart/reduceQuantity",
  async (cartItemId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { userId, guestId } = state.cart; // userId is actually clerkId in state
      
      try {
        // API treats userId as clerkId
        const queryParams = new URLSearchParams({
          cartItemId,
          reduceQuantity: 'true',
          ...(userId && { userId }), // API treats this as clerkId
          ...(guestId && { guestId })
        });
        
        const response = await axios.delete(`/api/carts?${queryParams}`);
        
        const updatedCartSummary = response.data.data;
        saveCartToStorage(updatedCartSummary);
        return updatedCartSummary;
      } catch (apiError) {
        console.log("API failed, reducing quantity in localStorage cart");

        // Fallback to localStorage for guests only
        if (userId) {
          throw apiError;
        }

        const currentCart = loadCartFromStorage() || {
          items: [],
          subtotal: 0,
          itemCount: 0,
        };

        const itemIndex = currentCart.items.findIndex(
          (item: CartItemWithProduct) => item.id === cartItemId
        );

        if (itemIndex >= 0) {
          const currentQuantity = currentCart.items[itemIndex].quantity;

          if (currentQuantity > 1) {
            currentCart.items[itemIndex].quantity = currentQuantity - 1;
          } else {
            currentCart.items.splice(itemIndex, 1);
          }

          const { subtotal, itemCount } = calculateTotals(currentCart.items);
          const updatedCart = {
            items: currentCart.items,
            subtotal,
            itemCount,
          };

          saveCartToStorage(updatedCart);
          return updatedCart;
        }

        throw new Error("Cart item not found");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        handleApiError(error) || "Failed to reduce quantity"
      );
    }
  }
);

// Clear cart (no auth headers needed - uses userId/guestId params)
export const clearEntireCart = createAsyncThunk(
  "cart/clearCart",
  async (
    { userId, guestId }: { userId: string | null; guestId: string | null },
    { rejectWithValue }
  ) => {
    try {
      console.log("🧪 clearEntireCart called with:", { userId, guestId });
      
      // Check if we have the required parameters
      if (!userId && !guestId) {
        console.log("No userId or guestId, clearing local storage only");
        StorageUtil.clearCartData();
        return {
          items: [],
          subtotal: 0,
          itemCount: 0,
        };
      }
      
      try {
        const queryParams = new URLSearchParams();
        queryParams.append('clearCart', 'true');
        
        // Add the required parameters
        if (userId) {
          queryParams.append('userId', userId);
        }
        if (guestId) {
          queryParams.append('guestId', guestId);
        }
        
        const url = `/api/carts?${queryParams.toString()}`;
        console.log("📡 Making API call to:", url);
        
        const response = await axios.delete(url);
        console.log("✅ API response:", response.data);
        
        StorageUtil.clearCartData();
        return {
          items: [],
          subtotal: 0,
          itemCount: 0,
        };
      } catch (apiError) {
        console.error("❌ API error:", apiError);
        // Even if API fails, clear local storage
        StorageUtil.clearCartData();
        return {
          items: [],
          subtotal: 0,
          itemCount: 0,
        };
      }
    } catch (error: unknown) {
      return rejectWithValue(handleApiError(error) || "Failed to clear cart");
    }
  }
);

// Merge cart (ONLY this operation needs auth headers)
export const mergeGuestCart = createAsyncThunk(
  "cart/mergeCart",
  async ({ userId }: { userId: string }, { rejectWithValue }) => {
    try {
      if (!userId) {
        throw new Error("User ID is required for cart merge")
      }

      // FIXED: Use getGuestIdForMerge to get guest ID even when user is logged in
      const currentGuestId = StorageUtil.getGuestIdForMerge()
      
      // Return success immediately if no guest cart exists
      if (!currentGuestId) {
        console.log("ℹ️ No guest cart to merge - returning empty result")
        return { 
          items: [], 
          itemCount: 0,
          subtotal: 0,
          message: "No guest cart found",
          success: true
        }
      }

      console.log("🔄 Starting cart merge...", { userId, guestId: currentGuestId })

      // Call the merge API endpoint
      const response = await api.post("/api/carts/merge", {
        guestId: currentGuestId
      }, {
        headers: {
          Authorization: getAuthToken()
        },
        timeout: 10000
      })

      const mergedCart = response.data.data
      console.log("✅ Received merged cart from API:", {
        itemCount: mergedCart?.items?.length || 0,
        subtotal: mergedCart?.subtotal || 0
      })

      // ONLY clear guest ID after successful API response
      StorageUtil.clearGuestId()
      console.log("🧹 Cleared guest ID after successful merge")
      
      // Ensure user ID is properly set
      StorageUtil.setUserId(userId)
      
      // Save the merged cart to localStorage
      if (mergedCart) {
        saveCartToStorage(mergedCart)
        console.log("💾 Saved merged cart to localStorage")
      }

      return {
        ...mergedCart,
        message: "Cart merged successfully",
        success: true
      }
      
    } catch (error: unknown) {
      console.error("❌ Cart merge failed:", error);
      
      // Enhanced error handling with proper typing
      let errorMessage = "Failed to merge cart";
      
      // Type guard for axios-like errors
      const isAxiosError = (err: unknown): err is { 
        code?: string;
        message?: string;
        response?: {
          status?: number;
          data?: { message?: string };
        };
      } => {
        return typeof err === 'object' && err !== null;
      };
    
      if (isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          errorMessage = "Request timeout - please try again";
        } else if (error.response?.status === 404) {
          errorMessage = "Guest cart not found";
        } else if (error.response?.status && error.response.status >= 500) {
          errorMessage = "Server error - please try again";
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      // DON'T clear guest ID on failure so user can retry
      console.log("🔒 Preserving guest ID for retry opportunity");
      
      return rejectWithValue(errorMessage);
    }
  }
)

// Initialize cart from localStorage
const initializeFromStorage = () => {
  const guestId = StorageUtil.getGuestId();
  const cartData = loadCartFromStorage();

  return {
    items: cartData?.items || [],
    isOpen: false,
    loading: false,
    error: null,
    guestId,
    userId: null, // This will store clerkId when user is authenticated
    subtotal: cartData?.subtotal || 0,
    itemCount: cartData?.itemCount || 0,
    isAuthenticated: false,
  };
};

const initialState =
  typeof window !== "undefined"
    ? initializeFromStorage()
    : {
        items: [] as CartItemWithProduct[],
        isOpen: false,
        loading: false,
        error: null as string | null,
        guestId: null as string | null,
        userId: null as string | null, // This will store clerkId when user is authenticated
        subtotal: 0,
        itemCount: 0,
        isAuthenticated: false,
      };

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },

    closeCart: (state) => {
      state.isOpen = false;
    },

    openCart: (state) => {
      state.isOpen = true;
    },

    initializeGuestId: (state) => {
      const guestId = StorageUtil.getGuestId();
      state.guestId = guestId;
    },

    clearError: (state) => {
      state.error = null;
    },

    // FIXED: Updated to handle userId properly
    setAuthenticated: (state, action) => {
      const { isAuthenticated, userId } = action.payload;
      state.isAuthenticated = isAuthenticated;
      state.userId = userId || null;

      // If user logs out, reinitialize guest cart
      if (!isAuthenticated) {
        const guestId = StorageUtil.getGuestId();
        state.guestId = guestId;
        state.userId = null;

        // Load cart from localStorage if available
        const cartData = loadCartFromStorage();
        if (cartData) {
          state.items = cartData.items;
          state.subtotal = cartData.subtotal;
          state.itemCount = cartData.itemCount;
        }
      }
    },

    // Load cart from localStorage on app start
    loadCartFromStorage: (state) => {
      const storedCart = loadCartFromStorage();
      if (storedCart) {
        state.items = storedCart.items || [];
        state.subtotal = storedCart.subtotal || 0;
        state.itemCount = storedCart.itemCount || 0;
        state.guestId = storedCart.guestId || null;
        state.isAuthenticated = storedCart.isAuthenticated || false;
      }
    },

    // Sync with localStorage
    syncWithStorage: (state) => {
      const cartData = loadCartFromStorage();
      if (cartData) {
        state.items = cartData.items;
        state.subtotal = cartData.subtotal;
        state.itemCount = cartData.itemCount;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch Cart
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;

        // Ensure payload has the expected structure
        const payload = action.payload || {};

        state.items = Array.isArray(payload.items) ? payload.items : [];
        state.subtotal =
          typeof payload.subtotal === "number" ? payload.subtotal : 0;
        state.itemCount =
          typeof payload.itemCount === "number" ? payload.itemCount : 0;
        state.isAuthenticated = Boolean(payload.isAuthenticated);
        state.userId = payload.userId || null; // ADDED: Set userId from response

        // Update guest ID if provided
        if (payload.guestId) {
          state.guestId = payload.guestId;
        }

        // Save to localStorage for guest users
        if (!payload.isAuthenticated) {
          saveCartToStorage(payload);
        }
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to load cart: ${action.payload}`);
      });

    // Add Item
    builder
      .addCase(addItemToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addItemToCart.fulfilled, (state, action) => {
        state.loading = false;

        // Ensure payload has the expected structure
        const payload = action.payload || {};
        const productName = action.meta.arg.product.name;

        state.items = Array.isArray(payload.items) ? payload.items : [];
        state.subtotal =
          typeof payload.subtotal === "number" ? payload.subtotal : 0;
        state.itemCount =
          typeof payload.itemCount === "number" ? payload.itemCount : 0;
        state.isAuthenticated = Boolean(payload.isAuthenticated);
        state.userId = payload.userId || null; // ADDED: Set userId from response

        // Update guest ID if provided
        if (payload.guestId) {
          state.guestId = payload.guestId;
        }

        // Save to localStorage for guest users
        if (!payload.isAuthenticated) {
          saveCartToStorage(payload);
        }
        toast.success(`${productName} added to cart!`);
      })

      .addCase(addItemToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to add item: ${action.payload}`);
      });

    // Update Quantity
    builder
      .addCase(updateCartQuantity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        state.loading = false;

        // Ensure payload has the expected structure
        const payload = action.payload || {};
        const { cartItemId, quantity } = action.meta.arg;
        const product = state.items.find(
          (item) => item.id === cartItemId
        );

        state.items = Array.isArray(payload.items)
          ? payload.items
          : state.items;
        state.subtotal =
          typeof payload.subtotal === "number"
            ? payload.subtotal
            : state.subtotal;
        state.itemCount =
          typeof payload.itemCount === "number"
            ? payload.itemCount
            : state.itemCount;
        state.userId = payload.userId || state.userId; // ADDED: Update userId if provided

        // Save to localStorage for guest users
        if (!state.isAuthenticated) {
          saveCartToStorage({
            items: state.items,
            subtotal: state.subtotal,
            itemCount: state.itemCount,
          });
        }
        if (product) {
          toast.info(`Updated ${product.product.name} quantity to ${quantity}`);
        }
      })
      .addCase(updateCartQuantity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to update quantity: ${action.payload}`);
      });

    // Remove Item
    builder
      .addCase(removeCartItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.loading = false;

        // FIXED: Use payload directly, not payload.response
        const payload = action.payload || {};
        const cartItemId = action.meta.arg;
        const product = state.items.find((item) => item.id === cartItemId);

        state.items = Array.isArray(payload.items)
          ? payload.items
          : state.items;
        state.subtotal =
          typeof payload.subtotal === "number"
            ? payload.subtotal
            : state.subtotal;
        state.itemCount =
          typeof payload.itemCount === "number"
            ? payload.itemCount
            : state.itemCount;
        state.userId = payload.userId || state.userId; // ADDED: Update userId if provided

        // Save to localStorage for guest users
        if (!state.isAuthenticated) {
          saveCartToStorage({
            items: state.items,
            subtotal: state.subtotal,
            itemCount: state.itemCount,
          });
        }

        if (product) {
          toast.warning(`${product.product.name} removed from cart`);
        }
      })

      .addCase(removeCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to remove item: ${action.payload}`);
      });

    // Reduce Quantity
    builder
      .addCase(reduceCartQuantity.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(reduceCartQuantity.fulfilled, (state, action) => {
        state.loading = false;

        // FIXED: Use payload directly, not payload.response
        const payload = action.payload || {};
        const cartItemId = action.meta.arg;
        const product = state.items.find((item) => item.id === cartItemId);

        state.items = Array.isArray(payload.items)
          ? payload.items
          : state.items;
        state.subtotal =
          typeof payload.subtotal === "number"
            ? payload.subtotal
            : state.subtotal;
        state.itemCount =
          typeof payload.itemCount === "number"
            ? payload.itemCount
            : state.itemCount;
        state.userId = payload.userId || state.userId; // ADDED: Update userId if provided

        // Save to localStorage for guest users
        if (!state.isAuthenticated) {
          saveCartToStorage({
            items: state.items,
            subtotal: state.subtotal,
            itemCount: state.itemCount,
          });
        }
        if (product) {
          toast.info(`Reduced ${product.product.name} quantity`);
        }
      })
      .addCase(reduceCartQuantity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to reduce quantity: ${action.payload}`);
      });

    // Clear Cart
    builder
      .addCase(clearEntireCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearEntireCart.fulfilled, (state) => {
        state.loading = false;
        state.items = [];
        state.subtotal = 0;
        state.itemCount = 0;

        // Clear localStorage
        StorageUtil.clearCartData();
      })
      .addCase(clearEntireCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to clear cart: ${action.payload}`);
      });

    // Merge Cart
    builder
      .addCase(mergeGuestCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        state.loading = false;

        // Ensure payload has the expected structure
        const payload = action.payload || {};

        state.items = Array.isArray(payload.items) ? payload.items : [];
        state.subtotal =
          typeof payload.subtotal === "number" ? payload.subtotal : 0;
        state.itemCount =
          typeof payload.itemCount === "number" ? payload.itemCount : 0;
        state.guestId = null; // Clear guest ID after merge
        state.isAuthenticated = true; // User is now authenticated
        state.userId = action.meta.arg.userId; // ADDED: Set userId from merge action

        // Clear localStorage after merge
        StorageUtil.clearGuestId();
        // StorageUtil.clearCartData();
        toast.success("Guest cart merged successfully!");
      })
      .addCase(mergeGuestCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to merge cart: ${action.payload}`);
      });
  },
});

export const {
  toggleCart,
  closeCart,
  openCart,
  initializeGuestId,
  clearError,
  setAuthenticated,
  syncWithStorage,
  loadCartFromStorage: loadCartAction,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartLoading = (state: RootState) => state.cart.loading;
export const selectCartError = (state: RootState) => state.cart.error;
export const selectCartIsOpen = (state: RootState) => state.cart.isOpen;
export const selectCartSubtotal = (state: RootState) => state.cart.subtotal;
export const selectCartItemCount = (state: RootState) => state.cart.itemCount;
export const selectGuestId = (state: RootState) => state.cart.guestId;
export const selectUserId = (state: RootState) => state.cart.userId;
export const selectIsAuthenticated = (state: RootState) => state.cart.isAuthenticated;

// Computed selectors
export const selectCartTotals = (state: RootState) => ({
  totalItems: state.cart.itemCount,
  totalPrice: state.cart.subtotal,
});

export const selectItemQuantity = (productId: string) => (state: RootState) => {
  const item = state.cart.items.find(
    (item: CartItemWithProduct) =>
      item.productId === productId || item.product?.id === productId
  );
  return item ? item.quantity : 0;
};

// ADDED: New selector for user identification
export const selectUserIdentification = createSelector(
  [
    (state: RootState) => state.cart.userId, 
    (state: RootState) => state.cart.guestId, 
    (state: RootState) => state.cart.isAuthenticated 
  ],
  (userId, guestId, isAuthenticated) => ({
    userId,
    guestId,
    isAuthenticated
  })
);

export default cartSlice.reducer