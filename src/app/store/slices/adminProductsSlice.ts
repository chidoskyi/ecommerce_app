import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '@/lib/api';
import { SkuGenerator } from '@/utils/skuGenerator';
import { AdminProductsState, CreateProductData, DeleteProductResponse, Pagination, Product, ProductFilters, ProductsResponse, UpdateProductData } from '@/types/products';
import { Category } from '@/types/categories';
import { ApiError } from 'next/dist/server/api-utils';

interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

// Alternative response structure (direct data)
interface DirectProductsResponse {
  products: Product[];
  pagination?: Pagination;
  total?: number;
}

// Wrapper response structure (nested data)
interface WrappedProductsResponse {
  data: {
    products: Product[];
    pagination?: Pagination;
    total?: number;
  };
}

// Union type for possible response structures
type ProductsApiResponse = ApiResponse<ProductsResponse | Category> | DirectProductsResponse | WrappedProductsResponse;



// Generate unique SKU from product name
export const generateProductSku = createAsyncThunk<
  string,
  { name: string; categoryId?: string },
  { rejectValue: string }
>(
  'adminProducts/generateProductSku',
  async ({ name, categoryId }, { rejectWithValue, getState }) => {
    try {
      // Validate inputs
      if (!name || name.trim().length < 2) {
        return rejectWithValue('Product name must be at least 2 characters long');
      }

      // Get existing SKUs to avoid duplicates
      const state = getState() as { adminProducts: AdminProductsState };
      const existingSkus = state.adminProducts.products
        .map(p => p.sku)
        .filter(Boolean) as string[];
      
      // Get category name if categoryId provided
      let categoryName = '';
      if (categoryId) {
        try {
          // Validate ObjectID format before making API call
          const objectIdPattern = /^[a-fA-F0-9]{24}$/;
          if (!objectIdPattern.test(categoryId)) {
            console.warn('Invalid ObjectID format for category:', categoryId);
            categoryName = ''; // Skip category fetch
          } else {
            console.log('Fetching category:', categoryId);
            const categoryResponse = await api.get<Category>(`/api/admin/categories/${categoryId}`);
            
            // Since api.get returns AxiosResponse<Category>, the data is in categoryResponse.data
            const categoryData = categoryResponse.data;
            categoryName = categoryData?.name || '';
            console.log('Retrieved category name:', categoryName);
            
            categoryName = categoryData?.name || '';
            console.log('Retrieved category name:', categoryName);
          }
        } catch (error) {
          // Log the specific error for debugging
          console.warn('Failed to fetch category:', {
            categoryId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
          });
          categoryName = ''; // Continue without category
        }
      }
      
      // Generate SKU using the utility
      let sku: string;
      try {
        if (categoryName && categoryName.trim()) {
          console.log('Generating SKU with category:', { name, categoryName });
          sku = SkuGenerator.generateWithCategory(name.trim(), categoryName.trim());
        } else {
          console.log('Generating SKU without category:', { name });
          sku = SkuGenerator.generateFromName(name.trim());
        }
      } catch (skuError) {
        console.error('SKU generation utility failed:', skuError);
        // Fallback SKU generation if utility fails
        const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const prefix = cleanName.substring(0, 3).padEnd(3, 'X');
        sku = `${prefix}000`;
      }
      
      if (!sku) {
        return rejectWithValue('Failed to generate base SKU');
      }
      
      // Extract base pattern and number length
      const basePattern = sku.replace(/0+$/, '');
      const numberMatch = sku.match(/0+$/);
      const numberLength = numberMatch?.[0]?.length || 3;
      
      if (!basePattern) {
        return rejectWithValue('Invalid SKU pattern generated');
      }
      
      // Find existing numbers for this pattern
      const existingNumbers = existingSkus
        .filter(existingSku => existingSku && existingSku.startsWith(basePattern))
        .map(existingSku => {
          const match = existingSku.match(/(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num) && num > 0); // Only valid positive numbers

      // Find the next available number
      let nextNumber = 1;
      if (existingNumbers.length > 0) {
        const maxNumber = Math.max(...existingNumbers);
        nextNumber = maxNumber + 1;
        
        // Double-check for gaps in sequence (optional - for cleaner numbering)
        for (let i = 1; i <= maxNumber; i++) {
          if (!existingNumbers.includes(i)) {
            nextNumber = i;
            break;
          }
        }
      }
      
      // Format the final SKU
      const formattedNumber = nextNumber.toString().padStart(numberLength, '0');
      const finalSku = basePattern + formattedNumber;
      
      // Final validation
      if (existingSkus.includes(finalSku)) {
        console.error('Generated SKU already exists, retrying...', finalSku);
        // Try with next number
        const retryNumber = (nextNumber + 1).toString().padStart(numberLength, '0');
        const retrySku = basePattern + retryNumber;
        
        if (existingSkus.includes(retrySku)) {
          return rejectWithValue('Unable to generate unique SKU after retry');
        }
        
        return retrySku;
      }
      
      console.log('Generated SKU:', {
        name,
        categoryName,
        basePattern,
        nextNumber,
        finalSku,
        existingCount: existingSkus.length
      });
      
      return finalSku;
      
    } catch (error) {
      // Enhanced error logging
      console.error('SKU generation failed:', {
        name,
        categoryId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return rejectWithValue(
        error instanceof Error ? 
          `Failed to generate SKU: ${error.message}` : 
          'Failed to generate SKU due to unknown error'
      );
    }
  }
);



export const fetchCategories = createAsyncThunk<
  Category[],
  void,
  { rejectValue: string }
>(
  'adminProducts/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[FETCH_CATEGORIES] Starting fetch...');
      const response = await api.get<Category[] | { categories: Category[] }>('/api/admin/categories');
      console.log('[FETCH_CATEGORIES] Raw API response:', response);
      
      // Extract data from axios response
      const responseData = response.data;
      console.log('[FETCH_CATEGORIES] Response data:', responseData);
      
      // Extract the categories array from the response
      let categories: Category[] = [];
      
      if (responseData) {
        if (Array.isArray(responseData)) {
          // Direct array response
          categories = responseData;
        } else if (typeof responseData === 'object' && 'categories' in responseData && Array.isArray(responseData.categories)) {
          // Wrapped response with categories property
          categories = responseData.categories;
        }
      }
      
      console.log('[FETCH_CATEGORIES] Extracted categories:', categories);
      console.log('[FETCH_CATEGORIES] Categories count:', categories.length);
      
      if (categories.length > 0) {
        console.log('[FETCH_CATEGORIES] First category sample:', categories[0]);
      }
      
      return categories;
      
    } catch (error) {
      console.error('[FETCH_CATEGORIES] Error:', error);
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('Failed to fetch categories');
    }
  }
);


// Fetch products with filters and pagination
export const fetchProducts = createAsyncThunk<
  ProductsResponse,
  Partial<ProductFilters>,
  { rejectValue: string }
>(
  'adminProducts/fetchProducts',
  async (params = {}, { rejectWithValue }) => {
    console.log('🔍 [FETCH_PRODUCTS] Starting fetch with params:', params);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Add all possible query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });

      const url = `/api/admin/products?${queryParams.toString()}`;
      const response = await api.get<ProductsResponse>(url) as ProductsApiResponse;

      // Type-safe response handling
      let data: ProductsResponse;

      // Check if response has a nested data property (axios-style response)
      if ('data' in response && response.data && typeof response.data === 'object') {
        // Handle wrapped response structure
        const wrappedData = response.data as DirectProductsResponse;
        data = {
          products: wrappedData.products || [],
          pagination: wrappedData.pagination || {
            count: wrappedData.products?.length || 0,
            total: wrappedData.total || wrappedData.products?.length || 0,
            page: parseInt(params.page?.toString() || '1'),
            limit: parseInt(params.limit?.toString() || '10'),
            pages: Math.ceil((wrappedData.total || wrappedData.products?.length || 0) / parseInt(params.limit?.toString() || '10')),
          },
          total: wrappedData.total,
          success: true
        };
      } else {
        // Handle direct response structure
        const directData = response as DirectProductsResponse;
        data = {
          products: directData.products || [],
          pagination: directData.pagination || {
            count: directData.products?.length || 0,
            total: directData.total || directData.products?.length || 0,
            page: parseInt(params.page?.toString() || '1'),
            limit: parseInt(params.limit?.toString() || '10'),
            pages: Math.ceil((directData.total || directData.products?.length || 0) / parseInt(params.limit?.toString() || '10')),
          },
          total: directData.total,
          success: true
        };
      }

      const result: ProductsResponse = {
        products: data.products || [],
        pagination: data.pagination || {
          count: data.products?.length || 0,
          total: data.total || data.products?.length || 0,
          page: parseInt(params.page?.toString() || '1'),
          limit: parseInt(params.limit?.toString() || '10'),
          pages: Math.ceil((data.total || data.products?.length || 0) / parseInt(params.limit?.toString() || '10')),
        },
        success: true
      };

      return result;

    } catch (error) {
      console.error('❌ [FETCH_PRODUCTS] Error stack:', error instanceof Error ? error.stack : 'No stack');
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch products');
    }
  }
);

// Create a new product
export const createProduct = createAsyncThunk<
  Product,
  CreateProductData,
  { rejectValue: string }
>(
  'adminProducts/createProduct',
  async (productData, { rejectWithValue }) => {
    console.log("🚀 Frontend: createProduct thunk called");
    console.log("📊 Frontend: Product data received:", productData);

    try {
      // FIXED: Always use JSON for product creation, handle files separately
      console.log("📋 Frontend: Using JSON approach for product creation...");
      
      // Separate existing URLs from new files
      const existingImageUrls: string[] = []; // Add explicit type annotation
      const newFiles: File[] = []; // Add explicit type annotation
      
      if (productData.images) {
        productData.images.forEach(image => {
          if (image instanceof File) {
            // Direct File object
            newFiles.push(image);
          } else if (typeof image === 'object' && image !== null && 'file' in image && image.file instanceof File) {
            // ImageWithFile type
            newFiles.push(image.file);
          } else if (typeof image === 'string') {
            // Direct URL string
            existingImageUrls.push(image);
          } else if (typeof image === 'object' && image !== null && 'url' in image && typeof image.url === 'string') {
            // CloudImage type
            existingImageUrls.push(image.url);
          }
        });
      }

      console.log(`📊 Separated: ${existingImageUrls.length} existing URLs, ${newFiles.length} new files`);

      // Create product with existing image URLs only
      const processedData = {
        ...productData,
        images: existingImageUrls // Only include existing URLs
      };

      console.log("💾 Creating product with processed data:", {
        ...processedData,
        images: `Array(${processedData.images?.length || 0})`
      });

      const response = await api.post<Product>('/api/admin/products', processedData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      });

      const createdProduct = response.data;
      console.log("✅ Product created successfully:", createdProduct.id);

      // FIXED: If there are new files, upload them separately
      if (newFiles.length > 0) {
        console.log(`📤 Now uploading ${newFiles.length} new files...`);
        
        try {
          const uploadFormData = new FormData();
          newFiles.forEach(file => {
            uploadFormData.append('images', file);
          });

          const uploadResponse = await api.post(
            `/api/admin/products/${createdProduct.id}/upload`,
            uploadFormData,
            { 
              timeout: 60000,
              headers: {
                // Don't set Content-Type, let browser set it for FormData
              }
            }
          );

          console.log("✅ Images uploaded successfully:", uploadResponse.data);
          
          // Return the updated product with images
          return uploadResponse.data.product;
        } catch (uploadError) {
          console.error("❌ Image upload failed:", uploadError);
          // Product was created but image upload failed
          // Return the created product anyway, user can retry image upload
          return createdProduct;
        }
      }

      return createdProduct;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to create product'
      );
    }
  }
);

export const uploadProductImages = createAsyncThunk<
  { urls: string[]; product: Product },
  { productId: string; files: File[] },
  { rejectValue: string }
>(
  'adminProducts/uploadImages',
  async ({ productId, files }, { rejectWithValue }) => {
    console.log(`🚀 Frontend: uploadProductImages for product ${productId}`);
    console.log(`📁 Frontend: ${files.length} files to upload`);

    try {
      const formData = new FormData();
      
      files.forEach((file, index) => {
        formData.append('images', file);
        console.log(`📤 Added file ${index + 1}: ${file.name} (${file.type}, ${file.size} bytes)`);
      });

      console.log("📋 FormData prepared, making API call...");

      // REMOVE the headers object entirely or at least the Content-Type
      const response = await api.post(
        `/api/admin/products/${productId}/upload`,
        formData,
        { 
          timeout: 60000
          // Let axios/browser handle Content-Type automatically
        }
      );

      console.log("✅ Frontend: Upload successful", response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to upload images'
      );
    }
  }
);

export const deleteProductImage = createAsyncThunk<
  Product,
  { productId: string; imageUrl: string },
  { rejectValue: string }
>(
  'adminProducts/deleteImage',
  async ({ productId, imageUrl }, { rejectWithValue }) => {
    console.log(`🗑️ Frontend: deleteProductImage for product ${productId}`);
    console.log(`🗑️ Frontend: Image URL: ${imageUrl}`);

    try {
      const response = await api.delete(
        `/api/admin/products/${productId}/discard`,
        { 
          data: { imageUrl },
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log("✅ Frontend: Image deleted successfully");
      return response.data.product;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to delete image'
      );
    }
  }
);




// Update an existing product
export const updateProduct = createAsyncThunk<
  Product,
  { id: string; productData: UpdateProductData },
  { rejectValue: string }
>(
  'adminProducts/updateProduct',
  async ({ id, productData }, { rejectWithValue }) => {
    try {
      console.log('🔄 Updating product:', id, productData);

      // Remove any File objects from the data - they should be uploaded separately
      const jsonData = { ...productData };
      
      // Ensure images only contains strings (URLs), not File objects
      if (jsonData.images && Array.isArray(jsonData.images)) {
        jsonData.images = jsonData.images.filter(img => typeof img === 'string');
      }

      const response = await api.put(
        `/api/admin/products/${id}`,
        jsonData,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Product update response:', response.data);
      return response.data.product;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error
          ? error.message
          : error instanceof ApiError
          ? error.message
          : 'Failed to update product'
      );
    }
  }
);

  // Delete a product
  export const deleteProduct = createAsyncThunk<
  { id: string, productData: DeleteProductResponse },
  string,
  { rejectValue: string }
>(
  'adminProducts/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.delete<DeleteProductResponse>(`/api/admin/products/${productId}`);
      
      // Return both ID and response data
      return { 
        id: productId, 
        productData: response.data 
      };
    } catch (error) {
      console.error('Delete product error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete product');
    }
  }
);

// Update product status
export const updateProductStatus = createAsyncThunk<
  Product,
  { id: string; status: 'ACTIVE' | 'INACTIVE' },
  { rejectValue: string }
>(
  'adminProducts/updateProductStatus',
  async ({ id, status }, { rejectWithValue, getState }) => {
    try {
      // Properly type the getState return value
      const state = (getState() as { adminProducts: AdminProductsState }).adminProducts;
      const product = state.products.find(p => p.id === id);
      
      if (!product) {
        return rejectWithValue('Product not found');
      }

      const response = await api.patch<Product>(`/api/admin/products/${id}/status`, { status });
      
      // Handle response properly without using any
      // Axios responses always have data in response.data
      const data: Product = response.data;
      return data;
    } catch (error) {
      console.error('Update product status error:', error);
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update product status');
    }
  }
);

// Initial State
export const initialState: AdminProductsState = {
  products: [],
  categories: [], // Add this
  pagination: {
    count: 0,
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  },
  filters: {
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: 'ACTIVE',
    priceType: 'all',
    featured: '',
    fruit: '',
    vegetable: '',
    trending: '',
    dealOfTheDay: '',
    newArrival: '',
    page: 1,
    limit: 10,
  },
  loading: false,
  error: null,
  selectedProduct: null,
  createLoading: false,
  updateLoading: false,
  deleteLoading: false,
  skuGenerating: false,
  generatedSku: null,
};

// Slice
const adminProductsSlice = createSlice({
  name: 'adminProducts',
  initialState,
  reducers: {
    // Update filters
    updateFilters: (state, action: PayloadAction<Partial<ProductFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    // Clear filters
    clearFilters: (state) => {
      state.filters = {
        ...initialState.filters,
        page: 1, // Reset to first page
      };
    },
    
    // Set selected product
    setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
      state.selectedProduct = action.payload;
    },
    
    // Clear selected product
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    
    // Clear errors
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset state
    // resetState: (state) => {
    //   return initialState;
    // },

    // Update pagination
    updatePagination: (state, action: PayloadAction<Partial<Pagination>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },

    // Set generated SKU
    setGeneratedSku: (state, action: PayloadAction<string | null>) => {
      state.generatedSku = action.payload;
    },

    // Clear generated SKU
    clearGeneratedSku: (state) => {
      state.generatedSku = null;
    },

    // Add product locally (optimistic update)
    addProductOptimistic: (state, action: PayloadAction<Product>) => {
      state.products.unshift(action.payload);
      state.pagination.total += 1;
      state.pagination.count += 1;
    },

    // Remove product locally (optimistic update)
    removeProductOptimistic: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(p => p.id !== action.payload);
      state.pagination.total = Math.max(0, state.pagination.total - 1);
      state.pagination.count = Math.max(0, state.pagination.count - 1);
    },

    // Update product locally (optimistic update)
    updateProductOptimistic: (state, action: PayloadAction<Product>) => {
      const index = state.products.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
      if (state.selectedProduct && state.selectedProduct.id === action.payload.id) {
        state.selectedProduct = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Generate SKU
      .addCase(generateProductSku.pending, (state) => {
        state.skuGenerating = true;
        state.error = null;
      })
      .addCase(generateProductSku.fulfilled, (state, action) => {
        state.skuGenerating = false;
        state.generatedSku = action.payload;
        state.error = null;
      })
      .addCase(generateProductSku.rejected, (state, action) => {
        state.skuGenerating = false;
        state.error = action.payload || 'Failed to generate SKU';
      })
      
      // Fetch Products
      .addCase(fetchProducts.pending, (state) => {
        console.log('[REDUX] fetchProducts.pending - Setting loading to true');
        state.loading = true;
        state.error = null;
      })
// Add this enhanced logging to your fetchProducts.fulfilled case in the Redux slice

.addCase(fetchProducts.fulfilled, (state, action) => {
  state.loading = false;
  state.products = action.payload.products;
  state.pagination = action.payload.pagination;
  state.error = null;
  
  console.log('[REDUX] fetchProducts.fulfilled - State updated:');
  console.log('  - New products count:', state.products.length);
  console.log('  - New pagination:', state.pagination);
})
      .addCase(fetchProducts.rejected, (state, action) => {
        console.error('[REDUX] fetchProducts.rejected - Error:', action.payload);
        state.loading = false;
        state.error = action.payload || 'Failed to fetch products';
      })
      
      // Create Product
      .addCase(createProduct.pending, (state) => {
        state.createLoading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.createLoading = false;
        // Add to beginning of products array
        state.products.unshift(action.payload);
        state.pagination.total += 1;
        state.pagination.count += 1;
        state.error = null;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.createLoading = false;
        state.error = action.payload || 'Failed to create product';
      })
      
      // Update Product
      .addCase(updateProduct.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.updateLoading = false;
        const updatedProduct = action.payload;
        const index = state.products.findIndex(p => p.id === updatedProduct.id);
        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
        if (state.selectedProduct && state.selectedProduct.id === updatedProduct.id) {
          state.selectedProduct = updatedProduct;
        }
        state.error = null;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload || 'Failed to update product';
      })

      // Update Product Status
      .addCase(updateProductStatus.pending, (state) => {
        state.updateLoading = true;
        state.error = null;
      })
      .addCase(updateProductStatus.fulfilled, (state, action) => {
        state.updateLoading = false;
        const updatedProduct = action.payload;
        const index = state.products.findIndex(p => p.id === updatedProduct.id);
        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
        if (state.selectedProduct && state.selectedProduct.id === updatedProduct.id) {
          state.selectedProduct = updatedProduct;
        }
        state.error = null;
      })
      .addCase(updateProductStatus.rejected, (state, action) => {
        state.updateLoading = false;
        state.error = action.payload || 'Failed to update product status';
      })
      
      // Delete Product
      .addCase(deleteProduct.pending, (state) => {
        state.deleteLoading = true;
        state.error = null;
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.deleteLoading = false;
        const { id } = action.payload;
        state.products = state.products.filter(p => p.id !== id);
        state.pagination.total = Math.max(0, state.pagination.total - 1);
        state.pagination.count = Math.max(0, state.pagination.count - 1);
        if (state.selectedProduct && state.selectedProduct.id === id) {
          state.selectedProduct = null;
        }
        state.error = null;
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.deleteLoading = false;
        state.error = action.payload || 'Failed to delete product';
      })

      .addCase(fetchCategories.pending, (state) => {
        console.log('[REDUX] fetchCategories.pending - Setting loading to true');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        console.log('[REDUX] fetchCategories.fulfilled - Payload received:', action.payload);
        state.loading = false;
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        console.error('[REDUX] fetchCategories.rejected - Error:', action.payload);
        state.loading = false;
        state.error = action.payload || 'Failed to fetch categories';
      })

      .addCase(uploadProductImages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadProductImages.fulfilled, (state, action) => {
        state.loading = false;
        // Update the product in your products array
        const productIndex = state.products.findIndex(p => p.id === action.meta.arg.productId);
        if (productIndex !== -1) {
          state.products[productIndex] = action.payload.product;
        }
      })
      .addCase(uploadProductImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Upload failed';
      })
      
      .addCase(deleteProductImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProductImage.fulfilled, (state, action) => {
        state.loading = false;
        // Update the product in your products array
        const productIndex = state.products.findIndex(p => p.id === action.meta.arg.productId);
        if (productIndex !== -1) {
          state.products[productIndex] = action.payload;
        }
      })
      .addCase(deleteProductImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Delete failed';
      });
  },
});

// Export actions
export const {
  updateFilters,
  clearFilters,
  setSelectedProduct,
  clearSelectedProduct,
  clearError,
  // resetState,
  updatePagination,
  setGeneratedSku,
  clearGeneratedSku,
  addProductOptimistic,
  removeProductOptimistic,
  updateProductOptimistic,
} = adminProductsSlice.actions;

// Selectors
export const selectProducts = (state: { adminProducts: AdminProductsState }) => state.adminProducts.products;
export const selectPagination = (state: { adminProducts: AdminProductsState }) => state.adminProducts.pagination;
export const selectFilters = (state: { adminProducts: AdminProductsState }) => state.adminProducts.filters;
export const selectLoading = (state: { adminProducts: AdminProductsState }) => state.adminProducts.loading;
export const selectError = (state: { adminProducts: AdminProductsState }) => state.adminProducts.error;
export const selectSelectedProduct = (state: { adminProducts: AdminProductsState }) => state.adminProducts.selectedProduct;
export const selectCreateLoading = (state: { adminProducts: AdminProductsState }) => state.adminProducts.createLoading;
export const selectUpdateLoading = (state: { adminProducts: AdminProductsState }) => state.adminProducts.updateLoading;
export const selectDeleteLoading = (state: { adminProducts: AdminProductsState }) => state.adminProducts.deleteLoading;
export const selectSkuGenerating = (state: { adminProducts: AdminProductsState }) => state.adminProducts.skuGenerating;
export const selectGeneratedSku = (state: { adminProducts: AdminProductsState }) => state.adminProducts.generatedSku;
export const selectCategories = (state: { adminProducts: AdminProductsState }) => state.adminProducts.categories;

// Derived selectors
export const selectProductsByStatus = (status: string) => (state: { adminProducts: AdminProductsState }) => {
  if (status === 'all') return state.adminProducts.products;
  return state.adminProducts.products.filter(product => product.status.toLowerCase() === status.toLowerCase());
};

export const selectFeaturedProducts = (state: { adminProducts: AdminProductsState }) => 
  state.adminProducts.products.filter(product => product.isFeatured);

export const selectProductStats = (state: { adminProducts: AdminProductsState }) => {
  const products = state.adminProducts.products;
  return {
    total: products.length,
    active: products.filter(p => p.status === 'ACTIVE').length,
    // draft: products.filter(p => p.status === 'DRAFT').length,
    inactive: products.filter(p => p.status === 'INACTIVE').length,
    featured: products.filter(p => p.isFeatured).length,
  };
};

// Export reducer
export default adminProductsSlice.reducer;