// store/slices/addressSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {  Address, NewAddress } from '@/types'; // Adjust the import path as necessary
import api from "@/lib/api"
import { RootState } from '..';


export interface AddressUpdate extends Partial<NewAddress> {
  addressId: string;
}

// Async Thunks
export const fetchAddresses = createAsyncThunk(
  'address/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/addresses');
      if (!response.data) throw new Error('Failed to fetch addresses');
      const addresses = await response.data;
      return addresses;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch addresses'
      );
    }
  }
);

// Fixed createAddress thunk
export const createAddress = createAsyncThunk(
  'address/createAddress',
  async (addressData: NewAddress, { dispatch, rejectWithValue, getState }) => {
    try {
      // If this address is being set as default, first reset any existing default of the same type
      if (addressData.isDefault) {
        const { address } = getState() as { address: { addresses: Address[] } };
        const existingDefaults = address.addresses.filter(
          addr => addr.type === addressData.type && addr.isDefault
        );
        
        // Reset all existing defaults of this type
        for (const addr of existingDefaults) {
          await dispatch(updateAddress({
            addressId: addr.id,
            isDefault: false
          }));
        }
      }

      // ✅ FIXED: Use proper axios syntax
      const response = await api.post('/api/addresses', addressData);
      
      return response.data;
    } catch (error) {
      console.error('Create address error:', error);
      return rejectWithValue(
         error instanceof Error ? error.message : 'Failed to create address'
      );
    }
  }
);

// Fixed updateAddress thunk
export const updateAddress = createAsyncThunk(
  'address/updateAddress',
  async ({ addressId, ...updates }: AddressUpdate, { dispatch, rejectWithValue, getState }) => {
    try {
      // If this address is being set as default, first reset any existing default of the same type
      if (updates.isDefault) {
        const { address } = getState() as { address: { addresses: Address[] } };
        const existingDefaults = address.addresses.filter(
          addr => addr.type === updates.type && addr.isDefault && addr.id !== addressId
        );
        
        // Reset all existing defaults of this type
        for (const addr of existingDefaults) {
          await dispatch(updateAddress({
            addressId: addr.id,
            isDefault: false
          }));
        }
      }

      // ✅ FIXED: Use proper axios syntax
      const response = await api.put('/api/addresses', { 
        addressId, 
        ...updates 
      });
      
      return response.data;
    } catch (error) {
      console.error('Update address error:', error);
      return rejectWithValue(
         error instanceof Error ? error.message : 'Failed to update address'
      );
    }
  }
);

// Fixed deleteAddress thunk
export const deleteAddress = createAsyncThunk(
  'address/deleteAddress',
  async (addressId: string, { rejectWithValue }) => {
    try {
      // ✅ FIXED: Use proper axios syntax
      const response = await api.delete(`/api/addresses?addressId=${addressId}`);
      if (response.data) {
        console.log("Address Deleted")
      } 
      
      return addressId;
    } catch (error) {
      console.error('Delete address error:', error);
      return rejectWithValue(
         error instanceof Error ? error.message : 'Failed to delete address'
      );
    }
  }
);

export const setDefaultAddress = createAsyncThunk(
  'address/setDefaultAddress',
  async ({ addressId, type }: { addressId: string; type: 'SHIPPING' | 'BILLING' }, { dispatch, rejectWithValue }) => {
    try {
      await dispatch(updateAddress({
        addressId,
        type,
        isDefault: true
      })).unwrap();
      return { addressId, type };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to set default address'
      );
    }
  }
);

const initialState = {
  addresses: [] as Address[],
  loading: false,
  error: null as string | null,
};

const addressSlice = createSlice({
  name: 'address',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    // Local state management actions (for offline use)
    addAddressLocal: (state, action) => {
      const newAddress = {
        id: Date.now().toString(),
        userId: '', // Set from auth context
        ...action.payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      state.addresses.push(newAddress);
    },
    
    updateAddressLocal: (state, action) => {
      const { addressId, ...updates } = action.payload;
      const addressIndex = state.addresses.findIndex(addr => addr.id === addressId);
      
      if (addressIndex !== -1) {
        state.addresses[addressIndex] = {
          ...state.addresses[addressIndex],
          ...updates,
          updatedAt: new Date(),
        };
      }
    },
    
    deleteAddressLocal: (state, action) => {
      const addressId = action.payload;
      state.addresses = state.addresses.filter(addr => addr.id !== addressId);
    },
  },
  extraReducers: (builder) => {
    // Fetch Addresses
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses = action.payload;
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
    
    // Create Address
    builder
      .addCase(createAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAddress.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses.push(action.payload);
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
    
    // Update Address
    builder
      .addCase(updateAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.loading = false;
        const updatedAddress = action.payload;
        const index = state.addresses.findIndex(addr => addr.id === updatedAddress.id);
        if (index !== -1) {
          state.addresses[index] = updatedAddress;
        }
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
    
    // Delete Address
    builder
      .addCase(deleteAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.loading = false;
        state.addresses = state.addresses.filter(addr => addr.id !== action.payload);
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
    
    // Set Default Address
    builder
      .addCase(setDefaultAddress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setDefaultAddress.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(setDefaultAddress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  addAddressLocal,
  updateAddressLocal,
  deleteAddressLocal,
} = addressSlice.actions;

export default addressSlice.reducer;

// Selectors
export const selectAddresses = (state: RootState) => state.address.addresses;
export const selectAddressLoading = (state: RootState) => state.address.loading;
export const selectAddressError = (state: RootState) => state.address.error;
export const selectShippingAddresses = (state: RootState) => 
  state.address.addresses.filter((addr: Address) => addr.type === 'SHIPPING');
export const selectBillingAddresses = (state: RootState) => 
  state.address.addresses.filter((addr: Address) => addr.type === 'BILLING');
export const selectDefaultShippingAddress = (state: RootState) => 
  state.address.addresses.find((addr: Address) => addr.type === 'SHIPPING' && addr.isDefault);
export const selectDefaultBillingAddress = (state: RootState) => 
  state.address.addresses.find((addr: Address) => addr.type === 'BILLING' && addr.isDefault);