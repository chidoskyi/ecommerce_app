// store/slices/reviewSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  Review,
  ReviewStatus,
  ReviewFormData,
  ReviewUpdateData,
  // AdminReviewUpdateData,
  ReviewFilters,
  PaginationParams,
  PaginationResponse,
  ReviewsResponse,
  AdminReviewsResponse,
  // ApiResponse,
} from "@/types/reviews";
import api from "@/lib/api";
import { handleApiError } from "@/lib/error";

// Initial state with TypeScript interface
interface ReviewState {
  // Review lists
  reviews: Review[];
  adminReviews: Review[];

  // Single review
  currentReview: Review | null;

  // Pagination
  pagination: PaginationResponse;

  // Admin dashboard data
  statusCounts: Record<ReviewStatus, number>;

  // Loading states
  loading: {
    fetchReviews: boolean;
    createReview: boolean;
    updateReview: boolean;
    deleteReview: boolean;
    bulkUpdate: boolean;
    helpful: boolean;
  };

  // Error states
  error: {
    fetchReviews: string | null;
    createReview: string | null;
    updateReview: string | null;
    deleteReview: string | null;
    bulkUpdate: string | null;
    helpful: string | null;
  };

  // UI state
  selectedReviewIds: string[];
  filters: ReviewFilters;
}

const initialState: ReviewState = {
  // Review lists
  reviews: [],
  adminReviews: [],

  // Single review
  currentReview: null,

  // Pagination
  pagination: {
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0,
  },

  // Admin dashboard data
  statusCounts: {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  },

  // Loading states
  loading: {
    fetchReviews: false,
    createReview: false,
    updateReview: false,
    deleteReview: false,
    bulkUpdate: false,
    helpful: false,
  },

  // Error states
  error: {
    fetchReviews: null,
    createReview: null,
    updateReview: null,
    deleteReview: null,
    bulkUpdate: null,
    helpful: null,
  },

  // UI state
  selectedReviewIds: [],
  filters: {
    status: "APPROVED",
    productId: undefined,
    userId: undefined,
    page: 1,
    limit: 10, 
  },
};

// Async thunks for API calls

// Fetch reviews (public)
export const fetchReviews = createAsyncThunk(
  "reviews/fetchReviews",
  async (
    params: Partial<ReviewFilters & PaginationParams> = {},
    { rejectWithValue }
  ) => {
    try {
      const queryParams = new URLSearchParams({
        page: params.page?.toString() || "1",
        limit: params.limit?.toString() || "10",
        status: params.status || "APPROVED",
        ...(params.productId && { productId: params.productId }),
        ...(params.userId && { userId: params.userId }),
      });

      const response = await api.get<ReviewsResponse>(
        `/api/reviews?${queryParams}`
      );
      return response.data;

  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Failed to fetch reviews');
  } 
  }
);

// Fetch admin reviews
export const fetchAdminReviews = createAsyncThunk(
  "reviews/fetchAdminReviews",
  async (
    params: Partial<ReviewFilters & PaginationParams> = {},
    { rejectWithValue }
  ) => {
    try {
      const queryParams = new URLSearchParams({
        page: params.page?.toString() || "1",
        limit: params.limit?.toString() || "20",
        status: params.status || "PENDING",
      });

      const response = await api.get<AdminReviewsResponse>(
        `/api/admin/reviews?${queryParams}`
      );
      return response.data;
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Failed to fetch admin reviews');
  }
  }
);

// Fetch single review
export const fetchReviewById = createAsyncThunk(
  "reviews/fetchReviewById",
  async (reviewId: string, { rejectWithValue }) => {
    try {
      const response = await api.get<Review>(`/api/reviews/${reviewId}`);
      return response.data;
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Review not found');
  }
  }
);

// Create review
export const createReview = createAsyncThunk(
  "reviews/createReview",
  async (reviewData: ReviewFormData, { rejectWithValue }) => {
    try {
      const response = await api.post<{ review: Review }>(
        "/api/reviews",
        reviewData
      );
      return response.data;
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Failed to create review');
  }
  }
);

// Update review (user)
export const updateReview = createAsyncThunk(
  "reviews/updateReview",
  async (
    {
      reviewId,
      updateData,
    }: { reviewId: string; updateData: ReviewUpdateData },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put<{ review: Review }>(
        `/api/reviews/${reviewId}`,
        updateData
      );
      return response.data;
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Failed to update review');
  }
  }
);

// Delete review (user)
export const deleteReview = createAsyncThunk(
  "reviews/deleteReview",
  async (reviewId: string, { rejectWithValue }) => {
    try {
      const response = await api.delete<{ message: string }>(
        `/api/reviews/${reviewId}`
      );
      return { reviewId, message: response.data.message };
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Failed to delete review');
  }
  }
);

// Admin approve/reject single review
export const adminUpdateReview = createAsyncThunk(
  "reviews/adminUpdateReview",
  async (
    {
      reviewId,
      action,
      status,
      isVerified,
    }: {
      reviewId: string;
      action?: "approve" | "reject";
      status?: ReviewStatus;
      isVerified?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put<{
        review: Review;
        previousStatus?: ReviewStatus;
        newStatus?: ReviewStatus;
      }>(`/api/admin/reviews?id=${reviewId}`, { action, status, isVerified });
      return response.data;
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Failed to update review');
  }
  }
);

// Bulk update reviews (admin)
export const bulkUpdateReviews = createAsyncThunk(
  "reviews/bulkUpdateReviews",
  async (
    {
      action,
      reviewIds,
    }: { action: "approve" | "reject" | "delete"; reviewIds: string[] },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post<{ message: string }>(
        "/api/admin/reviews/bulk",
        { action, reviewIds }
      );
      return { ...response.data, action, reviewIds };
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Bulk operation failed');
  }
  }
);

// Admin delete review
export const adminDeleteReview = createAsyncThunk(
  "reviews/adminDeleteReview",
  async (reviewId: string, { rejectWithValue }) => {
    try {
      const response = await api.delete<{ message: string }>(
        `/api/admin/reviews?id=${reviewId}`
      );
      return { reviewId, message: response.data.message };
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Failed to delete review');
  }
  }
);

// Mark review as helpful
export const markReviewHelpful = createAsyncThunk(
  "reviews/markReviewHelpful",
  async (
    { reviewId, helpful }: { reviewId: string; helpful: boolean },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post<{
        helpfulCount: number;
        message: string;
      }>("/api/reviews/helpful", { reviewId, helpful });
      return {
        reviewId,
        helpfulCount: response.data.helpfulCount,
        message: response.data.message,
      };
  } catch (error: unknown) { 
    return rejectWithValue(handleApiError(error) || 'Failed to update helpful count');
  }
  }
);

// Reviews slice
const reviewSlice = createSlice({
  name: "reviews",
  initialState,
  reducers: {
    // UI actions
    setSelectedReviewIds: (state, action: PayloadAction<string[]>) => {
      state.selectedReviewIds = action.payload;
    },

    toggleReviewSelection: (state, action: PayloadAction<string>) => {
      const reviewId = action.payload;
      const index = state.selectedReviewIds.indexOf(reviewId);

      if (index === -1) {
        state.selectedReviewIds.push(reviewId);
      } else {
        state.selectedReviewIds.splice(index, 1);
      }
    },

    clearSelectedReviews: (state) => {
      state.selectedReviewIds = [];
    },

    updateFilters: (state, action: PayloadAction<Partial<ReviewFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    resetFilters: (state) => {
      state.filters = initialState.filters;
    },

    clearErrors: (
      state,
      action: PayloadAction<keyof ReviewState["error"] | undefined>
    ) => {
      if (action.payload) {
        state.error[action.payload] = null;
      } else {
        Object.keys(state.error).forEach((key) => {
          state.error[key as keyof ReviewState["error"]] = null;
        });
      }
    },

    resetCurrentReview: (state) => {
      state.currentReview = null;
    },
  },

  extraReducers: (builder) => {
    // Fetch reviews
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading.fetchReviews = true;
        state.error.fetchReviews = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading.fetchReviews = false;
        state.reviews = action.payload.reviews;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading.fetchReviews = false;
        state.error.fetchReviews = action.payload as string;
      });

    // Fetch admin reviews
    builder
      .addCase(fetchAdminReviews.pending, (state) => {
        state.loading.fetchReviews = true;
        state.error.fetchReviews = null;
      })
      .addCase(fetchAdminReviews.fulfilled, (state, action) => {
        state.loading.fetchReviews = false;
        state.adminReviews = action.payload.reviews;
        state.pagination = action.payload.pagination;
        state.statusCounts =
          action.payload.statusCounts || initialState.statusCounts;
      })
      .addCase(fetchAdminReviews.rejected, (state, action) => {
        state.loading.fetchReviews = false;
        state.error.fetchReviews = action.payload as string;
      });

    // Fetch single review
    builder
      .addCase(fetchReviewById.pending, (state) => {
        state.loading.fetchReviews = true;
        state.error.fetchReviews = null;
      })
      .addCase(fetchReviewById.fulfilled, (state, action) => {
        state.loading.fetchReviews = false;
        state.currentReview = action.payload;
      })
      .addCase(fetchReviewById.rejected, (state, action) => {
        state.loading.fetchReviews = false;
        state.error.fetchReviews = action.payload as string;
        state.currentReview = null;
      });

    // Create review
    builder
      .addCase(createReview.pending, (state) => {
        state.loading.createReview = true;
        state.error.createReview = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading.createReview = false;
        // Add new review to the beginning of the list if it matches current filters
        if (
          state.filters.status === "PENDING" ||
          state.filters.status === "all"
        ) {
          state.reviews.unshift(action.payload.review);
        }
      })
      .addCase(createReview.rejected, (state, action) => {
        state.loading.createReview = false;
        state.error.createReview = action.payload as string;
      });

    // Update review
    builder
      .addCase(updateReview.pending, (state) => {
        state.loading.updateReview = true;
        state.error.updateReview = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.loading.updateReview = false;

        // Update in reviews array
        const index = state.reviews.findIndex(
          (r) => r.id === action.payload.review.id
        );
        if (index !== -1) {
          state.reviews[index] = action.payload.review;
        }

        // Update current review if it's the same
        if (state.currentReview?.id === action.payload.review.id) {
          state.currentReview = action.payload.review;
        }
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.loading.updateReview = false;
        state.error.updateReview = action.payload as string;
      });

    // Delete review
    builder
      .addCase(deleteReview.pending, (state) => {
        state.loading.deleteReview = true;
        state.error.deleteReview = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading.deleteReview = false;

        // Remove from reviews array
        state.reviews = state.reviews.filter(
          (r) => r.id !== action.payload.reviewId
        );
        state.adminReviews = state.adminReviews.filter(
          (r) => r.id !== action.payload.reviewId
        );

        // Clear current review if it's the deleted one
        if (state.currentReview?.id === action.payload.reviewId) {
          state.currentReview = null;
        }

        // Remove from selected reviews
        state.selectedReviewIds = state.selectedReviewIds.filter(
          (id) => id !== action.payload.reviewId
        );
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading.deleteReview = false;
        state.error.deleteReview = action.payload as string;
      });

    // Admin update review
    builder
      .addCase(adminUpdateReview.pending, (state) => {
        state.loading.updateReview = true;
        state.error.updateReview = null;
      })
      .addCase(adminUpdateReview.fulfilled, (state, action) => {
        state.loading.updateReview = false;

        // Update in admin reviews array
        const adminIndex = state.adminReviews.findIndex(
          (r) => r.id === action.payload.review.id
        );
        if (adminIndex !== -1) {
          state.adminReviews[adminIndex] = action.payload.review;
        }

        // Update in regular reviews array
        const reviewIndex = state.reviews.findIndex(
          (r) => r.id === action.payload.review.id
        );
        if (reviewIndex !== -1) {
          state.reviews[reviewIndex] = action.payload.review;
        }

        // Update current review
        if (state.currentReview?.id === action.payload.review.id) {
          state.currentReview = action.payload.review;
        }

        // Update status counts
        if (action.payload.previousStatus && action.payload.newStatus) {
          if (state.statusCounts[action.payload.previousStatus] > 0) {
            state.statusCounts[action.payload.previousStatus]--;
          }
          state.statusCounts[action.payload.newStatus] =
            (state.statusCounts[action.payload.newStatus] || 0) + 1;
        }
      })
      .addCase(adminUpdateReview.rejected, (state, action) => {
        state.loading.updateReview = false;
        state.error.updateReview = action.payload as string;
      });

    // Bulk update reviews
    builder
      .addCase(bulkUpdateReviews.pending, (state) => {
        state.loading.bulkUpdate = true;
        state.error.bulkUpdate = null;
      })
      .addCase(bulkUpdateReviews.fulfilled, (state, action) => {
        state.loading.bulkUpdate = false;

        const { action: bulkAction, reviewIds } = action.payload;

        if (bulkAction === "delete") {
          // Remove deleted reviews
          state.reviews = state.reviews.filter(
            (r) => !reviewIds.includes(r.id)
          );
          state.adminReviews = state.adminReviews.filter(
            (r) => !reviewIds.includes(r.id)
          );
        } else {
          // Update status for bulk approve/reject
          const newStatus = bulkAction === "approve" ? "APPROVED" : "REJECTED";

          // Update reviews arrays
          state.reviews.forEach((review) => {
            if (reviewIds.includes(review.id)) {
              review.status = newStatus;
              review.updatedAt = new Date().toISOString();

            }
          });

          state.adminReviews.forEach((review) => {
            if (reviewIds.includes(review.id)) {
              review.status = newStatus;
              review.updatedAt = new Date().toISOString();

            }
          });
        }

        // Clear selected reviews
        state.selectedReviewIds = [];
      })
      .addCase(bulkUpdateReviews.rejected, (state, action) => {
        state.loading.bulkUpdate = false;
        state.error.bulkUpdate = action.payload as string;
      });

    // Admin delete review
    builder
      .addCase(adminDeleteReview.pending, (state) => {
        state.loading.deleteReview = true;
        state.error.deleteReview = null;
      })
      .addCase(adminDeleteReview.fulfilled, (state, action) => {
        state.loading.deleteReview = false;

        // Remove from all arrays
        state.reviews = state.reviews.filter(
          (r) => r.id !== action.payload.reviewId
        );
        state.adminReviews = state.adminReviews.filter(
          (r) => r.id !== action.payload.reviewId
        );
        state.selectedReviewIds = state.selectedReviewIds.filter(
          (id) => id !== action.payload.reviewId
        );

        if (state.currentReview?.id === action.payload.reviewId) {
          state.currentReview = null;
        }
      })
      .addCase(adminDeleteReview.rejected, (state, action) => {
        state.loading.deleteReview = false;
        state.error.deleteReview = action.payload as string;
      });

    // Mark helpful
    builder
      .addCase(markReviewHelpful.pending, (state) => {
        state.loading.helpful = true;
        state.error.helpful = null;
      })
      .addCase(markReviewHelpful.fulfilled, (state, action) => {
        state.loading.helpful = false;

        const { reviewId, helpfulCount } = action.payload;

        // Update helpful count in all relevant arrays
        const updateHelpfulCount = (reviewArray: Review[]) => {
          const review = reviewArray.find((r) => r.id === reviewId);
          if (review) {
            review.helpfulCount = helpfulCount;
          }
        };

        updateHelpfulCount(state.reviews);
        updateHelpfulCount(state.adminReviews);

        if (state.currentReview?.id === reviewId) {
          state.currentReview.helpfulCount = helpfulCount;
        }
      })
      .addCase(markReviewHelpful.rejected, (state, action) => {
        state.loading.helpful = false;
        state.error.helpful = action.payload as string;
      });
  },
});

// Export actions
export const {
  setSelectedReviewIds,
  toggleReviewSelection,
  clearSelectedReviews,
  updateFilters,
  resetFilters,
  clearErrors,
  resetCurrentReview,
} = reviewSlice.actions;

// Selectors
export const selectReviews = (state: { reviews: ReviewState }) =>
  state.reviews.reviews;
export const selectAdminReviews = (state: { reviews: ReviewState }) =>
  state.reviews.adminReviews;
export const selectCurrentReview = (state: { reviews: ReviewState }) =>
  state.reviews.currentReview;
export const selectPagination = (state: { reviews: ReviewState }) =>
  state.reviews.pagination;
export const selectStatusCounts = (state: { reviews: ReviewState }) =>
  state.reviews.statusCounts;
export const selectSelectedReviewIds = (state: { reviews: ReviewState }) =>
  state.reviews.selectedReviewIds;
export const selectFilters = (state: { reviews: ReviewState }) =>
  state.reviews.filters;
export const selectLoading = (state: { reviews: ReviewState }) =>
  state.reviews.loading;
export const selectErrors = (state: { reviews: ReviewState }) =>
  state.reviews.error;

// Complex selectors
export const selectReviewsByStatus =
  (status: ReviewStatus) => (state: { reviews: ReviewState }) =>
    state.reviews.reviews.filter((review) => review.status === status);

export const selectPendingReviewsCount = (state: { reviews: ReviewState }) =>
  state.reviews.statusCounts.PENDING || 0;

export const selectIsLoading =
  (operation: keyof ReviewState["loading"]) =>
  (state: { reviews: ReviewState }) =>
    state.reviews.loading[operation] || false;

export const selectError =
  (operation: keyof ReviewState["error"]) =>
  (state: { reviews: ReviewState }) =>
    state.reviews.error[operation];

export const selectReviewById =
  (reviewId: string) => (state: { reviews: ReviewState }) =>
    state.reviews.reviews.find((review) => review.id === reviewId) ||
    state.reviews.adminReviews.find((review) => review.id === reviewId);

// Export reducer
export default reviewSlice.reducer;
