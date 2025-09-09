// Updated userSlice.ts with proper TypeScript types

import api from '@/lib/api';
import { User, UserState } from '@/types/users';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '..';

// Initial state
export const initialState: UserState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
};

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

interface UserApiResponse {
  user: User;
}

// Type guard for API errors
function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null;
}

// Async thunk for fetching user data
export const fetchUser = createAsyncThunk<
  User,
  void,
  { rejectValue: string }
>(
  'user/fetchUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<UserApiResponse>('/api/users', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.data.user;
    } catch (error: unknown) {
      if (isApiError(error)) {
        return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch user');
      }
    
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
    
      return rejectWithValue('An unexpected error occurred');
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
        state.error = action.payload || 'Failed to fetch user';
      });
  },
});

// Export actions
export const { clearUser, clearError, updateUser, setAuthenticated } = userSlice.actions;

// Properly typed selectors
export const selectUser = (state: RootState): User | null => {
  return state.user.user;
};

export const selectIsLoading = (state: RootState): boolean => {
  return state.user.isLoading;
};

export const selectError = (state: RootState): string | null => {
  return state.user.error;
};

export const selectIsAuthenticated = (state: RootState): boolean => {
  return state.user.isAuthenticated;
};

// Enhanced admin selector with proper typing
export const selectIsAdmin = (state: RootState): boolean => {
  const user = state.user.user;
  
  if (!user) return false;
  
  // Check different possible role field names with proper type checking
  if ('role' in user && typeof user.role === 'string') {
    if (user.role === "ADMIN") return true;
  }
  
  if ('userType' in user && typeof user.userType === 'string') {
    if (user.userType === 'ADMIN' || user.userType === 'admin') return true;
  }
  
  if ('type' in user && typeof user.type === 'string') {
    if (user.type === 'ADMIN' || user.type === 'admin') return true;
  }
  
  if ('isAdmin' in user && typeof user.isAdmin === 'boolean') {
    if (user.isAdmin === true) return true;
  }
  
  if ('admin' in user && typeof user.admin === 'boolean') {
    if (user.admin === true) return true;
  }
  
  // Check if permissions array includes admin
  if ('permissions' in user && Array.isArray(user.permissions)) {
    if (user.permissions.includes('ADMIN')) return true;
  }
  
  if ('roles' in user && Array.isArray(user.roles)) {
    if (user.roles.includes('ADMIN')) return true;
  }
  
  return false;
};

// Helper selectors for user display with proper typing
export const selectUserDisplayName = (state: RootState): string => {
  const user = state.user.user;
  
  if (!user) return 'User';
  
  // Type-safe property access with proper fallbacks
  const firstName = 'firstName' in user && typeof user.firstName === 'string' ? user.firstName : null;
  const lastName = 'lastName' in user && typeof user.lastName === 'string' ? user.lastName : null;
  const name = 'name' in user && typeof user.name === 'string' ? user.name : null;
  const email = 'email' in user && typeof user.email === 'string' ? user.email : null;
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  if (name) return name;
  if (firstName) return firstName;
  if (lastName) return lastName;
  
  if (email) {
    return email.split('@')[0] || 'User';
  }
  
  return 'User';
};

export const selectUserInitial = (state: RootState): string => {
  const user = state.user.user;
  
  if (!user) return 'U';
  
  // Type-safe property access
  if ('initial' in user && typeof user.initial === 'string') {
    return user.initial;
  }
  
  if ('firstName' in user && typeof user.firstName === 'string') {
    return user.firstName.charAt(0).toUpperCase();
  }
  
  if ('name' in user && typeof user.name === 'string') {
    return user.name.charAt(0).toUpperCase();
  }
  
  if ('email' in user && typeof user.email === 'string') {
    return user.email.charAt(0).toUpperCase();
  }
  
  return 'U';
};

// Additional type-safe selectors
export const selectUserEmail = (state: RootState): string | null => {
  const user = state.user.user;
  return user && 'email' in user && typeof user.email === 'string' ? user.email : null;
};

export const selectUserRole = (state: RootState): string | null => {
  const user = state.user.user;
  
  if (!user) return null;
  
  if ('role' in user && typeof user.role === 'string') return user.role;
  if ('userType' in user && typeof user.userType === 'string') return user.userType;
  if ('type' in user && typeof user.type === 'string') return user.type;
  
  return null;
};

export const selectUserPermissions = (state: RootState): string[] => {
  const user = state.user.user;
  
  if (!user) return [];
  
  if ('permissions' in user && Array.isArray(user.permissions)) {
    // Ensure all items are strings
    return user.permissions.filter((permission): permission is string => 
      typeof permission === 'string'
    );
  }
  
  if ('roles' in user && Array.isArray(user.roles)) {
    // Ensure all items are strings
    return user.roles.filter((role): role is string => 
      typeof role === 'string'
    );
  }
  
  return [];
};

export default userSlice.reducer;