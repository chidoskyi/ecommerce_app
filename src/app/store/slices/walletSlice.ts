import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import api from '@/lib/api'

// Types
export interface Transaction {
  id: string
  type: 'WALLET_TOPUP' | 'ORDER_PAYMENT' | 'REFUND' | 'credit' | 'debit' // Support both formats
  amount: number
  description: string
  date: string
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'PROCESSING' | 'REFUND' // Support both formats
  reference?: string
  createdAt: string | Date
}

export interface WalletBalance {
  balance: number
  currency: string
  lastUpdated: string
}

export interface WalletState {
  balance: WalletBalance | null
  transactions: Transaction[]
  loading: {
    balance: boolean
    transactions: boolean
    deposit: boolean
    verify: boolean
  }
  error: {
    balance: string | null
    transactions: string | null
    deposit: string | null
    verify: string | null
  }
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
    total: number
  }
  filters: {
    searchTerm: string
    filterType: 'All' | 'Credit' | 'Debit'
  }
  ui: {
    isBalanceVisible: boolean
    showAddFundsModal: boolean
  }
}

// Initial state
const initialState: WalletState = {
  balance: null,
  transactions: [],
  loading: {
    balance: false,
    transactions: false,
    deposit: false,
    verify: false
  },
  error: {
    balance: null,
    transactions: null,
    deposit: null,
    verify: null
  },
  pagination: {
    limit: 50,
    offset: 0,
    hasMore: true,
    total: 0
  },
  filters: {
    searchTerm: '',
    filterType: 'All'
  },
  ui: {
    isBalanceVisible: true,
    showAddFundsModal: false
  }
}

// Async thunks
export const fetchWalletBalance = createAsyncThunk(
  'wallet/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/wallet/balance')
      
      // Log the full response to verify data fetched from DB
      console.log('Fetched wallet balance response:', response.data)
      
      return response.data.data
    } catch (error: any) {
      console.error('Failed to fetch wallet balance:', error)
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch wallet balance')
    }
  }
)


export const fetchTransactions = createAsyncThunk(
  'wallet/fetchTransactions',
  async (
    params: { limit?: number; offset?: number; refresh?: boolean } = {},
    { rejectWithValue }
  ) => {
    try {
      const { limit = 50, offset = 0, refresh = false } = params;

      const response = await api.get('/api/wallet/transactions', {
        params: { limit, offset }
      });

      // Handle the API response structure
      const responseData = response.data;
      
      // Extract transactions from the response
      const transactions = responseData.data?.transactions || 
                          responseData.transactions || 
                          [];
      
      // Extract pagination info or use defaults
      const pagination = responseData.data?.pagination || 
                        responseData.pagination || 
                        { total: transactions.length, limit, offset, hasMore: false };

      return {
        transactions: transactions,
        pagination: pagination,
        refresh,
        hasMore: pagination.hasMore || transactions.length === limit
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch transactions');
    }
  }
);

// Fixed initiateDeposit to properly handle the response
export const initiateDeposit = createAsyncThunk(
  'wallet/initiateDeposit',
  async (
    depositData: { amount: number; email?: string },
    { rejectWithValue }
  ) => {
    try {
      console.log('Initiating deposit with data:', depositData);
      
      const response = await api.post('/api/wallet/deposit', depositData);
      
      console.log('Deposit API response:', response.data);
      
      // Handle different response structures
      let result = response.data;
      
      // If the response has a nested data object, extract it
      if (result.data && result.data.paymentUrl) {
        result = result.data;
      }
      
      // Ensure we have the authorization URL
      if (!result.paymentUrl) {
        throw new Error('No authorization URL received from payment gateway');
      }
      
      return {
        ...response.data, 
        reference: result.reference,
        access_code: result.access_code
      };
      
    } catch (error: any) {
      console.error('Deposit initiation error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message || 
                          'Failed to initiate deposit';
                          
      return rejectWithValue(errorMessage);
    }
  }
)
// Wallet slice
const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    // UI actions
    toggleBalanceVisibility: (state) => {
      state.ui.isBalanceVisible = !state.ui.isBalanceVisible
    },
    
    setShowAddFundsModal: (state, action: PayloadAction<boolean>) => {
      state.ui.showAddFundsModal = action.payload
    },

    // Filter actions
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.filters.searchTerm = action.payload
    },

    setFilterType: (state, action: PayloadAction<'All' | 'Credit' | 'Debit'>) => {
      state.filters.filterType = action.payload
    },

    // Pagination actions
    setPagination: (state, action: PayloadAction<Partial<WalletState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload }
    },

    // Clear errors
    clearError: (state, action: PayloadAction<keyof WalletState['error']>) => {
      state.error[action.payload] = null
    },

    clearAllErrors: (state) => {
      state.error = {
        balance: null,
        transactions: null,
        deposit: null,
        verify: null
      }
    },

    // Reset wallet state
    resetWalletState: (state) => {
      return { ...initialState, ui: state.ui }
    },

    // Add optimistic transaction (for immediate UI feedback)
    addOptimisticTransaction: (state, action: PayloadAction<Transaction>) => {
      state.transactions.unshift(action.payload)
    },

    // Remove optimistic transaction (if verification fails)
    removeOptimisticTransaction: (state, action: PayloadAction<string>) => {
      state.transactions = state.transactions.filter(t => t.id !== action.payload)
    }
  },
  extraReducers: (builder) => {
    // Fetch wallet balance
    builder
      .addCase(fetchWalletBalance.pending, (state) => {
        state.loading.balance = true
        state.error.balance = null
      })
      .addCase(fetchWalletBalance.fulfilled, (state, action) => {
        state.loading.balance = false
        state.balance = action.payload
      })
      .addCase(fetchWalletBalance.rejected, (state, action) => {
        state.loading.balance = false
        state.error.balance = action.payload as string
      })

    // Fetch transactions
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading.transactions = true
        state.error.transactions = null
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading.transactions = false
        const { transactions, refresh, hasMore } = action.payload
        
        if (refresh || state.pagination.offset === 0) {
          state.transactions = transactions
        } else {
          state.transactions.push(...transactions)
        }
        
        state.pagination.hasMore = hasMore
        state.pagination.total = state.transactions.length
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading.transactions = false
        state.error.transactions = action.payload as string
      })

    // Initiate deposit - Fixed to properly handle success
    builder
      .addCase(initiateDeposit.pending, (state) => {
        state.loading.deposit = true
        state.error.deposit = null
      })
      .addCase(initiateDeposit.fulfilled, (state, action) => {
        state.loading.deposit = false
        // Store the payment details for potential future use
        console.log('Deposit initiated successfully:', action.payload);
      })
      .addCase(initiateDeposit.rejected, (state, action) => {
        state.loading.deposit = false
        state.error.deposit = action.payload as string
        console.error('Deposit initiation failed:', action.payload);
      })

  },
})

// Export actions
export const {
  toggleBalanceVisibility,
  setShowAddFundsModal,
  setSearchTerm,
  setFilterType,
  setPagination,
  clearError,
  clearAllErrors,
  resetWalletState,
  addOptimisticTransaction,
  removeOptimisticTransaction
} = walletSlice.actions

// Selectors
export const selectWalletBalance = (state: { wallet: WalletState }) => state.wallet.balance
export const selectTransactions = (state: { wallet: WalletState }) => state.wallet.transactions
export const selectWalletLoading = (state: { wallet: WalletState }) => state.wallet.loading
export const selectWalletErrors = (state: { wallet: WalletState }) => state.wallet.error
export const selectWalletFilters = (state: { wallet: WalletState }) => state.wallet.filters
export const selectWalletUI = (state: { wallet: WalletState }) => state.wallet.ui
export const selectWalletPagination = (state: { wallet: WalletState }) => state.wallet.pagination

// Computed selectors
export const selectFilteredTransactions = (state: { wallet: WalletState }) => {
  const { transactions, filters } = state.wallet
  const { searchTerm, filterType } = filters

  return transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Handle both old and new transaction types
    const isCredit = transaction.type === 'WALLET_TOPUP' || 
                    transaction.type === 'REFUND' || 
                    transaction.type === 'credit'
    
    const isDebit = transaction.type === 'ORDER_PAYMENT' || 
                   transaction.type === 'debit'
    
    const matchesFilter = filterType === 'All' || 
                         (filterType === 'Credit' && isCredit) ||
                         (filterType === 'Debit' && isDebit)
    return matchesSearch && matchesFilter
  })
}

export const selectTotalBalance = (state: { wallet: WalletState }) => {
  const balance = state.wallet.balance
  return balance ? balance.balance : 0
}

export const selectIsLoading = (state: { wallet: WalletState }) => {
  const loading = state.wallet.loading
  return loading.balance || loading.transactions || loading.deposit || loading.verify
}

export const selectHasError = (state: { wallet: WalletState }) => {
  const error = state.wallet.error
  return !!(error.balance || error.transactions || error.deposit || error.verify)
}

export default walletSlice.reducer