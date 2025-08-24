import { CategoryStatus } from '@prisma/client'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  image: string
  status: CategoryStatus
  createdAt: Date
  updatedAt: Date
}

export interface NewCategory {
  name: string
  slug: string
  description?: string
  images: string
  status?: CategoryStatus
}

export interface CategoryFormProps {
  category?: Category
  isOpen: boolean
  onClose: () => void
  onSubmit: (category: NewCategory | Category) => void
  mode: 'add' | 'edit'
}

export interface CategoryTableProps {
  categories: Category[];
  loading: boolean;
  searchQuery: string;
  sortConfig: SortConfig;
  onSort: (key: keyof Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onStatusChange: (categoryId: string, newStatus: boolean) => void;
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

  export { CategoryStatus } from '@prisma/client'