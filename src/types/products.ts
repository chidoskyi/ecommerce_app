// Product Types
import { Review } from "@/types/reviews";
import { ProductStatus } from "@prisma/client";
import { Filters } from ".";
import { Category } from "./categories";

export type PriceType = "FIXED" | "VARIABLE";
  export interface UnitPrice {
    unit: string;
    price: number;
  }

  export interface Product {
    id?: string;
    name: string;
    slug: string;
    description: string | null;
    hasFixedPrice: boolean;
    priceType: PriceType;
    fixedPrice?: number;
    unitPrices?: UnitPrice[] | null;
    price?: number;
    sku: string;
    quantity?: number;
    categoryId?: string | null;
    category?: {
      id: string;
      name: string;
      slug: string;
    } | null;
    status: ProductStatus;
    isFeatured: boolean;
    isFruit?: boolean;
    isVegetable?: boolean;
    isTrending?: boolean;
    isDealOfTheDay?: boolean;
    isBestSelling?: boolean;
    isNewArrival?: boolean;
    rating?: number | null;
    averageRating?: number;
    salesCount?: number;
    reviewCount?: number;
    reviews?: Review[];
    imagesToDelete?: string[] | undefined; // Change from [] to string[]
    displayPrice?: number;
    priceRange?: {
      min: number;
      max: number;
    } | null;
    images?: string[];
    newImageFiles?: File[];
    weight?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }

export interface NewProduct {
  name: string;
  slug?: string;
  description?: string | null;
  hasFixedPrice: boolean;
  priceType: string;
  fixedPrice?: number;
  unitPrices?: UnitPrice[] | null;
  sku: string;
  quantity: number;
  categoryId?: string | null;
  status?: string;
  isFeatured?: boolean;
  isFruit?: boolean;
  isVegetable?: boolean;
  isTrending?: boolean;
  isBestSelling?: boolean;
  isDealOfTheDay?: boolean;
  isNewArrival?: boolean;
  images: (File | string)[];
  weight?: string | null;
}

export interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  activeProduct: Product | null;

  // Pagination
  pagination: {
    count: number;
    total: number;
    page: number;
    limit: number;
    pages: number;
  };

  // Filters - aligned with API parameters
  filters: {
    search: string;
    category: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
    featured?: boolean;
    fruit?: boolean;
    vegetable?: boolean;
    trending?: boolean;
    bestSelling?: boolean;
    dealOfTheDay?: boolean;
    newArrival?: boolean;
    status: string;
  };
}


export interface FilterParams {
  search: string;
  category: string | null;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  [key: string]: string | number | boolean | null | undefined;
}



export interface ProductCardProps {
  id?: string;
  name: string;
  hasFixedPrice?: boolean;
  fixedPrice?: number;
  price?: number;
  slug: string;
  unit?: string;
  category: string;
  description: string;
  unitPrices?: UnitPrice[]| null;
  images?: string[];
  rating?: number;
  viewMode?: "grid" | "list";
  onRemove?: () => void;
  isRemoving?: boolean;
}

export interface ProductWithDetails extends Product {
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface ProductImageGalleryProps {
  product: Product;
  options?: ProductOption[];
  thumbnails?: string[];
  previewUrl?: string[];
}

export interface ProductOption {
  id: string;
  weight: string;
  price?: number;
  image: string;
  unitPrice: UnitPrice;
  fixedPrice?: number;
  quantity?: number;
  unit?: string;
  unitType?: string;
}
// API Response types
export interface ProductsResponse {
  success: boolean;
  products: Product[];
  pagination: {
    count: number;
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
}

export interface ProductResponse {
  success: boolean;
  product: Product;
  message?: string;
}


export interface ProductWithReviews extends Product {
  reviews: Review[];
  averageRating: number;
  reviewCount: number;
  ratingDistribution: Record<number, number>;
}

export interface ProductTableProps {
  products: Product[]
  categories: Category[]
  loading: boolean
  selectedProducts: string[]
  sortConfig: { key: string; direction: string }
  currentPage: number
  totalPages: number
  searchQuery: string
  filters: Filters
  onSort: (key: string) => void
  onSelectAll: (checked: boolean, products: Product[]) => void
  onSelectProduct: (id: string) => void
  onEdit: (product: Product) => void
  onView: (product: Product) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
  onPaginate: (page: number) => void
  onResetFilters: () => void
}

// Better interface design with optional properties
export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: ProductStatus;
  priceType?: PriceType | "all";
  price?: string;
  featured?: string;
  fruit?: string;
  vegetable?: string;
  trending?: string;
  dealOfTheDay?: string;
  newArrival?: string;
  page?: number;
  limit?: number;
}

export interface Pagination {
  count: number;
  total: number;
  page: number;
  limit: number;
  pages: number;
}


export interface ProductsResponse {
  success: boolean;
  products: Product[];
  pagination: Pagination;
  total?: number;
}

// Add this interface for cloud images
export interface CloudImage {
  url: string;
  file?: File;
}

// Add this interface for images with file property
export interface ImageWithFile {
  file: File;
}

// Update your existing CreateProductData interface
export interface CreateProductData {
  name: string;
  description: string;
  hasFixedPrice?: boolean;
  priceType?: 'FIXED' | 'VARIABLE';
  fixedPrice?: number | string; // Accept both number and string
  quantity?: number | string; 
  weight?: string | null;
  unitPrices?: UnitPrice[] | null;
  sku?: string;
  categoryId?: string | null;
  images?: (File | string | CloudImage | ImageWithFile)[]; // Updated type
  uploadedImages?: string[];
  slug?: string;
  isFeatured?: boolean;
  isFruit?: boolean;
  isVegetable?: boolean;
  isTrending?: boolean;
  isDealOfTheDay?: boolean;
  isNewArrival?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

export interface UpdateProductData extends Partial<CreateProductData> {
  removeImages?: string[];
  description?: string;
}

export interface DeleteProductResponse {
  success: boolean;
  message: string;
  id: string;
  product: {
    id: string;
    name: string;
    deletedImages: number;
  };
}

export interface AdminProductsState {
  products: Product[];
  categories: Category[]; // Add this
  pagination: Pagination;
  filters: ProductFilters;
  loading: boolean;
  error: string | null;
  selectedProduct: Product | null;
  createLoading: boolean;
  updateLoading: boolean;
  deleteLoading: boolean;
  skuGenerating: boolean;
  generatedSku: string | null;
}

export interface ProductFormProps {
  mode: "add" | "edit";
  product?: Product;
  loading: boolean;
  categories?: Category[];
  onSave?: (product: Product) => void;
  onCancel?: () => void;
  onProductChange?: (product: ProductFormState) => void;
}


// Form types (for UI forms)
export interface UnitPriceForm {
  unit: string;
  price: string;
}

export type ProductFormState = {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  hasFixedPrice: boolean;
  priceType: PriceType;
  fixedPrice: string;
  unitPrices: UnitPriceForm[]; // Use form type
  sku: string;
  quantity: string;
  categoryId: string;
  status: 'ACTIVE' | 'INACTIVE';
  isFeatured: boolean;
  isTrending: boolean;
  isFruit: boolean;
  isVegetable: boolean;
  isDealOfTheDay: boolean;
  isNewArrival: boolean;
  images: (string | ProductImage)[];
  newImageFiles?: File[];
  imagesToDelete?: string[];
  weight?: string;
  createdAt?: string;
};



export interface ProductViewDialogProps {
  product: Product;
  categories: Category[]
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (key: string, value: string) => void;
}

// Helper function to convert Product to ProductFormState
export const productToFormState = (product?: Product): ProductFormState => {
  const baseForm: ProductFormState = {
    id: product?.id || "",
    name: product?.name || "",
    slug: product?.slug,
    description: product?.description || "",
    hasFixedPrice: product?.priceType === "FIXED" ? true : false,
    priceType: product?.priceType || "FIXED",
    fixedPrice: String(product?.fixedPrice ?? "0"),
    unitPrices:
      product?.unitPrices?.map((up) => ({
        unit: up.unit,
        price: String(up.price),
      })) || [],
    sku: product?.sku || "",
    quantity: String(product?.quantity ?? "0"),
    categoryId: product?.categoryId ? String(product.categoryId) : "",
    status: product?.status || "ACTIVE",
    isFeatured: product?.isFeatured ?? false,
    isTrending: product?.isTrending ?? false,
    isFruit: product?.isFruit ?? false, 
    isVegetable: product?.isVegetable ?? false, 
    isDealOfTheDay: product?.isDealOfTheDay ?? false,
    isNewArrival: product?.isNewArrival ?? false,
    images: product?.images || [],
    weight: product?.weight || "",
    createdAt: product?.createdAt
      ? new Date(product.createdAt).toISOString()
      : new Date().toISOString(),
  };

  return baseForm;
};

export interface ProductImage {
  file?: File;
  previewUrl?: string;
  url?: string;
  isNew?: boolean;
}

export function formStateToApiData(formData: ProductFormState): Product {
  console.log("🔧 Converting form state to API data");
  console.log("🔧 Form images:", formData.images);

  const data: Product = {
    name: formData.name,
    description: formData.description ?? null,
    hasFixedPrice: formData.hasFixedPrice,
    priceType: formData.priceType as Product["priceType"],
    sku: formData.sku,
    status: formData.status as Product["status"],
    isFeatured: formData.isFeatured,
    isTrending: formData.isTrending,
    isFruit: formData.isFruit,
    isVegetable: formData.isVegetable,
    isDealOfTheDay: formData.isDealOfTheDay,
    newImageFiles: formData.newImageFiles,
    imagesToDelete: formData.imagesToDelete, 
    isNewArrival: formData.isNewArrival,
    slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    weight: formData.weight,
  };

    // Only include id if it exists (for updates)
    if (formData.id) {
      data.id = formData.id;
    }
  

  // Handle pricing
  if (formData.hasFixedPrice) {
    data.fixedPrice = Number(formData.fixedPrice);
  } else {
    data.unitPrices = formData.unitPrices.map((up) => ({
      unit: up.unit,
      price: Number(up.price),
    }));
  }

  // Add quantity
  if (formData.quantity) {
    data.quantity = Number(formData.quantity);
  }

  // Add category if exists
  // Add category if exists - FIXED: Send as string categoryId
  if (formData.categoryId) {
    data.categoryId = formData.categoryId; // Send as string
    console.log("📋 Added category ID:", data.categoryId);
  }

  if (formData.images && Array.isArray(formData.images)) {
    console.log("🔧 Processing images for API data...");

    const processedImages: string[] = []; // Explicitly type as string array
    const newFiles: File[] = []; // Also type this for consistency

    formData.images.forEach((image) => {
      // Handle different image formats
      if (image instanceof File) {
        // New file to be uploaded
        newFiles.push(image);
      } else if (typeof image === "object" && image !== null && "file" in image && image.file instanceof File) {
        // New file wrapped in object - type guard for object with file property
        newFiles.push(image.file);
      } else if (typeof image === "string" && image.startsWith("http")) {
        // Existing image URL
        processedImages.push(image);
      } else if (typeof image === "object" && image !== null && "url" in image && typeof image.url === "string") {
        // Existing image in object format - type guard for object with url property
        processedImages.push(image.url);
      } else {
        console.log("⚠️ Could not process image:", image);
      }
    });

    // Return URLs for existing images, files will be handled separately
    data.images = (processedImages);
    data.newImageFiles = newFiles;

    console.log("🔧 Final API data:", {
      existingImages: data.images.length,
      newFiles: data.newImageFiles.length,
    });
  } else {
    data.images = [];
    data.newImageFiles = [];
  }

  return data;
}