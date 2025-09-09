import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { AdminReviewState, BulkReviewPayload, initialState, Review, ReviewFilters, ReviewStatus } from '@/types/reviews';
import { AppDispatch, RootState } from '..';

// Types for API error responses
interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

// Type guard for API errors
function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null;
}



export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  statusCounts: {
    [key: string]: number;
  };
}

export interface UpdateReviewPayload {
  id: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified?: boolean;
  action?: 'approve' | 'reject';
}



// Async Thunks
export const fetchReviews = createAsyncThunk<ReviewsResponse, Partial<ReviewFilters>>(
  'adminReviews/fetchReviews',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      
      params.append('page', (filters.page || 1).toString());
      params.append('limit', (filters.limit || 20).toString());
      params.append('status', filters.status || 'PENDING');
      
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/api/admin/reviews?${params.toString()}`);
      return response.data;
    } catch (error: unknown) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch reviews');
      }
      return rejectWithValue('Failed to fetch reviews');
    }
  }
);

export const updateReview = createAsyncThunk<
  { review: Review; message: string; previousStatus: string; newStatus: string },
  UpdateReviewPayload
>(
  'adminReviews/updateReview',
  async (updateData, { rejectWithValue }) => {
    try {
      const { id, ...data } = updateData;
      const params = new URLSearchParams({ id });
      
      const response = await api.put(`/api/admin/reviews?${params.toString()}`, data);
      return response.data;
    } catch (error: unknown) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.error || error.message || 'Failed to update review');
      }
      return rejectWithValue('Failed to update review');
    }
  }
);

export const deleteReview = createAsyncThunk<
  { message: string },
  string
>(
  'adminReviews/deleteReview',
  async (reviewId, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ id: reviewId });
      const response = await api.delete(`/api/admin/reviews?${params.toString()}`);
      return { ...response.data, reviewId };
    } catch (error: unknown) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.error || error.message || 'Failed to delete review');
      }
      return rejectWithValue('Failed to delete review');
    }
  }
);

export const bulkUpdateReviews = createAsyncThunk<
  { updatedCount?: number; message: string },
  BulkReviewPayload
>(
  'adminReviews/bulkUpdateReviews',
  async ({ action, reviewIds }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/reviews/bulk', {
        action,
        reviewIds,
      });
      return response.data;
    } catch (error: unknown) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.error || error.message || 'Failed to perform bulk operation');
      }
      return rejectWithValue('Failed to perform bulk operation');
    }
  }
);

// Slice
const adminReviewSlice = createSlice({
  name: 'adminReviews',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<ReviewFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      
      // Reset to page 1 when filters change (except when only changing page)
      if (action.payload.page === undefined) {
        state.filters.page = 1;
      }
    },
    
    clearFilters: (state) => {
      state.filters = {
        page: 1,
        limit: state.filters.limit,
        status: 'PENDING',
      };
    },
    
    setCurrentReview: (state, action: PayloadAction<Review | null>) => {
      state.currentReview = action.payload;
    },
    
    clearCurrentReview: (state) => {
      state.currentReview = null;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Selection management for bulk operations
    toggleReviewSelection: (state, action: PayloadAction<string>) => {
      const reviewId = action.payload;
      const index = state.selectedReviews.indexOf(reviewId);
      
      if (index > -1) {
        state.selectedReviews.splice(index, 1);
      } else {
        state.selectedReviews.push(reviewId);
      }
    },
    
    selectAllReviews: (state) => {
      state.selectedReviews = state.reviews.map(review => review.id);
    },
    
    clearSelectedReviews: (state) => {
      state.selectedReviews = [];
    },
    
    // Optimistic updates
    optimisticUpdateReview: (state, action: PayloadAction<{ id: string; updates: Partial<Review> }>) => {
      const { id, updates } = action.payload;
      
      // Update in reviews list
      const reviewIndex = state.reviews.findIndex(review => review.id === id);
      if (reviewIndex !== -1) {
        state.reviews[reviewIndex] = { ...state.reviews[reviewIndex], ...updates };
      }
      
      // Update current review if it matches
      if (state.currentReview?.id === id) {
        state.currentReview = { ...state.currentReview, ...updates };
      }
    },
    
    // Remove review from list
    removeReview: (state, action: PayloadAction<string>) => {
      state.reviews = state.reviews.filter(review => review.id !== action.payload);
      if (state.currentReview?.id === action.payload) {
        state.currentReview = null;
      }
      // Remove from selected reviews if present
      state.selectedReviews = state.selectedReviews.filter(id => id !== action.payload);
    },
  },
  
  extraReducers: (builder) => {
    // Fetch Reviews
    builder
      .addCase(fetchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload.reviews;
        state.pagination = action.payload.pagination;
        state.statusCounts = action.payload.statusCounts;
        // Clear selections when new data is loaded
        state.selectedReviews = [];
      })
      .addCase(fetchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update Review
    builder
      .addCase(updateReview.pending, (state, action) => {
        state.actionLoading.updating = action.meta.arg.id;
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.actionLoading.updating = null;
        
        const updatedReview = action.payload.review;
        
        // Update in reviews list
        const reviewIndex = state.reviews.findIndex(review => review.id === updatedReview.id);
        if (reviewIndex !== -1) {
          state.reviews[reviewIndex] = updatedReview;
        }
        
        // Update current review if it matches
        if (state.currentReview?.id === updatedReview.id) {
          state.currentReview = updatedReview;
        }
        
        // Update status counts based on the change
        const { previousStatus, newStatus } = action.payload;
        if (state.statusCounts[previousStatus]) {
          state.statusCounts[previousStatus]--;
        }
        if (state.statusCounts[newStatus]) {
          state.statusCounts[newStatus]++;
        } else {
          state.statusCounts[newStatus] = 1;
        }
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.actionLoading.updating = null;
        state.error = action.payload as string;
      });

    // Delete Review
    builder
      .addCase(deleteReview.pending, (state, action) => {
        state.actionLoading.deleting = action.meta.arg;
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.actionLoading.deleting = null;
        
        // Remove from reviews list
        const reviewId = action.meta.arg;
        const review = state.reviews.find(r => r.id === reviewId);
        if (review) {
          // Update status count
          if (state.statusCounts[review.status]) {
            state.statusCounts[review.status]--;
          }
          
          // Remove from list
          state.reviews = state.reviews.filter(r => r.id !== reviewId);
          
          // Clear current review if it matches
          if (state.currentReview?.id === reviewId) {
            state.currentReview = null;
          }
          
          // Remove from selected reviews
          state.selectedReviews = state.selectedReviews.filter(id => id !== reviewId);
        }
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.actionLoading.deleting = null;
        state.error = action.payload as string;
      });

    // Bulk Update Reviews
    builder
      .addCase(bulkUpdateReviews.pending, (state) => {
        state.actionLoading.bulkOperation = true;
        state.error = null;
      })
      .addCase(bulkUpdateReviews.fulfilled, (state) => {
        state.actionLoading.bulkOperation = false;
        
        // Clear selected reviews after successful bulk operation
        state.selectedReviews = [];
        
        // For bulk operations, we should refetch to get updated data
        // The component should handle this by dispatching fetchReviews
      })
      .addCase(bulkUpdateReviews.rejected, (state, action) => {
        state.actionLoading.bulkOperation = false;
        state.error = action.payload as string;
      });
  },
});

// Action creators
export const {
  setFilters,
  clearFilters,
  setCurrentReview,
  clearCurrentReview,
  clearError,
  toggleReviewSelection,
  selectAllReviews,
  clearSelectedReviews,
  optimisticUpdateReview,
  removeReview,
} = adminReviewSlice.actions;

// Selectors
export const selectReviews = (state: { adminReviews: AdminReviewState }) => state.adminReviews.reviews;
export const selectCurrentReview = (state: { adminReviews: AdminReviewState }) => state.adminReviews.currentReview;
export const selectReviewsLoading = (state: { adminReviews: AdminReviewState }) => state.adminReviews.loading;
export const selectReviewsError = (state: { adminReviews: AdminReviewState }) => state.adminReviews.error;
export const selectReviewsFilters = (state: { adminReviews: AdminReviewState }) => state.adminReviews.filters;
export const selectReviewsPagination = (state: { adminReviews: AdminReviewState }) => state.adminReviews.pagination;
export const selectReviewsStatusCounts = (state: { adminReviews: AdminReviewState }) => state.adminReviews.statusCounts;
export const selectActionLoading = (state: { adminReviews: AdminReviewState }) => state.adminReviews.actionLoading;
export const selectSelectedReviews = (state: { adminReviews: AdminReviewState }) => state.adminReviews.selectedReviews;

// Complex selectors
export const selectReviewById = (reviewId: string) => (state: { adminReviews: AdminReviewState }) =>
  state.adminReviews.reviews.find(review => review.id === reviewId);

export const selectReviewsByStatus = (status: Review['status']) => (state: { adminReviews: AdminReviewState }) =>
  state.adminReviews.reviews.filter(review => review.status === status);

export const selectVerifiedReviews = (state: { adminReviews: AdminReviewState }) =>
  state.adminReviews.reviews.filter(review => review.isVerified);

export const selectReviewsStats = (state: { adminReviews: AdminReviewState }) => {
  const reviews = state.adminReviews.reviews;
  const statusCounts = state.adminReviews.statusCounts;
  
  return {
    total: reviews.length,
    pending: statusCounts.PENDING || 0,
    approved: statusCounts.APPROVED || 0,
    rejected: statusCounts.REJECTED || 0,
    verified: reviews.filter(r => r.isVerified).length,
    averageRating: reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0,
  };
};

export const selectIsReviewUpdating = (reviewId: string) => (state: { adminReviews: AdminReviewState }) =>
  state.adminReviews.actionLoading.updating === reviewId;

export const selectIsReviewDeleting = (reviewId: string) => (state: { adminReviews: AdminReviewState }) =>
  state.adminReviews.actionLoading.deleting === reviewId;

export const selectIsBulkOperationRunning = (state: { adminReviews: AdminReviewState }) =>
  state.adminReviews.actionLoading.bulkOperation;

export const selectSelectedReviewsCount = (state: { adminReviews: AdminReviewState }) =>
  state.adminReviews.selectedReviews.length;

export const selectIsAllReviewsSelected = (state: { adminReviews: AdminReviewState }) =>
  state.adminReviews.selectedReviews.length === state.adminReviews.reviews.length && state.adminReviews.reviews.length > 0;

export default adminReviewSlice.reducer;

// Thunk action creator types
type ThunkAction<R = void> = (dispatch: AppDispatch, getState: () => RootState) => R;

// Helper action creators
export const refreshReviews = (filters?: Partial<ReviewFilters>): ThunkAction => 
  (dispatch, getState) => {
    const currentFilters = getState().adminReviews.filters;
    dispatch(fetchReviews({ ...currentFilters, ...filters }));
  };

  export const approveReview = (reviewId: string): ThunkAction => (dispatch) => {
    // Optimistic update
    dispatch(optimisticUpdateReview({ 
      id: reviewId, 
      updates: { status: 'APPROVED', updatedAt: new Date().toISOString() } 
    }));
    
    // Actual update
    return dispatch(updateReview({ id: reviewId, action: 'approve' }));
  };

  export const rejectReview = (reviewId: string): ThunkAction => (dispatch) => {
    // Optimistic update
    dispatch(optimisticUpdateReview({ 
      id: reviewId, 
      updates: { status: 'REJECTED', updatedAt: new Date().toISOString() } 
    }));
    
    // Actual update
    return dispatch(updateReview({ id: reviewId, action: 'reject' }));
  };

  export const toggleReviewVerification = (reviewId: string, isVerified: boolean): ThunkAction => (dispatch) => {
    // Optimistic update
    dispatch(optimisticUpdateReview({ 
      id: reviewId, 
      updates: { isVerified, updatedAt: new Date().toISOString() } 
    }));
    
    // Actual update
    return dispatch(updateReview({ id: reviewId, isVerified }));
  };

  export const searchReviews = (searchTerm: string): ThunkAction => (dispatch, getState) => {
    const currentFilters = getState().adminReviews.filters;
    dispatch(setFilters({ search: searchTerm, page: 1 }));
    dispatch(fetchReviews({ ...currentFilters, search: searchTerm, page: 1 }));
  };

  export const filterReviewsByStatus = (status: ReviewStatus | "all"): ThunkAction => 
    (dispatch, getState) => {
      const currentFilters = getState().adminReviews.filters;
      dispatch(setFilters({ status, page: 1 }));
      dispatch(fetchReviews({ ...currentFilters, status, page: 1 }));
    };
  
  export const bulkApproveReviews = (reviewIds: string[]): ThunkAction => (dispatch) => {
    return dispatch(bulkUpdateReviews({ action: 'approve', reviewIds }));
  };
  


  export const bulkRejectReviews = (reviewIds: string[]): ThunkAction => (dispatch) => {
    return dispatch(bulkUpdateReviews({ action: 'reject', reviewIds }));
  };
  
  export const bulkDeleteReviews = (reviewIds: string[]): ThunkAction => (dispatch) => {
    return dispatch(bulkUpdateReviews({ action: 'delete', reviewIds }));
  };