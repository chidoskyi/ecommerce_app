// store/slices/categorySlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
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
      // if (!response.data) {
      //   throw new Error(`Failed to fetch categories: ${response.statusText}`)
      // }

      return response.data
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch categories')
    }
  }
)

export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData: NewCategory, { rejectWithValue }) => {
    try {
      // FIXED: Proper axios POST syntax
      const response = await axios.post('/api/categories', categoryData, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.data || !response.data.category) {
        throw new Error('Invalid response format')
      }

      return response.data.category
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create category'
      return rejectWithValue(errorMessage)
    }
  }
)

export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async (
    { id, updates }: { id: string; updates: Partial<Category> },
    { rejectWithValue }
  ) => {
    try {
      // FIXED: Proper axios PUT syntax
      const response = await axios.put(`/api/categories/${id}`, updates, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.data || !response.data.category) {
        throw new Error('Invalid response format')
      }

      return response.data.category
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update category'
      return rejectWithValue(errorMessage)
    }
  }
)


export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id: string, { rejectWithValue }) => {
    try {
      // FIXED: Proper axios DELETE syntax
      const response = await axios.delete(`/api/categories/${id}`)

      if (!response.data || !response.data.success) {
        throw new Error('Invalid response format')
      }

      return id
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete category'
      return rejectWithValue(errorMessage)
    }
  }
)

// Category slice
const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {
    // Basic actions
    setActiveCategory: (state, action: PayloadAction<Category | null>) => {
      state.activeCategory = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    clearError: (state) => {
      state.error = null
    },
    
    // Optimistic updates
    addCategoryOptimistic: (state, action: PayloadAction<NewCategory>) => {
      const tempCategory = { ...action.payload, id: generateId() }
      state.categories.push(tempCategory)
    },
    
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
    
    // Clear store
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
      })

    // Create category
    builder
      .addCase(createCategory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false
        state.categories.push(action.payload)
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Update category
    builder
      .addCase(updateCategory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false
        const index = state.categories.findIndex(cat => cat.id === action.payload.id)
        if (index !== -1) {
          state.categories[index] = action.payload
        }
        if (state.activeCategory?.id === action.payload.id) {
          state.activeCategory = action.payload
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

    // Delete category
    builder
      .addCase(deleteCategory.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.loading = false
        state.categories = state.categories.filter(cat => cat.id !== action.payload)
        if (state.activeCategory?.id === action.payload) {
          state.activeCategory = null
        }
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
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

// Selectors
export const selectCategories = (state: { categories: CategoryState }) => state.categories.categories
export const selectLoading = (state: { categories: CategoryState }) => state.categories.loading
export const selectError = (state: { categories: CategoryState }) => state.categories.error
export const selectActiveCategory = (state: { categories: CategoryState }) => state.categories.activeCategory
export const selectPagination = (state: { categories: CategoryState }) => state.categories.pagination

// Utility selectors
export const selectCategoryById = (id: string) => (state: { categories: CategoryState }) =>
  state.categories.categories.find(cat => cat.id === id)

export const selectCategoriesByStatus = (status: CategoryStatus) => (state: { categories: CategoryState }) =>
  state.categories.categories.filter(cat => cat.status === status)

export const selectSearchCategories = (query: string) => (state: { categories: CategoryState }) => {
  const categories = state.categories.categories
  if (!query) return categories
  
  return categories.filter(cat =>
    cat.name?.toLowerCase().includes(query.toLowerCase()) ||
    cat.description?.toLowerCase().includes(query.toLowerCase())
  )
}

// Custom hooks for category state and utilities
export const useCategorySelectors = () => {
  const categories = useAppSelector(state => state.categories.categories)
  const loading = useAppSelector(state => state.categories.loading)
  const error = useAppSelector(state => state.categories.error)
  const activeCategory = useAppSelector(state => state.categories.activeCategory)
  const pagination = useAppSelector(state => state.categories.pagination)

  return {
    categories,
    loading,
    error,
    activeCategory,
    pagination
  }
}

// Utility functions for category operations
export const useCategoryUtilities = () => {
  const categories = useAppSelector(state => state.categories.categories)

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
    return categories.filter(cat => cat.status === 'ACTIVE')
  }, [categories])

  const getInactiveCategories = useCallback(() => {
    return categories.filter(cat => cat.status === 'INACTIVE')
  }, [categories])

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

// Combined hook for convenience - FIXED VERSION with memoized actions
export const useCategories = () => {
  const dispatch = useAppDispatch()
  const selectors = useCategorySelectors()
  const utilities = useCategoryUtilities()

  // Memoize the actions to prevent re-creation on every render
  const actions = useMemo(() => ({
    fetchCategories: (params?: Parameters<typeof fetchCategories>[0]) => dispatch(fetchCategories(params)),
    createCategory: (categoryData: NewCategory) => dispatch(createCategory(categoryData)),
    updateCategory: (data: { id: string; updates: Partial<Category> }) => dispatch(updateCategory(data)),
    deleteCategory: (id: string) => dispatch(deleteCategory(id)),
    setActiveCategory: (category: Category | null) => dispatch(setActiveCategory(category)),
    setError: (error: string | null) => dispatch(setError(error)),
    clearError: () => dispatch(clearError()),
    addCategoryOptimistic: (category: NewCategory) => dispatch(addCategoryOptimistic(category)),
    updateCategoryOptimistic: (data: { id: string; updates: Partial<Category> }) => dispatch(updateCategoryOptimistic(data)),
    removeCategoryOptimistic: (id: string) => dispatch(removeCategoryOptimistic(id)),
    clearStore: () => dispatch(clearStore())
  }), [dispatch]) // Only depend on dispatch, which is stable

  return useMemo(() => ({
    ...selectors,
    ...utilities,
    actions
  }), [selectors, utilities, actions])
}

export default categorySlice.reducer