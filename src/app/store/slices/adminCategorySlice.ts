// store/slices/adminCategorySlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import api from "@/lib/api";
import {
  CategoryFilters,
  CreateCategoryData,
  UpdateCategoryData,
  UpdateStatusData,
  AdminCategoryState,
  Category,
  initialState,
} from "@/types/categories";
import { AxiosResponse } from "axios";

// Helper function to extract data from API response
const extractApiData = (response: AxiosResponse) => {
  // If the response has a data property, use that (Axios response format)
  if (response && typeof response === "object" && "data" in response) {
    return response.data;
  }
  // Otherwise return the response as-is
  return response;
};

// Async Thunks
export const fetchCategories = createAsyncThunk(
  "adminCategory/fetchCategories",
  async (filters: Partial<CategoryFilters>, { rejectWithValue }) => {
    try {
      const searchParams = new URLSearchParams();

      if (filters?.page) searchParams.set("page", filters.page.toString());
      if (filters?.limit) searchParams.set("limit", filters.limit.toString());
      if (filters?.search) searchParams.set("search", filters.search);
      if (filters?.sortBy) searchParams.set("sortBy", filters.sortBy);
      if (filters?.sortOrder) searchParams.set("sortOrder", filters.sortOrder);
      if (filters?.status) searchParams.set("status", filters.status);

      const queryString = searchParams.toString();
      const endpoint = queryString
        ? `/api/admin/categories?${queryString}`
        : "/api/admin/categories";

      const response = await api.get(endpoint);
      console.log("🔍 Raw API Response:", response);
      console.log("🔍 Response Data:", response.data);
      return extractApiData(response);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const fetchCategoryById = createAsyncThunk(
  "adminCategory/fetchCategoryById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/admin/categories/${id}`);
      return extractApiData(response);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const createCategory = createAsyncThunk(
  "adminCategory/createCategory",
  async (categoryData: CreateCategoryData, { rejectWithValue }) => {
    try {
      const response = await api.post("/api/admin/categories", categoryData);
      return extractApiData(response);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const updateCategory = createAsyncThunk(
  "adminCategory/updateCategory",
  async (categoryData: UpdateCategoryData, { rejectWithValue }) => {
    try {
      const { id, ...updateData } = categoryData;
      const response = await api.put(`/api/admin/categories/${id}`, updateData);
      return extractApiData(response);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const updateCategoryStatus = createAsyncThunk(
  "adminCategory/updateCategoryStatus",
  async (statusData: UpdateStatusData, { rejectWithValue }) => {
    try {
      const response = await api.patch(
        `/api/admin/categories/${statusData.id}/status`,
        {
          status: statusData.status,
        }
      );
      return extractApiData(response);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const deleteCategory = createAsyncThunk(
  "adminCategory/deleteCategory",
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/admin/categories/${id}`);
      return id; // Return the deleted category ID
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

export const uploadCategoryImages = createAsyncThunk<
  { url: string; category: Category },
  { categoryId: string; files: File[] },
  { rejectValue: string }
>(
  "adminCategory/uploadImage",
  async ({ categoryId, files }, { rejectWithValue }) => {
    console.log(`🚀 Frontend: uploadCategoryImage for category ${categoryId}`);

    const file = files[0];
    if (!file) {
      return rejectWithValue("No file provided");
    }

    console.log(`📁 Frontend: Uploading file: ${file.name}`);

    try {
      const formData = new FormData();
      formData.append("image", file);

      console.log("📋 FormData prepared, making API call...");

      const response = await api.post(
        `/api/admin/categories/${categoryId}/upload`,
        formData,
        {
          timeout: 60000,
          // Let axios/browser handle Content-Type automatically
        }
      );

      console.log("✅ Frontend: Upload successful", response.data);
      return extractApiData(response);
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to upload image  "
      );
    }
  }
);

export const deleteCategoryImage = createAsyncThunk<
  Category,
  { categoryId: string },
  { rejectValue: string }
>("adminCategory/deleteImage", async ({ categoryId }, { rejectWithValue }) => {
  console.log(`🗑️ Frontend: deleteCategoryImage for category ${categoryId}`);

  try {
    const response = await api.delete(
      `/api/admin/categories/${categoryId}/discard`,
      {
        timeout: 30000,
      }
    );

    console.log("✅ Frontend: Image deleted successfully");
    const data = extractApiData(response);
    return data.category;
  } catch (error) {
    console.error("❌ Frontend: Delete image error:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to delete image"
    );
  }
});

// Slice
const adminCategorySlice = createSlice({
  name: "adminCategory",
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<CategoryFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearError: (state) => {
      state.error = null;
    },
    setCurrentCategory: (state, action: PayloadAction<Category | null>) => {
      state.currentCategory = action.payload;
    },
    clearCurrentCategory: (state) => {
      state.currentCategory = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Categories
    builder
      // Updated fetchCategories.fulfilled case in your Redux slice

      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;

        console.log(
          "🔍 Redux: fetchCategories fulfilled with payload:",
          payload
        );

        // Handle different response formats
        if (payload && typeof payload === "object") {
          if ("categories" in payload) {
            console.log(
              "🔍 Redux: Found categories property:",
              payload.categories
            );
            console.log(
              "🔍 Redux: Found pagination property:",
              payload.pagination
            );

            state.categories = Array.isArray(payload.categories)
              ? payload.categories
              : [];

            // Handle pagination - either use provided pagination or calculate it
            if (payload.pagination) {
              state.pagination = payload.pagination;
            } else {
              // Calculate pagination based on categories length and current filters
              const categoriesLength = state.categories.length;
              const currentLimit = state.filters.limit || 10;

              console.log("🔍 Redux: No pagination provided, calculating:", {
                categoriesLength,
                currentLimit,
                calculatedTotalPages: Math.ceil(
                  categoriesLength / currentLimit
                ),
              });

              state.pagination = {
                page: state.filters.page || 1,
                pages: Math.ceil(categoriesLength / currentLimit),
                total: categoriesLength,
                limit: currentLimit,
              };
            }
          } else if (Array.isArray(payload)) {
            console.log(
              "🔍 Redux: Payload is directly an array with length:",
              payload.length
            );

            state.categories = payload;

            // Calculate pagination for direct array response
            const categoriesLength = payload.length;
            const currentLimit = state.filters.limit || 10;

            console.log("🔍 Redux: Calculating pagination for direct array:", {
              categoriesLength,
              currentLimit,
              calculatedTotalPages: Math.ceil(categoriesLength / currentLimit),
            });

            state.pagination = {
              page: state.filters.page || 1,
              pages: Math.ceil(categoriesLength / currentLimit),
              total: categoriesLength,
              limit: currentLimit,
            };
          } else {
            console.log("🔍 Redux: Using fallback - empty array");
            state.categories = [];
            state.pagination = initialState.pagination;
          }
        } else {
          console.log("🔍 Redux: Payload is not an object - using empty array");
          state.categories = [];
          state.pagination = initialState.pagination;
        }

        console.log("🔍 Redux: Final state after fetchCategories:", {
          categoriesLength: state.categories.length,
          pagination: state.pagination,
        });
      });

    // Fetch Category By ID
    builder
      .addCase(fetchCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCategory = action.payload;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create Category
    builder
      .addCase(createCategory.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.creating = false;
        state.categories.unshift(action.payload); // Add to beginning
        state.pagination.total += 1;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.creating = false;
        state.error = action.payload as string;
      });

    // Update Category
    builder
      .addCase(updateCategory.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.categories.findIndex(
          (cat) => cat.id === action.payload.id
        );
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        if (state.currentCategory?.id === action.payload.id) {
          state.currentCategory = action.payload;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      });

    // Update Category Status
    builder
      .addCase(updateCategoryStatus.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updateCategoryStatus.fulfilled, (state, action) => {
        state.updating = false;
        const index = state.categories.findIndex(
          (cat) => cat.id === action.payload.id
        );
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
        if (state.currentCategory?.id === action.payload.id) {
          state.currentCategory = action.payload;
        }
      })
      .addCase(updateCategoryStatus.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload as string;
      });

    // Delete Category
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.deleting = false;
        state.categories = state.categories.filter(
          (cat) => cat.id.toString() !== action.payload
        );
        state.pagination.total -= 1;
        if (state.currentCategory?.id.toString() === action.payload) {
          state.currentCategory = null;
        }
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload as string;
      });

    // Upload Category Image
    builder
      .addCase(uploadCategoryImages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadCategoryImages.fulfilled, (state, action) => {
        state.loading = false;
        // Update the category in your categories array
        const categoryIndex = state.categories.findIndex(
          (p) => p.id.toString() === action.meta.arg.categoryId
        );
        if (categoryIndex !== -1) {
          state.categories[categoryIndex] = action.payload.category;
        }
      })
      .addCase(uploadCategoryImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Upload failed";
      });

    // Delete Category Image
    builder
      .addCase(deleteCategoryImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCategoryImage.fulfilled, (state, action) => {
        state.loading = false;
        // Update the category in your categories array
        const categoryIndex = state.categories.findIndex(
          (p) => p.id.toString() === action.meta.arg.categoryId
        );
        if (categoryIndex !== -1) {
          state.categories[categoryIndex] = action.payload;
        }
      })
      .addCase(deleteCategoryImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Delete failed";
      });
  },
});

// Export actions
export const {
  setFilters,
  resetFilters,
  clearError,
  setCurrentCategory,
  clearCurrentCategory,
} = adminCategorySlice.actions;

// Selectors
export const selectCategories = (state: {
  adminCategory: AdminCategoryState;
}) => state.adminCategory.categories;
export const selectCurrentCategory = (state: {
  adminCategory: AdminCategoryState;
}) => state.adminCategory.currentCategory;
export const selectPagination = (state: {
  adminCategory: AdminCategoryState;
}) => state.adminCategory.pagination;
export const selectFilters = (state: { adminCategory: AdminCategoryState }) =>
  state.adminCategory.filters;
export const selectLoading = (state: { adminCategory: AdminCategoryState }) =>
  state.adminCategory.loading;
export const selectError = (state: { adminCategory: AdminCategoryState }) =>
  state.adminCategory.error;
export const selectCreating = (state: { adminCategory: AdminCategoryState }) =>
  state.adminCategory.creating;
export const selectUpdating = (state: { adminCategory: AdminCategoryState }) =>
  state.adminCategory.updating;
export const selectDeleting = (state: { adminCategory: AdminCategoryState }) =>
  state.adminCategory.deleting;

export default adminCategorySlice.reducer;
