// Product Types
import { Review } from "@/types/reviews";
import { ProductStatus } from "@prisma/client";

export interface UnitPrice {
  unit: string;
  price: number;
}
export interface PriceType {
  Fixed: string;
  Variable: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hasFixedPrice: boolean;
  priceType: PriceType;
  fixedPrice: number;
  price?: number;
  unitPrices: UnitPrice[] | null;
  sku: string;
  quantity: number;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  status: ProductStatus;
  isFeatured: boolean;
  isFruit?: boolean;
  isVegetable?: boolean;
  isTrending: boolean;
  isDealOfTheDay: boolean;
  isBestSelling: boolean;
  isNewArrival: boolean;
  rating: number | null;
  averageRating?: number;
  reviewCount?: number;
  reviews: Review[];
  displayPrice?: number;
  priceRange?: {
    min: number;
    max: number;
  } | null;
  images: string[];
  weight: string | null;
  createdAt: Date;
  updatedAt: Date;
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

export interface ProductCardProps {
  id?: string;
  name: string;
  hasFixedPrice: boolean;
  fixedPrice: number;
  slug: string;
  unitPrices?: UnitPrice[];
  images?: string[];
  rating?: number;
  viewMode: "grid" | "list";
  onRemove: () => void;
  isRemoving: boolean;
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
}

export interface ProductOption {
  id: string;
  weight: string;
  price: number;
  image: string;
  unitPrice: UnitPrice;
  fixedPrice: number;
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