import { CategoryStatus } from '@prisma/client'

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null; // For existing categories, image is always a URL string or null
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
  productsCount: number;
}

// Updated NewCategory to allow File objects for image uploads
export interface NewCategory {
  name: string;
  slug?: string;
  description?: string | null;
  image: string | File | null; // Allow string (URL), File (for uploads), or null
  status?: CategoryStatus;
}

export interface CategoryFormProps {
  category?: Category
  isOpen: boolean
  onClose: () => void
  onSubmit: (category: NewCategory | Category) => void
  mode: 'add' | 'edit'
}

// export interface CategoryTableProps {
//   categories: Category[];
//   loading: boolean;
//   searchQuery: string;
//   sortConfig: { key: string; direction: string };
//   onSort: (key: string) => void;
//   onEdit: (category: Category) => void;
//   onDelete: (id: string) => void;
//   onStatusChange: (id: string, active: boolean) => void;
//   // Add pagination props
//   currentPage: number;
//   totalPages: number;
//   onPageChange: (page: number) => void;
// }

export interface CategoryTableProps {
  categories: Category[];
  loading: boolean;
  searchQuery: string;
  sortConfig: { key: string; direction: string };
  onSort: (key: keyof Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onStatusChange: (categoryId: string, newStatus: boolean) => void;
  // Add pagination props
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface CategoryPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

  export interface SortConfig {
    key: keyof Category;
    direction: 'asc' | 'desc';
  }

  // Types
  export interface CategoryState {
    categories: Category[]
    loading: boolean
    error: string | null
    activeCategory: Category | null
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }

  export interface CategoryFilters {
    page: number;
    limit: number;
    search: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    status: CategoryStatus | '';
  }
  
  export interface CategoryPagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
  }
  
  export interface CreateCategoryData {
    name: string;
    description?: string;
    image?: string | null;
    status?: CategoryStatus;
  }
  
  export interface UpdateCategoryData {
    id: string;
    name?: string;
    description?: string;
    image?: string | null;
    status?: CategoryStatus;
    createdAt: string;
    updatedAt: string;
    productsCount: number;
  }
  
  export interface UpdateStatusData {
    id: string;
    status: CategoryStatus;
  }
  
 export interface AdminCategoryState {
    categories: Category[];
    currentCategory: Category | null;
    pagination: CategoryPagination;
    filters: CategoryFilters;
    loading: boolean;
    error: string | null;
    creating: boolean;
    updating: boolean;
    deleting: boolean;
  }
  
  export const initialState: AdminCategoryState = {
    categories: [],
    currentCategory: null,
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      pages: 0,
    },
    filters: {
      page: 1,
      limit: 10,
      search: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: '',
    },
    loading: false,
    error: null,
    creating: false,
    updating: false,
    deleting: false,
  };
  

  export { CategoryStatus } from '@prisma/client'