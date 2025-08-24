import { User, Product, Order, CartItem, WishlistItem, Review, Address, Category, ProductVariant, OrderItem, RefreshToken, Checkout, CheckoutItem, Coupon } from '@prisma/client'
 
export type UserRole = 'USER' | 'ADMIN' | 'MODERATOR'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BANNED'

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'UNPAID'
export type AddressType = 'SHIPPING' | 'BILLING'
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type CheckoutStatus = 'PENDING' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED'
export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT'
export type CouponStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED'

export interface UserWithoutPassword extends Omit<User, 'password'> {}

export interface ProductWithDetails extends Product {
  category: Category
  variants: ProductVariant[]
  reviews?: Review[]
  averageRating?: number
  reviewCount?: number
}

export interface OrderWithItems extends Order {
  items: (OrderItem & {
    product: Product
    variant?: ProductVariant | null
  })[]
  user?: UserWithoutPassword
}

export interface CartItemWithDetails extends CartItem {
  product: ProductWithDetails
  variant?: ProductVariant | null
}

export interface WishlistItemWithDetails extends WishlistItem {
  product: ProductWithDetails
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginationData {
  page: number
  limit: number
  total: number
  pages: number
}

export interface ApiResponseWithPagination<T = any> extends ApiResponse<T> {
  data: T & {
    pagination: PaginationData
  }
}

export interface JWTPayload {
  userId: string
  iat?: number
  exp?: number
}

export interface RegisterData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
}

export interface LoginData {
  email: string
  password: string
}


export interface CreateOrderData {
  items: {
    productId: string
    variantId?: string
    quantity: number
  }[]
  shippingAddress: {
    firstName: string
    lastName: string
    company?: string
    address1: string
    address2?: string
    city: string
    province: string
    country: string
    zip: string
    phone?: string
  }
  paymentMethod: string
}
