import { DisplayUser } from ".";

export interface User {
  id: string;
  name: string;
  email: string;
  fullName: string;
  username: string;
  primaryEmailAddress: string;
  emailAddresses: string;
  password: string;
  initial?: string
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface NewUser {
  email: string;
  password: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  // phone: string | null;
  // id: string;
  // status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  // fullName: string;
  // username: string;
  // emailAddresses: string;
  // firstName: string | null;
  // lastName: string | null;
  // avatar: string | null;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatar: string | null;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  dateOfBirth: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface  UserActionsProps{
  onStatusChange: () => void;
  onDelete: () => void;
  onEdit: () => void;
  user: User | null;
}
export interface  UserTableProps{
  onStatusChange: () => void;
  onDelete: () => void;
  onEdit: () => void;
  users: User | null;
  loading: (show: boolean) => void
}

export interface UserTableComponentProps extends UserTableProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}
export interface UserDropdownProps {
  isSignedIn: boolean;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  handleSignIn: () => void;
  handleLogout: () => void;
  user?: DisplayUser | null;
}

// Define the user state interface
export interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}


export interface DateRangeFilter {
    gte?: Date;
    lte?: Date;
  }




export interface UserFilters {
  status?: UserStatus;
  role?: UserRole;
  emailVerified?: boolean;
  createdAt?: DateRangeFilter;
  lastLoginAt?: DateRangeFilter;
  search?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  [key: string]: string | number | boolean | object | undefined;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: UserFilters;
  fields?: string[];
  excludeFields?: string[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SortingInfo {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface UsersResponse {
  users: User[];
  pagination: PaginationInfo;
  sorting: SortingInfo;
  filters: UserFilters | null;
}

export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'

export interface AdminUsersState {
  users: User[];
  selectedUser: User | null;
  currentQuery: UserQueryParams;
  pagination: PaginationInfo;
  sorting: SortingInfo;
  activeFilters: UserFilters;
  
  // Loading states
  loading: boolean;
  loadingUser: boolean;
  updating: boolean;
  deleting: boolean;
  
  // Error states
  error: string | null;
  userError: string | null;
  updateError: string | null;
  deleteError: string | null;
  
  // UI states
  selectedUserIds: string[];
  searchTerm: string;
  
  // Cache
  lastFetch: number | null;
  cache: Record<string, UsersResponse>;
}

export const initialState: AdminUsersState = {
  users: [],
  selectedUser: null,
  currentQuery: {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    filters: {},
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  },
  sorting: {
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  activeFilters: {},
  
  loading: false,
  loadingUser: false,
  updating: false,
  deleting: false,
  
  error: null,
  userError: null,
  updateError: null,
  deleteError: null,
  
  selectedUserIds: [],
  searchTerm: '',
  
  lastFetch: null,
  cache: {},
};

