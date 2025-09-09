// src/store/slices/adminUsersSlice.ts
import api from '@/lib/api';
import { AdminUsersState, initialState, User, UserFilters, UserQueryParams } from '@/types/users';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
// import { handleApiError } from '@/lib/error';


// Helper function to build query string
const buildQueryString = (params: UserQueryParams): string => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);
  
  // Add filters
  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value.toString());
      }
    });
  }
  
  // Add field selection
  if (params.fields && params.fields.length > 0) {
    searchParams.set('fields', params.fields.join(','));
  }
  
  if (params.excludeFields && params.excludeFields.length > 0) {
    searchParams.set('excludeFields', params.excludeFields.join(','));
  }
  
  return searchParams.toString();
};

// Async Thunks
export const fetchUsers = createAsyncThunk(
  'adminUsers/fetchUsers',
  async (params: UserQueryParams = {}, { rejectWithValue }) => {
    try {
      const queryString = buildQueryString(params);
      const response = await api.get(`/api/admin/users?${queryString}`);
      return { data: response.data, params };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchUserById = createAsyncThunk(
  'adminUsers/fetchUserById',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/admin/users`, {
        params: { userId }
      });
      return response.data.user;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateUser = createAsyncThunk(
  'adminUsers/updateUser',
  async (
    { userId, userData }: { userId: string; userData: Partial<User> },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.put('/api/admin/users', userData, {
        params: { userId }
      });
      return response.data.user;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'adminUsers/deleteUser',
  async (userId: string, { rejectWithValue }) => {
    try {
      await api.delete('/api/admin/users', {
        params: { userId }
      });
      return userId;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const bulkDeleteUsers = createAsyncThunk(
  'adminUsers/bulkDeleteUsers',
  async (userIds: string[], { rejectWithValue }) => {
    try {
      // Execute all delete operations concurrently
      const deletePromises = userIds.map(async (userId) => {
        try {
          await api.delete('/api/admin/users', { params: { userId } });
          return { userId, success: true };
        } catch (error) {
          return { userId, success: false, error: (error as Error).message };
        }
      });
      
      const results = await Promise.all(deletePromises);
      
      const successful = results
        .filter((result) => result.success)
        .map((result) => result.userId);
      
      const failed = results
        .filter((result) => !result.success)
        .map((result) => ({
          userId: result.userId,
          error: result.error,
        }));

      return { successful, failed };
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const adminUsersSlice = createSlice({
  name: 'adminUsers',
  initialState,
  reducers: {
    // Query management
    setQuery: (state, action: PayloadAction<Partial<UserQueryParams>>) => {
      state.currentQuery = { ...state.currentQuery, ...action.payload };
    },
    
    setPagination: (state, action: PayloadAction<{ page?: number; limit?: number }>) => {
      if (action.payload.page !== undefined) {
        state.currentQuery.page = action.payload.page;
        state.pagination.page = action.payload.page;
      }
      if (action.payload.limit !== undefined) {
        state.currentQuery.limit = action.payload.limit;
        state.pagination.limit = action.payload.limit;
      }
    },
    
    setSorting: (state, action: PayloadAction<{ sortBy?: string; sortOrder?: 'asc' | 'desc' }>) => {
      if (action.payload.sortBy !== undefined) {
        state.currentQuery.sortBy = action.payload.sortBy;
        state.sorting.sortBy = action.payload.sortBy;
      }
      if (action.payload.sortOrder !== undefined) {
        state.currentQuery.sortOrder = action.payload.sortOrder;
        state.sorting.sortOrder = action.payload.sortOrder;
      }
    },
    
    setFilters: (state, action: PayloadAction<UserFilters>) => {
      state.currentQuery.filters = action.payload;
      state.activeFilters = action.payload;
    },
    
    addFilter: (state, action: PayloadAction<{ 
      key: keyof UserFilters; 
      value: UserFilters[keyof UserFilters] 
    }>) => {
      const { key, value } = action.payload;
      if (!state.currentQuery.filters) state.currentQuery.filters = {} as UserFilters;
      state.currentQuery.filters[key] = value;
      state.activeFilters[key] = value;
    },
    
    removeFilter: (state, action: PayloadAction<keyof UserFilters>) => {
      if (state.currentQuery.filters) {
        delete state.currentQuery.filters[action.payload];
      }
      delete state.activeFilters[action.payload];
    },
    
    clearFilters: (state) => {
      state.currentQuery.filters = {};
      state.activeFilters = {};
    },
    
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      if (!state.currentQuery.filters) state.currentQuery.filters = {};
      if (action.payload.trim()) {
        state.currentQuery.filters.search = action.payload.trim();
        state.activeFilters.search = action.payload.trim();
      } else {
        delete state.currentQuery.filters.search;
        delete state.activeFilters.search;
      }
    },
    
    // Selection management
    setSelectedUser: (state, action: PayloadAction<User | null>) => {
      state.selectedUser = action.payload;
    },
    
    toggleUserSelection: (state, action: PayloadAction<string>) => {
      const userId = action.payload;
      const index = state.selectedUserIds.indexOf(userId);
      if (index > -1) {
        state.selectedUserIds.splice(index, 1);
      } else {
        state.selectedUserIds.push(userId);
      }
    },
    
    selectAllUsers: (state) => {
      state.selectedUserIds = state.users.map(user => user.id);
    },
    
    clearSelection: (state) => {
      state.selectedUserIds = [];
    },
    
    // Error management
    clearErrors: (state) => {
      state.error = null;
      state.userError = null;
      state.updateError = null;
      state.deleteError = null;
    },
    
    clearError: (state, action: PayloadAction<'fetch' | 'user' | 'update' | 'delete'>) => {
      switch (action.payload) {
        case 'fetch':
          state.error = null;
          break;
        case 'user':
          state.userError = null;
          break;
        case 'update':
          state.updateError = null;
          break;
        case 'delete':
          state.deleteError = null;
          break;
      }
    },
    
    // Cache management
    clearCache: (state) => {
      state.cache = {};
    },
    
    // Reset state
    // resetUsersState: (state) => {
    //   return { ...initialState };
    // },
  },
  
  extraReducers: (builder) => {
    // Fetch Users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        const { data, params } = action.payload;
        
        state.loading = false;
         state.error = null;
        state.users = data.users;
        state.pagination = data.pagination;
        state.sorting = data.sorting;
        state.activeFilters = data.filters || {};
        state.currentQuery = params;
        state.lastFetch = Date.now();
        
        // Cache the response
        const cacheKey = buildQueryString(params);
        state.cache[cacheKey] = data;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Fetch User By ID
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loadingUser = true;
        state.userError = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loadingUser = false;
        state.selectedUser = action.payload;
        
        // Update user in users array if it exists
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index > -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loadingUser = false;
        state.userError = action.payload as string;
      });
    
    // Update User
    builder
      .addCase(updateUser.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.updating = false;
        
        // Update user in users array
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index > -1) {
          state.users[index] = action.payload;
        }
        
        // Update selected user if it's the same
        if (state.selectedUser && state.selectedUser.id === action.payload.id) {
          state.selectedUser = action.payload;
        }
        
        // Clear cache as data has changed
        state.cache = {};
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload as string;
      });
    
    // Delete User
    builder
      .addCase(deleteUser.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.deleting = false;
        
        // Remove user from users array
        state.users = state.users.filter(user => user.id !== action.payload);
        
        // Clear selected user if it was deleted
        if (state.selectedUser && state.selectedUser.id === action.payload) {
          state.selectedUser = null;
        }
        
        // Remove from selection
        state.selectedUserIds = state.selectedUserIds.filter(id => id !== action.payload);
        
        // Update pagination total
        if (state.pagination.total > 0) {
          state.pagination.total -= 1;
          state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        }
        
        // Clear cache as data has changed
        state.cache = {};
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload as string;
      });
    
    // Bulk Delete Users
    builder
      .addCase(bulkDeleteUsers.pending, (state) => {
        state.deleting = true;
        state.deleteError = null;
      })
      .addCase(bulkDeleteUsers.fulfilled, (state, action) => {
        state.deleting = false;
        const { successful } = action.payload;
        
        // Remove successfully deleted users
        state.users = state.users.filter(user => !successful.includes(user.id));
        
        // Clear selected user if it was deleted
        if (state.selectedUser && successful.includes(state.selectedUser.id)) {
          state.selectedUser = null;
        }
        
        // Clear selections
        state.selectedUserIds = [];
        
        // Update pagination total
        state.pagination.total -= successful.length;
        state.pagination.totalPages = Math.ceil(state.pagination.total / state.pagination.limit);
        
        // Clear cache as data has changed
        state.cache = {};
      })
      .addCase(bulkDeleteUsers.rejected, (state, action) => {
        state.deleting = false;
        state.deleteError = action.payload as string;
      });
  },
});

// Export actions
export const {
  setQuery,
  setPagination,
  setSorting,
  setFilters,
  addFilter,
  removeFilter,
  clearFilters,
  setSearchTerm,
  setSelectedUser,
  toggleUserSelection,
  selectAllUsers,
  clearSelection,
  clearErrors,
  clearError,
  clearCache,
  // resetUsersState,
} = adminUsersSlice.actions;

// Selectors
export const selectUsers = (state: { adminUsers: AdminUsersState }) => state.adminUsers.users;
export const selectSelectedUser = (state: { adminUsers: AdminUsersState }) => state.adminUsers.selectedUser;
export const selectPagination = (state: { adminUsers: AdminUsersState }) => state.adminUsers.pagination;
export const selectSorting = (state: { adminUsers: AdminUsersState }) => state.adminUsers.sorting;
export const selectActiveFilters = (state: { adminUsers: AdminUsersState }) => state.adminUsers.activeFilters;
export const selectCurrentQuery = (state: { adminUsers: AdminUsersState }) => state.adminUsers.currentQuery;
export const selectLoading = (state: { adminUsers: AdminUsersState }) => state.adminUsers.loading;
export const selectError = (state: { adminUsers: AdminUsersState }) => state.adminUsers.error;
export const selectSelectedUserIds = (state: { adminUsers: AdminUsersState }) => state.adminUsers.selectedUserIds;
export const selectSearchTerm = (state: { adminUsers: AdminUsersState }) => state.adminUsers.searchTerm;

// Complex selectors
export const selectIsAllSelected = (state: { adminUsers: AdminUsersState }) => 
  state.adminUsers.users.length > 0 && 
  state.adminUsers.selectedUserIds.length === state.adminUsers.users.length;

export const selectHasSelection = (state: { adminUsers: AdminUsersState }) => 
  state.adminUsers.selectedUserIds.length > 0;

export const selectFilterCount = (state: { adminUsers: AdminUsersState }) => 
  Object.keys(state.adminUsers.activeFilters).length;

export const selectUserById = (state: { adminUsers: AdminUsersState }, userId: string) =>
  state.adminUsers.users.find(user => user.id === userId);

export default adminUsersSlice.reducer;