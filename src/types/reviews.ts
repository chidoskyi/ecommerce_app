import { Product } from "./products"
import { User } from "./users"

 
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
  

export interface Review {
    id: string;
    userId: string
    productId: string
    rating: number;
    title?: string;
    content?: string
    images: string[];
    status: ReviewStatus
    count: number;
    isVerified: boolean
    helpfulCount: number;
    user?: User | null;
    date: string;
    product: Product
    author?: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ReviewsTableProps {
    reviews: Review[];
    loading: boolean;
    error: string | null;
    onRefresh: () => void;
  }
  
  export interface ReviewFormData {
    productId: string
    rating: number
    title?: string
    content?: string
    author?: string
    images?: string[]
  }
  
  export interface ReviewUpdateData {
    rating?: number
    title?: string
    content?: string
    images?: string[]
  }
  
  export interface AdminReviewUpdateData {
    status?: ReviewStatus
    isVerified?: boolean
    action?: 'approve' | 'reject'
  }

  
  export interface PaginationParams {
    page: number
    limit: number
  }
  
  export interface PaginationResponse {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  
  export interface ReviewsResponse {
    reviews: Review[]
    pagination: PaginationResponse
  }
  
  export interface AdminReviewsResponse extends ReviewsResponse {
    statusCounts: Record<ReviewStatus, number>
  }
  
  export interface ApiResponse<T = any> {
    success: boolean
    data?: T
    error?: string
    message?: string
  }

  
  export interface CustomerReviewsProps {
    rating?: number;
    reviewCount?: number;
    reviews?: Review[];
    onWriteReview?: () => void;
  }

  export interface ReviewModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (review: ReviewFormData) => void;
    loading?: boolean;
    error?: string | null;
  }


  // Helpful vote response
export interface HelpfulVoteResponse {
  helpfulCount: number;
  message: string;
}

// Bulk operations
export interface BulkOperationRequest {
  action: "approve" | "reject" | "delete";
  reviewIds: string[];
}

export interface BulkOperationResponse {
  message: string;
  affected: number;
}

// Review statistics
export interface ReviewStatistics {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface StarRatingProps {
  rating: number;
  maxStars?: number;
  starSize?: number;
  activeColor?: string;
  inactiveColor?: string;
  className?: string;
  showNumber: boolean;
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
}


export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface CustomerReviewsProps {
  productId: string;
  initialRating?: number;
  initialReviewCount?: number;
}

export interface ReviewModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (review: ReviewFormData) => void;
  loading?: boolean;
  error?: string | null;
}
  


export interface ReviewFilters {
  productId?: string
  userId?: string
  page: number;
  limit: number;
  search?: string;
  status: ReviewStatus | 'all'
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  statusCounts: {
    [key: string]: number;
  };
}

export interface UpdateReviewPayload {
  id: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  isVerified?: boolean;
  action?: 'approve' | 'reject';
}

export interface BulkReviewPayload {
  action: 'approve' | 'reject' | 'delete';
  reviewIds: string[];
}

export interface AdminReviewState {
  reviews: Review[];
  currentReview: Review | null;
  loading: boolean;
  error: string | null;
  filters: ReviewFilters;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  statusCounts: {
    [key: string]: number;
  };
  actionLoading: {
    updating: string | null;
    deleting: string | null;
    bulkOperation: boolean;
  };
  selectedReviews: string[];
}

export const initialState: AdminReviewState = {
  reviews: [],
  currentReview: null,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 20,
    status: 'PENDING',
  },
  pagination: {
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  },
  statusCounts: {},
  actionLoading: {
    updating: null,
    deleting: null,
    bulkOperation: false,
  },
  selectedReviews: [],
};