// Updated userSlice.ts with debugging

import api from '@/lib/api';
import { User, UserState } from '@/types/users';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Initial state
export const initialState: UserState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunk for fetching user data
export const fetchUser = createAsyncThunk(
  'user/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/users', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.data.user;
    } catch (error: any) {
      if (error.response) {
        return rejectWithValue(error.response.data.error || 'Failed to fetch user');
      }
      return rejectWithValue(
        error.message || 'An unexpected error occurred'
      );
    }
  }
);

// Create the user slice
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      });
  },
});

// Export actions
export const { clearUser, clearError, updateUser, setAuthenticated } = userSlice.actions;

// Enhanced selectors with debugging
export const selectUser = (state: any) => {
  const user = state?.user?.user || null;
  return user;
};

export const selectIsLoading = (state: any) => state?.user?.isLoading || false;
export const selectError = (state: any) => state?.user?.error || null;
export const selectIsAuthenticated = (state: any) => state?.user?.isAuthenticated || false;

// Enhanced admin selector with debugging
export const selectIsAdmin = (state: any) => {
  const user = state?.user?.user;
  
  // Try multiple possible ways the role might be stored
  if (!user) return false;
  
  // Check different possible role field names
  if (user.role === 'ADMIN') return true;
  if (user.role === 'admin') return true;
  if (user.userType === 'ADMIN') return true;
  if (user.userType === 'admin') return true;
  if (user.type === 'ADMIN') return true;
  if (user.type === 'admin') return true;
  if (user.isAdmin === true) return true;
  if (user.admin === true) return true;
  
  // Check if permissions array includes admin
  if (Array.isArray(user.permissions) && user.permissions.includes('ADMIN')) return true;
  if (Array.isArray(user.roles) && user.roles.includes('ADMIN')) return true;
  
  return false;
};

// Helper selectors for user display
export const selectUserDisplayName = (state: any) => {
  const user = state?.user?.user;
  if (!user) return 'User';
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.name) return user.name; // Use name field if available
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.email?.split('@')[0] || 'User';
};

export const selectUserInitial = (state: any) => {
  const user = state?.user?.user;
  if (!user) return 'U';
  if (user.initial) return user.initial; // Use provided initial
  if (user.firstName) return user.firstName.charAt(0).toUpperCase();
  if (user.name) return user.name.charAt(0).toUpperCase();
  if (user.email) return user.email.charAt(0).toUpperCase();
  return 'U';
};

export default userSlice.reducer;