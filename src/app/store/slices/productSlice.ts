import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { Product, NewProduct, ProductState } from "@/types/products";
import axios from "axios";
import { useMemo, useCallback } from "react";
import { handleApiError } from "@/lib/error";

const initialState: ProductState = {
  products: [],
  loading: false,
  error: null,
  activeProduct: null,

  pagination: {
    count: 0,
    total: 0,
    page: 1,
    limit: 12,
    pages: 0,
  },

  filters: {
    search: "",
    category: "",
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
    featured: undefined,
    fruit: undefined,
    vegetable: undefined,
    trending: undefined,
    bestSelling: undefined,
    dealOfTheDay: undefined,
    newArrival: undefined,
    status: "ACTIVE",
  },
};

// Helper function to generate temporary IDs for optimistic updates
const generateTempId = () =>
  `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Async thunks for API operations
export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (
    customFilters: Partial<ProductState["filters"]> & {
      page?: number;
      limit?: number;
    } = {},
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { products: ProductState };
      const filters = { ...state.products.filters, ...customFilters };
      const { page, limit } = state.products.pagination;

      // Build query parameters
      const params = new URLSearchParams();

      // Pagination
      params.set("page", (customFilters.page || page).toString());
      params.set("limit", (customFilters.limit || limit).toString());

      // Filters
      if (filters.search) params.set("search", filters.search);
      if (filters.category && filters.category !== "all")
        params.set("category", filters.category);
      if (filters.minPrice !== undefined)
        params.set("minPrice", filters.minPrice.toString());
      if (filters.maxPrice !== undefined)
        params.set("maxPrice", filters.maxPrice.toString());
      if (filters.minRating !== undefined)
        params.set("minRating", filters.minRating.toString());
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
      if (filters.status) params.set("status", filters.status);

      // Boolean filters
      if (filters.featured !== undefined)
        params.set("featured", filters.featured.toString());
      if (filters.fruit !== undefined)
        params.set("fruit", filters.fruit.toString());
      if (filters.vegetable !== undefined)
        params.set("vegetable", filters.vegetable.toString());
      if (filters.trending !== undefined)
        params.set("trending", filters.trending.toString());
      if (filters.dealOfTheDay !== undefined)
        params.set("dealOfTheDay", filters.dealOfTheDay.toString());
      if (filters.newArrival !== undefined)
        params.set("newArrival", filters.newArrival.toString());
      if (filters.bestSelling !== undefined)
        params.set("bestSelling", filters.bestSelling.toString());

      const response = await axios.get(`/api/products?${params.toString()}`);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch products");
      }

      return data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch products"
      );
    }
  }
);

export const fetchProductBySlug = createAsyncThunk(
  "products/fetchProductBySlug",
  async (slug: string, { rejectWithValue }) => {
    try {
      const res = await axios.get(`/api/products/${slug}`);

      if (res.status !== 200) {
        throw new Error(`Failed to fetch product: ${res.statusText}`);
      }

      const data = res.data;

      // Ensure the product has the expected structure
      return {
        ...data,
        rating: data.rating || data.averageRating || 0,
        unitPrices: data.unitPrices || [],
      };
    } catch (error: unknown) {
      return rejectWithValue(
        handleApiError(error) || "Failed to fetch product"
      );
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (id: string) => {
    const res = await axios.get(`/api/products/admin/${id}`);
    return res.data;
  }
);

export const createProduct = createAsyncThunk(
  "products/createProduct",
  async (productData: NewProduct, { rejectWithValue }) => {
    try {
      const formData = new FormData();

      // Add all product fields to FormData
      Object.keys(productData).forEach((key) => {
        const typedKey = key as keyof NewProduct;
        if (key === "images" && Array.isArray(productData[typedKey])) {
          // Separate Files from URLs properly
          (productData[typedKey] as unknown as Array<File | string>).forEach(
            (item) => {
              if (
                typeof File !== "undefined" &&
                item &&
                typeof item === "object" &&
                item instanceof File
              ) {
                // New uploaded files
                formData.append("uploadedImages", item);
              } else if (typeof item === "string") {
                // Existing image URLs
                formData.append("images", item);
              }
            }
          );
        } else if (
          key === "unitPrices" &&
          Array.isArray(productData[typedKey])
        ) {
          // Handle unit prices consistently
          formData.append("unitPrices", JSON.stringify(productData[typedKey]));
        } else if (
          productData[typedKey] !== null &&
          productData[typedKey] !== undefined
        ) {
          formData.append(key, productData[typedKey]!.toString());
        }
      });

      const response = await axios.post("/api/products", formData);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to create product");
      }

      const newProduct = response.data;
      return newProduct;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create product"
      );
    }
  }
);

// export const updateProduct = createAsyncThunk(
//   "products/updateProduct",
//   async (
//     {
//       id,
//       updates,
//     }: { id: string; updates: Partial<Product> & { removeImages?: string[] } },
//     { rejectWithValue }
//   ) => {
//     try {
//       const formData = new FormData();

//       // Add ID to updates
//       formData.append("id", id);

//       // Add all update fields to FormData
//       Object.keys(updates).forEach((key) => {
//         if (key === "images" && Array.isArray(updates[key])) {
//           // Separate Files from URLs properly
//           updates[key].forEach((item) => {
//             if (item instanceof File) {
//               // New uploaded files
//               formData.append("uploadedImages", item);
//             } else if (typeof item === "string") {
//               // Existing URLs
//               formData.append("images", item);
//             }
//           });
//         } else if (key === "removeImages" && Array.isArray(updates[key])) {
//           formData.append("removeImages", JSON.stringify(updates[key]));
//         } else if (key === "unitPrices" && Array.isArray(updates[key])) {
//           formData.append("unitPrices", JSON.stringify(updates[key]));
//         } else if (updates[key] !== null && updates[key] !== undefined) {
//           formData.append(key, updates[key].toString());
//         }
//       });

//       const response = await axios.put("/api/products", formData);

//       if (response.status !== 200) {
//         const errorData = response.data;
//         throw new Error(errorData.error || "Failed to update product");
//       }

//       const result = response.data;
//       // Handle both response formats - direct product or {id, product}
//       if (result.id && result.product) {
//         return result;
//       } else {
//         return { id, product: result };
//       }
//     } catch (error) {
//       return rejectWithValue(
//         error instanceof Error ? error.message : "Failed to update product"
//       );
//     }
//   }
// );

export const deleteProduct = createAsyncThunk(
  "products/deleteProduct",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axios.delete(`/api/products?id=${id}`);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to delete product");
      }

      const result = response.data;
      // Ensure we return the ID for Redux state management
      return { id: result.id || id, result };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete product"
      );
    }
  }
);

const productSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
    setActiveProduct: (state, action: PayloadAction<Product | null>) => {
      state.activeProduct = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPagination: (
      state,
      action: PayloadAction<{
        count: number;
        total: number;
        page: number;
        limit: number;
        pages: number;
      }>
    ) => {
      state.pagination = action.payload;
    },
    updateFilters: (
      state,
      action: PayloadAction<Partial<ProductState["filters"]>>
    ) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1; // Reset to page 1 when filters change
    },
    clearFilters: (state) => {
      state.filters = {
        search: "",
        category: "",
        minPrice: undefined,
        maxPrice: undefined,
        minRating: undefined,
        sortBy: "createdAt",
        sortOrder: "desc",
        featured: undefined,
        fruit: undefined,
        vegetable: undefined,
        trending: undefined,
        dealOfTheDay: undefined,
        newArrival: undefined,
        status: "ACTIVE",
      };
      state.pagination.page = 1;
    },
    goToPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    changePageSize: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
    addProductOptimistic: (state, action: PayloadAction<Product>) => {
      const tempProduct = { ...action.payload, id: generateTempId() };
      state.products.push(tempProduct);
    },
    updateProductOptimistic: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Product> }>
    ) => {
      const index = state.products.findIndex(
        (product) => product.id === action.payload.id
      );
      if (index !== -1) {
        state.products[index] = {
          ...state.products[index],
          ...action.payload.updates,
        };
      }
    },
    removeProductOptimistic: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(
        (product) => product.id !== action.payload
      );
    },
    clearStore: (state) => {
      state.products = [];
      state.loading = false;
      state.error = null;
      state.activeProduct = null;
      state.pagination = { count: 0, total: 0, page: 1, limit: 10, pages: 0 };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        // Normalize product data from API
        const products = (action.payload.products || []).map(
          (product: Product) => ({
            ...product,
            // Ensure rating field exists (ProductCard expects this)
            rating: product.rating || product.averageRating || 0,
            // Ensure unitPrices has fallback
            unitPrices: product.unitPrices || [],
          })
        );
        state.products = products;
        state.pagination = action.payload.pagination || state.pagination;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.products = [];
      })
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        const product = {
          ...action.payload,
          rating: action.payload.rating || action.payload.averageRating || 0,
          unitPrices: action.payload.unitPrices || [],
        };
        state.products.push(product);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add these to your extraReducers builder:
      .addCase(fetchProductBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        state.loading = false;
        const product = action.payload;
        state.activeProduct = product;

        // Also update the product in the products array if it exists
        const index = state.products.findIndex((p) => p.slug === product.slug);
        if (index !== -1) {
          state.products[index] = product;
        } else {
          // Add to products array if not exists
          state.products.push(product);
        }
      })
      .addCase(fetchProductBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.activeProduct = null;
      })

      // Also add fetchProductById cases if needed:
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        const product = {
          ...action.payload,
          rating: action.payload.rating || action.payload.averageRating || 0,
          unitPrices: action.payload.unitPrices || [],
        };
        state.activeProduct = product;

        // Update in products array if exists
        const index = state.products.findIndex((p) => p.id === product.id);
        if (index !== -1) {
          state.products[index] = product;
        }
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.activeProduct = null;
      })

      // Update product
      // .addCase(updateProduct.pending, (state) => {
      //   state.loading = true;
      //   state.error = null;
      // })
      // .addCase(updateProduct.fulfilled, (state, action) => {
      //   state.loading = false;
      //   const index = state.products.findIndex(
      //     (product) => product.id === action.payload.id
      //   );
      //   if (index !== -1) {
      //     const updatedProduct = {
      //       ...action.payload.product,
      //       rating:
      //         action.payload.product.rating ||
      //         action.payload.product.averageRating ||
      //         0,
      //       unitPrices: action.payload.product.unitPrices || [],
      //     };
      //     state.products[index] = updatedProduct;
      //   }
      //   if (state.activeProduct?.id === action.payload.id) {
      //     state.activeProduct = {
      //       ...action.payload.product,
      //       rating:
      //         action.payload.product.rating ||
      //         action.payload.product.averageRating ||
      //         0,
      //       unitPrices: action.payload.product.unitPrices || [],
      //     };
      //   }
      // })
      // .addCase(updateProduct.rejected, (state, action) => {
      //   state.loading = false;
      //   state.error = action.payload as string;
      // })
      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = state.products.filter(
          (product) => product.id !== action.payload.id
        );
        if (state.activeProduct?.id === action.payload.id) {
          state.activeProduct = null;
        }
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setProducts,
  setActiveProduct,
  setLoading,
  setError,
  setPagination,
  updateFilters,
  clearFilters,
  goToPage,
  changePageSize,
  addProductOptimistic,
  updateProductOptimistic,
  removeProductOptimistic,
  clearStore,
} = productSlice.actions;

export default productSlice.reducer;

// Custom hooks for product state and utilities
export const useProductSelectors = () => {
  const products = useAppSelector((state) => state.products.products);
  const loading = useAppSelector((state) => state.products.loading);
  const error = useAppSelector((state) => state.products.error);
  const activeProduct = useAppSelector((state) => state.products.activeProduct);
  const pagination = useAppSelector((state) => state.products.pagination);
  const filters = useAppSelector((state) => state.products.filters);

  return {
    products,
    loading,
    error,
    activeProduct,
    pagination,
    filters,
  };
};

// Utility functions for product operations
export const useProductUtilities = () => {
  const products = useAppSelector((state) => state.products.products);

  const getProductById = useCallback(
    (id: string) => {
      return products.find((product: Product) => product.id === id);
    },
    [products]
  );

  const getProductsByCategory = useCallback(
    (categoryName: string) => {
      return products.filter(
        (product: Product) => product.category?.name === categoryName
      );
    },
    [products]
  );

  const getFeaturedProducts = useCallback(() => {
    return products.filter((product: Product) => product.isFeatured);
  }, [products]);

  const getTrendingProducts = useCallback(() => {
    return products.filter((product: Product) => product.isTrending);
  }, [products]);

  const getDealsOfTheDay = useCallback(() => {
    return products.filter((product: Product) => product.isDealOfTheDay);
  }, [products]);

  const getNewArrivals = useCallback(() => {
    return products.filter((product: Product) => product.isNewArrival);
  }, [products]);

  const searchProducts = useCallback(
    (query?: string) => {
      if (!query) return products;

      const lowercaseQuery = query.toLowerCase();
      return products.filter(
        (product: Product) =>
          product.name?.toLowerCase().includes(lowercaseQuery) ||
          product.description?.toLowerCase().includes(lowercaseQuery) ||
          product.sku?.toLowerCase().includes(lowercaseQuery)
      );
    },
    [products]
  );

  const getProductPrice = useCallback((product: Product) => {
    // Fix: Check for both hasFixedPrice and that fixedPrice is defined and > 0
    if (product.hasFixedPrice && product.fixedPrice !== undefined && product.fixedPrice > 0) {
      return {
        price: product.fixedPrice,
        type: "fixed",
        display: `$${product.fixedPrice.toFixed(2)}`,
      };
    } else if (product.displayPrice !== undefined && product.displayPrice > 0) {
      return {
        price: product.displayPrice,
        type: "unit",
        display: product.priceRange
          ? `$${product.priceRange.min.toFixed(2)} - $${product.priceRange.max.toFixed(2)}`
          : `From $${product.displayPrice.toFixed(2)}`,
      };
    } else if (product.unitPrices && product.unitPrices.length > 0) {
      const prices = product.unitPrices
        .map((up) => up.price)
        .filter((p) => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        return {
          price: minPrice,
          type: "unit",
          display:
            minPrice !== maxPrice
              ? `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`
              : `From $${minPrice.toFixed(2)}`,
        };
      }
    }
    return { price: 0, type: "unknown", display: "Price not available" };
  }, []);

  return useMemo(
    () => ({
      getProductById,
      getProductsByCategory,
      getFeaturedProducts,
      getTrendingProducts,
      getDealsOfTheDay,
      getNewArrivals,
      searchProducts,
      getProductPrice,
    }),
    [
      getProductById,
      getProductsByCategory,
      getFeaturedProducts,
      getTrendingProducts,
      getDealsOfTheDay,
      getNewArrivals,
      searchProducts,
      getProductPrice,
    ]
  );
};

// Combined hook for convenience with auto-fetch capability - FIXED VERSION
export const useProducts = () => {
  const dispatch = useAppDispatch();
  const selectors = useProductSelectors();
  const utilities = useProductUtilities();

  // Memoize the actions to prevent re-creation on every render
  const actions = useMemo(
    () => ({
      fetchProducts: (filters?: Parameters<typeof fetchProducts>[0]) =>
        dispatch(fetchProducts(filters || {})), 
      createProduct: (productData: NewProduct) =>
        dispatch(createProduct(productData)),
      // updateProduct: (data: {
      //   id: string;
      //   updates: Partial<Product> & { removeImages?: string[] };
      // }) => dispatch(updateProduct(data)),
      deleteProduct: (id: string) => dispatch(deleteProduct(id)),
      setActiveProduct: (product: Product | null) =>
        dispatch(setActiveProduct(product)),

      // Enhanced filter update that automatically fetches
      updateFiltersAndFetch: (filters: Partial<ProductState["filters"]>) => {
        dispatch(updateFilters(filters));
        // Fetch with the new filters immediately
        return dispatch(fetchProducts(filters));
      },

      // Regular filter update without fetching (for internal use)
      updateFilters: (filters: Partial<ProductState["filters"]>) =>
        dispatch(updateFilters(filters)),
      clearFilters: () => {
        dispatch(clearFilters());
        return dispatch(fetchProducts({})); // Auto-fetch after clearing
      },
      goToPage: (page: number) => {
        dispatch(goToPage(page));
        // Auto-fetch with new page
        return dispatch(fetchProducts({ page }));
      },
      changePageSize: (size: number) => {
        dispatch(changePageSize(size));
        return dispatch(fetchProducts({})); // Auto-fetch with new page size
      },
      clearStore: () => dispatch(clearStore()),
    }),
    [dispatch]
  ); // Only depend on dispatch, which is stable

  return useMemo(
    () => ({
      ...selectors,
      ...utilities,
      actions,
    }),
    [selectors, utilities, actions]
  );
};
