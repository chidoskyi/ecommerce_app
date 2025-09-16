import { Address } from "@/types";
import { Order, OrderItem } from "./orders";
import { Product } from "./products";
import { Invoice } from "./invoice";
import { AddressType } from "@prisma/client";
export interface Checkout {
    id: string;
    userId: string;
    sessionId: string | null;
    status: 'PENDING' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED';
    totalAmount: number;
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    currency: string;
    shippingAddress: AddressType | null;
    billingAddress: AddressType | null;
    shippingMethod: string | null;
    paymentMethod: string | null;
    paymentStatus: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    couponId: string | null;
    orderId: string | null;
    expiresAt: Date | null;
    abandonedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: CheckoutItem[];
    coupon?: Coupon | null;
    order?: Order | null;
  }
  

export type CheckoutItem = {
  id: string;
  totalPrice: number | null;
  createdAt: Date;
  updatedAt: Date;
  totalWeight: number | null;
  checkoutId: string;
  productId: string;
  quantity: number;
  fixedPrice?: number | null;
  unitPrice: number | null;
  selectedUnit: string | null;
  title: string;
  weight: number | null;
  price?: number; // Add this
  product: Product; // Add this
}

  export interface CheckoutProps {
    orderItems?: OrderItem[];
    subtotal?: number;
    deliveryFee?: number;
    serviceCharge?: number;
  }
  export interface CreateCheckoutRequest {
    items: Array<{
      productId: string
      quantity: number
    }>
    shippingAddress: Address
    billingAddress?: Address
    shippingMethod?: string
    paymentMethod: 'opay' | 'bank_transfer' | 'paystack' | 'wallet'
    couponId?: string
    subtotal?: number
    discountAmount?: number
    currency?: string
  }

  export interface CheckoutState {
    // Checkout session data
    currentCheckout: Checkout | null
    checkouts: Checkout[]
    
    // Order data
    currentOrder: Order | null
    orders: Order[]

    // Loading data
    isLoading: boolean,
    
    // Invoice data
    currentInvoice: Invoice | null
    
    // Payment data
    paymentUrl: string | null
    paymentReference: string | null
    
    // Delivery info
    deliveryInfo: DeliveryInfo | null
    
    // Loading states
    isCreatingCheckout: boolean
    isFetchingCheckouts: boolean
    isFetchingOrder: boolean
    
    // Error states
    checkoutError: string | null
    orderError: string | null
    
    // UI states
    showInvoice: boolean
    paymentMethod: 'opay' | 'bank_transfer' | 'paystack' |  'wallet' |null
  }

  export interface ReviewStepProps {
    orderItems: OrderItem[];
    subtotal: number;
    deliveryFee: number;
    serviceCharge: number;
    total: number;
    selectedPayment: string;
    onPrevious: () => void;
    onPlaceOrder: () => void;
  }

  export type PaymentMethodType = "opay" | "bank_transfer" | "paystack" | "wallet";

  export interface PaymentStepProps {
    selectedPayment: string;
    walletBalance: number;
    onPaymentSelect: (method: "opay" | "bank_transfer" | "paystack" | "wallet") => void;
    onPrevious?: () => void;
    onReviewOrder?: () => void;
  }

  export interface ShippingStepProps {
    hasExistingAddress: boolean;
    addressForm: Omit<Address, "id">;
    onAddressInputChange: (field: keyof Omit<Address, "id">, value: string) => void;
    onChangeAddress: () => void;
    onAddressFormSubmit?: () => void; 
    onContinueToPayment?: () => void;
    selectedAddress: Address | null;
    isLoading?: boolean;
}

  export interface CheckoutStepperProps {
    currentStep: number;
    steps: string[];
    children?: React.ReactNode;
  }

  export interface CheckoutComponentProps {
    deliveryFee?: number;
  }
  
  export interface BankDetail {
    bankName: string
    accountName: string
    accountNumber: string
    sortCode: string
  }
  
  export interface DeliveryInfo {
    totalWeight: number
    deliveryFee: number
  }

  export interface CheckoutResponse {
    success: boolean
    data: Checkout
    error?: string
  }

  export interface CreateCheckoutResponse extends Checkout{
    success: boolean
    checkout?: Checkout
    order?: Order
    invoice?: Invoice
    paymentUrl?: string
    paymentReference?: string
    deliveryInfo?: DeliveryInfo
    showInvoice?: boolean
    message?: string
  }

  export interface Coupon {
    id: string;
    code: string;
    name: string | null;
    description: string | null;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    minimumAmount: number | null;
    maximumAmount: number | null;
    usageLimit: number | null;
    usageCount: number;
    userLimit: number | null;
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
    startsAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }