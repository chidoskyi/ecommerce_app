import { CartItem } from "@/types/carts";
import { Product, UnitPrice } from "@/types/products";
import { User } from "@/types/users";

export interface Filters {
  status: string;
  category: string;
  stock: string;
  price: {
    min: string;
    max: string;
  };
}

export interface MetricCardProps {
  title: string
  value: string
  link: string
  href: string
  change: string
  icon?: string
  isPositive: boolean
}

export interface SidebarProps {
  onClose?: () => void;
  onNavigate: (path: string) => void;
  currentPage: string;
  onLogout: () => void;
}

export interface WishList {
  id: string;
  userId: string;
  product: Product;
  unitPrices: UnitPrice;
  fixedPrice: number;
  createdAt: Date;
  dateAdded?: Date;
}

export interface WishlistState {
  items: WishList[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}


export interface SearchBarProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  placeholder: string;
}

export interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isSignedIn?: boolean;
  handleSignIn?: () => void;
  handleLogout?: () => void;
  user?: User;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export interface DesktopHeaderProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  placeholder: string;
  totalCartItems: number;
  wishlistCount: number;
  handleCartOpen: () => void;
  isSignedIn: boolean;
  showDropdown: boolean;
  setShowDropdown: (show: boolean) => void;
  handleSignIn: () => void;
  handleLogout: () => void;
  user?: User;
}

export interface MobileHeaderProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  placeholder: string;
  totalCartItems: number;
  handleCartOpen: () => void;
  onMenuClick: () => void;
}

export interface HeaderProps {
  TopBanner?: React.ComponentType;
  Container?: React.ComponentType<{ children: React.ReactNode }>;
  CartSidebar?: React.ComponentType<{
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onUpdateQuantity: (itemId: string, newQuantity: number) => void;
    onRemoveItem: (itemId: string) => void;
  }>;
}

export interface ProductFiltersProps {
  selectedFilters: Record<string, boolean>;
  onFilterChange: (filters: Record<string, boolean>) => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  // categoryId: string;
  handleClearAllFilters?: () => void;
}

export interface ProductFiltersMobileProps {
  selectedFilters: Record<string, boolean>;
  onFilterChange: (filters: Record<string, boolean>) => void;
  isOpen: boolean;
  onClose: () => void;
  handleClearAllFilters: () => void;
}


export interface WishButtonProps {
  wishlistCount: number;
  href: string;
}



export type Address = {
  id: string;
  userId?: string; // Made optional
  type: "SHIPPING" | "BILLING";
  firstName: string;
  lastName: string;
  address: string;
  state: string;
  city: string;
  country: string;
  zip: string;
  phone?: string | null;
  isDefault: boolean;
  createdAt?: Date; // Made optional
  updatedAt?: Date; // Made optional
};



export interface NewAddress {
  type?: "SHIPPING" | "BILLING";
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  phone?: string | null;
  isDefault?: boolean;
}

export type PaymentMethod = {
  id: number;
  type: string;
  default: boolean;
  last4: string;
  expiry: string;
  name: string;
};

export type WishlistItem = {
  id: number;
  name: string;
  price: string;
  image?: string;
  category?: string;
  product: Product;
};

// Account Component
export type AccountProps = {
  user: {
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    memberSince?: string;
  };
};

// Order Types

export interface ShippingInfo {
  address: string;
  method: string;
  cost: number;
}

export interface PaymentInfo {
  method: string;
  cardLast4?: string;
  email?: string;
  status: "paid" | "pending" | "refunded" | "failed";
}

export interface DateRange {
  from?: Date | null;
  to?: Date | null;
}

export interface Refund {
  id: string
  orderNumber: string
  amount: number
  method: 'paystack' | 'bank_transfer' | 'opay'
  processedAt: Date
  reason?: string
}

export interface SecurityData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  orderUpdates: boolean;
  newCustomers: boolean;
  productUpdates: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  minimumAmount: number | null;
  maximumAmount: number | null;
  usageLimit: number | null;
  usageCount: number;
  userLimit: number | null;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  startsAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCoupon {
  userId: string;
  couponId: string;
  uses: number;
  user?: User;
  coupon?: Coupon;
}

export interface ContactFormData {
  fullName: string;
  email: string;
  subject: string;
  message: string;
}

// Interface for API response
export interface ApiResponse {
  success: boolean;
  message: string;
  data?: unknown;
}