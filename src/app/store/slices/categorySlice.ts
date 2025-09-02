// store/slices/categorySlice.ts
import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit'
import { Category, CategoryState, NewCategory, CategoryStatus } from '@/types/categories'
import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { useMemo, useCallback } from 'react'
import axios from 'axios'

// Initial state
const initialState: CategoryState = {
  categories: [],
  loading: false,
  error: null,
  activeCategory: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  }
}

// Helper function to generate temporary IDs for optimistic updates
const generateId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Async thunks for API calls
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (
    params: { 
      page?: number
      limit?: number
      search?: string
      status?: CategoryStatus
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const searchParams = new URLSearchParams()
      
      if (params.page) searchParams.set('page', params.page.toString())
      if (params.limit) searchParams.set('limit', params.limit.toString())
      if (params.search) searchParams.set('search', params.search)
      if (params.status) searchParams.set('status', params.status)
      if (params.sortBy) searchParams.set('sortBy', params.sortBy)
      if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder)

      const url = `/api/categories${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

      const response = await axios.get(url)

      if (!response.data || !response.data.categories) {
        throw new Error('Invalid response format')
      }

      return response.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories')
    }
  }
)

// Category slice
const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    setActiveCategory: (state, action: PayloadAction<Category | null>) => {
      state.activeCategory = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    
    // addCategoryOptimistic: (state, action: PayloadAction<NewCategory>) => {
    //   const tempCategory = { ...action.payload, id: generateId() }
    //   state.categories.push(tempCategory)
    // },
    
    updateCategoryOptimistic: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Category> }>
    ) => {
      const { id, updates } = action.payload
      const index = state.categories.findIndex(cat => cat.id === id)
      if (index !== -1) {
        state.categories[index] = { ...state.categories[index], ...updates }
      }
    },
    
    removeCategoryOptimistic: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.filter(cat => cat.id !== action.payload)
    },
    
    clearStore: (state) => {
      state.categories = []
      state.loading = false
      state.error = null
      state.activeCategory = null
      state.pagination = { page: 1, limit: 10, total: 0, pages: 0 }
    }
  },
  extraReducers: (builder) => {
    // Fetch categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false
        state.categories = action.payload.categories || []
        state.pagination = action.payload.pagination || state.pagination
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
        state.categories = []
      });
  }
})

// Export actions
export const {
  setActiveCategory,
  setError,
  clearError,
  addCategoryOptimistic,
  updateCategoryOptimistic,
  removeCategoryOptimistic,
  clearStore
} = categorySlice.actions

// Base selectors
export const selectCategories = (state: { categories: CategoryState }) => state.categories.categories
export const selectLoading = (state: { categories: CategoryState }) => state.categories.loading
export const selectError = (state: { categories: CategoryState }) => state.categories.error
export const selectActiveCategory = (state: { categories: CategoryState }) => state.categories.activeCategory
export const selectPagination = (state: { categories: CategoryState }) => state.categories.pagination

// Memoized utility selectors using createSelector
export const selectCategoryById = (id: string) => 
  createSelector(
    [selectCategories],
    (categories) => categories.find(cat => cat.id === id)
  )

export const selectCategoriesByStatus = (status: CategoryStatus) => 
  createSelector(
    [selectCategories],
    (categories) => categories.filter(cat => cat.status === status)
  )

export const selectSearchCategories = (query: string) => 
  createSelector(
    [selectCategories],
    (categories) => {
      if (!query) return categories
      
      const lowercaseQuery = query.toLowerCase()
      return categories.filter(cat =>
        cat.name?.toLowerCase().includes(lowercaseQuery) ||
        cat.description?.toLowerCase().includes(lowercaseQuery)
      )
    }
  )

// Custom hooks for category state and utilities
export const useCategorySelectors = () => {
  const categories = useAppSelector(selectCategories)
  const loading = useAppSelector(selectLoading)
  const error = useAppSelector(selectError)
  const activeCategory = useAppSelector(selectActiveCategory)
  const pagination = useAppSelector(selectPagination)

  return useMemo(() => ({
    categories,
    loading,
    error,
    activeCategory,
    pagination
  }), [categories, loading, error, activeCategory, pagination])
}

// Utility functions for category operations
export const useCategoryUtilities = () => {
  const categories = useAppSelector(selectCategories)

  const getCategoryById = useCallback((id: string) => {
    return categories.find(cat => cat.id === id)
  }, [categories])

  const getCategoriesByStatus = useCallback((status: CategoryStatus) => {
    return categories.filter(cat => cat.status === status)
  }, [categories])

  const searchCategories = useCallback((query?: string) => {
    if (!query) return categories
    
    const lowercaseQuery = query.toLowerCase()
    return categories.filter(cat =>
      cat.name?.toLowerCase().includes(lowercaseQuery) ||
      cat.description?.toLowerCase().includes(lowercaseQuery)
    )
  }, [categories])

  const getActiveCategories = useCallback(() => {
    return getCategoriesByStatus('ACTIVE')
  }, [getCategoriesByStatus])

  const getInactiveCategories = useCallback(() => {
    return getCategoriesByStatus('INACTIVE')
  }, [getCategoriesByStatus])

  return useMemo(() => ({
    getCategoryById,
    getCategoriesByStatus,
    searchCategories,
    getActiveCategories,
    getInactiveCategories
  }), [
    getCategoryById,
    getCategoriesByStatus,
    searchCategories,
    getActiveCategories,
    getInactiveCategories
  ])
}

// Combined hook for convenience
export const useCategories = () => {
  const dispatch = useAppDispatch()
  const selectors = useCategorySelectors()
  const utilities = useCategoryUtilities()

  // Memoize the actions to prevent re-creation on every render
  const actions = useMemo(() => ({
    fetchCategories: (params?: Parameters<typeof fetchCategories>[0]) => dispatch(fetchCategories(params)),
    setActiveCategory: (category: Category | null) => dispatch(setActiveCategory(category)),
    setError: (error: string | null) => dispatch(setError(error)),
    clearError: () => dispatch(clearError()),
    addCategoryOptimistic: (category: NewCategory) => dispatch(addCategoryOptimistic(category)),
    updateCategoryOptimistic: (data: { id: string; updates: Partial<Category> }) => dispatch(updateCategoryOptimistic(data)),
    removeCategoryOptimistic: (id: string) => dispatch(removeCategoryOptimistic(id)),
    clearStore: () => dispatch(clearStore())
  }), [dispatch])

  return useMemo(() => ({
    ...selectors,
    ...utilities,
    actions
  }), [selectors, utilities, actions])
}

export default categorySlice.reducer