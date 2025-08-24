// src/store/slices/userSlice.ts
import api from '@/lib/api';
import { User, UserState } from '@/types/users';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';



// Initial state
const initialState: UserState = {
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
          const response = await api.get(`/api/users`, {});
  
          console.log('📡 API Response:', {
              status: response.status,
              statusText: response.statusText
          });
  
          const responseData = response.data;
          console.log('✅ User data received:', responseData);
          
          // You need to return the data so the Redux store can use it
          return responseData;
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : 'An unexpected error occurred'
        );
      }
    }
  );

// Create the user slice
const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // Clear user data (for logout)
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    
    // Clear error
    clearError: (state) => {
      state.error = null;
    },
    
    // Update user data (for profile updates)
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    // Set authentication status
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchUser pending
      .addCase(fetchUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // Handle fetchUser fulfilled
      .addCase(fetchUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      // Handle fetchUser rejected
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

// Selectors
export const selectUser = (state: { user: UserState }) => state.user.user;
export const selectIsLoading = (state: { user: UserState }) => state.user.isLoading;
export const selectError = (state: { user: UserState }) => state.user.error;
export const selectIsAuthenticated = (state: { user: UserState }) => state.user.isAuthenticated;
export const selectIsAdmin = (state: { user: UserState }) => state.user.user?.role === 'ADMIN';

// Helper selectors for user display
export const selectUserDisplayName = (state: { user: UserState }) => {
  const user = state.user.user;
  if (!user) return 'User';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.email.split('@')[0]; // Fallback to email username
};

export const selectUserInitial = (state: { user: UserState }) => {
  const user = state.user.user;
  if (!user) return 'U';
  
  if (user.firstName) return user.firstName.charAt(0).toUpperCase();
  return user.email.charAt(0).toUpperCase();
};

// Export reducer
export default userSlice.reducer;