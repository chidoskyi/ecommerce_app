// store/slices/wishlistSlice.ts - Fixed with proper authentication
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { WishlistState } from "@/types";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { handleApiError } from "@/lib/error";
// import 'react-toastify/dist/ReactToastify.css';

const initialState: WishlistState = {
  items: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  },
};

// Helper function to get token from Clerk
// const getClerkToken = async (): Promise<string | null> => {
//   try {
//     if (typeof window === 'undefined') return null

//     const clerk = (window as any).Clerk
//     if (clerk?.session) {
//       const token = await clerk.session.getToken({
//         template: '_apptoken'
//       })
//       return token
//     }

//     return null
//   } catch (error) {
//     console.error('Failed to get Clerk token in Redux slice:', error)
//     return null
//   }
// }

// Create authenticated API instance for Redux thunks
// const createAuthenticatedApiForThunk = async () => {
//   const token = await getClerkToken()
//   return createAuthenticatedApi(token)
// }

// Enhanced error handler


// Async Thunks with proper authentication
export const fetchWishlist = createAsyncThunk(
  "wishlist/fetchWishlist",
  async (
    { page = 1, limit = 10 }: { page?: number; limit?: number },
    { rejectWithValue }
  ) => {
    try {
      console.log("🔍 Fetching wishlist from Redux thunk...");
      // const api = await createAuthenticatedApiForThunk()

      const response = await api.get(
        `/api/wishlist?page=${page}&limit=${limit}`
      );
      console.log("✅ Wishlist fetched successfully:", response.data);

      return response.data;
    } catch (error) {
      console.error("❌ Failed to fetch wishlist:", error);
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const addItem = createAsyncThunk(
  "wishlist/addItem",
  async (productId: string, { rejectWithValue }) => {
    try {
      // console.log("➕ Adding item to wishlist:", productId);
      // const api = await createAuthenticatedApiForThunk()

      const response = await api.post("/api/wishlist", {
        productId,
      });

      console.log("✅ Item added to wishlist:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Failed to add item to wishlist:", error);
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const removeItem = createAsyncThunk(
  "wishlist/removeItem",
  async (productId: string, { rejectWithValue }) => {
    try {
      // console.log("🗑️ Removing item from wishlist:", productId);
      // const api = await createAuthenticatedApiForThunk()

      const response = await api.delete(`/api/wishlist?productId=${productId}`);
      console.log("✅ Item removed from wishlist:", response.data);

      return { ...response.data, productId }; // Include productId in response
    } catch (error) {
      console.error("❌ Failed to remove item from wishlist:", error);
      return rejectWithValue(handleApiError(error));
    }
  }
);

export const clearWishlist = createAsyncThunk(
  "wishlist/clearWishlist",
  async (_, { getState, rejectWithValue }) => {
    try {
      console.log("🧹 Clearing entire wishlist...");
      const state = getState() as { wishlist: WishlistState };
      // const api = await createAuthenticatedApiForThunk()

      // Option 1: If your API has a clear all endpoint
      try {
        await api.delete("/api/wishlist");
        console.log("✅ Wishlist cleared via bulk endpoint");
        return true;
      } catch (bulkError) {
        // Option 2: Fallback to individual deletions
        console.log("⚠️ Bulk clear failed, trying individual deletions...");
        await Promise.all(
          state.wishlist.items.map((item) =>
            api.delete(`/api/wishlist?productId=${item.product.id}`)
          )
        );
        console.log("✅ Wishlist cleared via individual deletions");
        return true;
      }
    } catch (error) {
      console.error("❌ Failed to clear wishlist:", error);
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Enhanced toggle item thunk
export const toggleItem = createAsyncThunk(
  "wishlist/toggleItem",
  async (productId: string, { getState, dispatch, rejectWithValue }) => {
    try {
      console.log("🔄 Toggling wishlist item:", productId);
      const state = getState() as { wishlist: WishlistState };
      const exists = state.wishlist.items.some(
        (item) => item.product.id === productId
      );

      if (exists) {
        console.log("➖ Item exists, removing...");
        const result = await dispatch(removeItem(productId));
        if (removeItem.fulfilled.match(result)) {
          return { action: "removed", productId, result: result.payload };
        } else {
          throw new Error("Failed to remove item");
        }
      } else {
        console.log("➕ Item doesn't exist, adding...");
        const result = await dispatch(addItem(productId));
        if (addItem.fulfilled.match(result)) {
          return { action: "added", productId, result: result.payload };
        } else {
          throw new Error("Failed to add item");
        }
      }
    } catch (error) {
      console.error("❌ Failed to toggle wishlist item:", error);
      return rejectWithValue(handleApiError(error));
    }
  }
);

// Check if item exists in wishlist (useful for optimistic updates)
export const checkItemExists = createAsyncThunk(
  "wishlist/checkItemExists",
  async (productId: string, { rejectWithValue }) => {
    try {
      console.log("🔍 Checking if item exists in wishlist:", productId);
      // const api = await createAuthenticatedApiForThunk()

      const response = await api.get(`/wishlist/check/${productId}`);
      return { productId, exists: response.data.exists };
    } catch (error) {
      console.error("❌ Failed to check item existence:", error);
      return rejectWithValue(handleApiError(error));
    }
  }
);

const wishlistSlice = createSlice({
  name: "wishlist",
  initialState,
  reducers: {
    // Clear error state
    clearError: (state) => {
      state.error = null;
    },

    // Set loading state manually (useful for optimistic updates)
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Reset wishlist to initial state
    resetWishlist: (state) => {
      return initialState;
    },

    // Update pagination
    setPagination: (
      state,
      action: PayloadAction<Partial<WishlistState["pagination"]>>
    ) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // Optimistic add (for immediate UI feedback)
    optimisticAdd: (state, action: PayloadAction<any>) => {
      const exists = state.items.some(
        (item) => item.product.id === action.payload.product.id
      );
      if (!exists) {
        state.items = [action.payload, ...state.items];
        state.pagination.total += 1;
      }
    },

    // Optimistic remove (for immediate UI feedback)
    optimisticRemove: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(
        (item) => item.product.id !== action.payload
      );
      state.pagination.total = Math.max(0, state.pagination.total - 1);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Wishlist
      .addCase(fetchWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items || action.payload.wishlist || [];

        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        } else {
          state.pagination = {
            ...state.pagination,
            total: state.items.length,
            pages: Math.ceil(state.items.length / state.pagination.limit),
          };
        }

        // Success toast for debugging
        if (process.env.NODE_ENV === "development") {
          toast.success(`Loaded ${state.items.length} wishlist items`, {
            autoClose: 2000,
          });
        }
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to load wishlist: ${action.payload}`, {
          autoClose: 3000,
        });
      })

      // Add Item
      .addCase(addItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        // toast.info("Adding item to wishlist...", {
        //   autoClose: 1000,
        // });
      })
      .addCase(addItem.fulfilled, (state, action) => {
        state.loading = false;
        const newItem = action.payload.item || action.payload;
        const exists = state.items.some(
          (item) => item.product.id === newItem.product.id
        );

        if (!exists) {
          state.items = [newItem, ...state.items];
          state.pagination = {
            ...state.pagination,
            total: state.pagination.total + 1,
            pages: Math.ceil(
              (state.pagination.total + 1) / state.pagination.limit
            ),
          };
          toast.success("Item added to wishlist!", {
            autoClose: 2000,
          });
        } else {
          toast.warn("Item already in wishlist", {
            autoClose: 2000,
          });
        }
      })
      .addCase(addItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // toast.error(`Failed to add item: ${action.payload}`, {
        //   autoClose: 3000,
        // });
      })

      // Remove Item
      .addCase(removeItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        // toast.info("Removing item from wishlist...", {
        //   autoClose: 1000,
        // });
      })
      .addCase(removeItem.fulfilled, (state, action) => {
        state.loading = false;
        const productId = action.payload.productId || action.meta.arg;
        state.items = state.items.filter(
          (item) => item.product.id !== productId
        );
        state.pagination = {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
          pages:
            Math.ceil(
              Math.max(0, state.pagination.total - 1) / state.pagination.limit
            ) || 1,
        };
        toast.success("Item removed from wishlist", {
          autoClose: 2000,
        });
      })
      .addCase(removeItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to remove item: ${action.payload}`, {
          autoClose: 3000,
        });
      })

      // Clear Wishlist
      .addCase(clearWishlist.pending, (state) => {
        state.loading = true;
        state.error = null;
        // toast.info("Clearing wishlist...", {
        //   autoClose: 1000,
        // });
      })
      .addCase(clearWishlist.fulfilled, (state) => {
        state.loading = false;
        state.items = [];
        state.pagination = {
          page: 1,
          limit: state.pagination.limit,
          total: 0,
          pages: 1,
        };
        toast.success("Wishlist cleared", {
          autoClose: 2000,
        });
      })
      .addCase(clearWishlist.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to clear wishlist: ${action.payload}`, {
          autoClose: 3000,
        });
      })

      // Toggle Item
      .addCase(toggleItem.pending, (state) => {
        state.loading = true;
        state.error = null;
        // toast.info("Updating wishlist...", {
        //   autoClose: 1000,
        // });
      })
      .addCase(toggleItem.fulfilled, (state, action) => {
        state.loading = false;
        // The actual toast will be shown by add/remove actions
      })
      .addCase(toggleItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        toast.error(`Failed to update wishlist: ${action.payload}`, {
          autoClose: 3000,
        });
      })

      // Check Item Exists
      .addCase(checkItemExists.fulfilled, (state, action) => {
        // Optional: Show toast if needed
        // toast.info(action.payload ? 'Item in wishlist' : 'Item not in wishlist')
      });
  },
});

// Export synchronous actions
export const {
  clearError,
  setLoading,
  resetWishlist,
  setPagination,
  optimisticAdd,
  optimisticRemove,
} = wishlistSlice.actions;

// Export all actions (sync + async)
export const wishlistActions = {
  // Synchronous actions
  clearError,
  setLoading,
  resetWishlist,
  setPagination,
  optimisticAdd,
  optimisticRemove,

  // Async actions
  fetchWishlist,
  addItem,
  removeItem,
  clearWishlist,
  toggleItem,
  checkItemExists,
};

// Enhanced selectors
export const selectWishlist = (state: { wishlist: WishlistState }) =>
  state.wishlist;
export const selectWishlistItems = (state: { wishlist: WishlistState }) =>
  state.wishlist.items;
export const selectWishlistLoading = (state: { wishlist: WishlistState }) =>
  state.wishlist.loading;
export const selectWishlistError = (state: { wishlist: WishlistState }) =>
  state.wishlist.error;
export const selectWishlistPagination = (state: { wishlist: WishlistState }) =>
  state.wishlist.pagination;

// Memoized selectors
export const selectIsInWishlist =
  (productId: string) => (state: { wishlist: WishlistState }) =>
    state.wishlist.items.some((item) => item.product.id === productId);

export const selectWishlistCount = (state: { wishlist: WishlistState }) =>
  state.wishlist.items.length;

export const selectWishlistTotal = (state: { wishlist: WishlistState }) =>
  state.wishlist.pagination.total;

export const selectWishlistItemById =
  (productId: string) => (state: { wishlist: WishlistState }) =>
    state.wishlist.items.find((item) => item.product.id === productId);

// Get products by category from wishlist
export const selectWishlistItemsByCategory =
  (category: string) => (state: { wishlist: WishlistState }) =>
    state.wishlist.items.filter((item) => item.product.category === category);

// Check if wishlist is empty
export const selectIsWishlistEmpty = (state: { wishlist: WishlistState }) =>
  state.wishlist.items.length === 0;

// Get wishlist items with their IDs only (useful for quick checks)
export const selectWishlistProductIds = (state: { wishlist: WishlistState }) =>
  state.wishlist.items.map((item) => item.product.id);

// Enhanced selectors for loading states
export const selectIsWishlistLoading = (state: { wishlist: WishlistState }) =>
  state.wishlist.loading;
export const selectHasWishlistError = (state: { wishlist: WishlistState }) =>
  !!state.wishlist.error;

// Export reducer as default
export default wishlistSlice.reducer;
