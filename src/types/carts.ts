
import { Product, UnitPrice } from "./products";

export interface CartItem {
  id: string;
  guestId?: string | null;
  userId?: string | null;
  product: Product;
  fixedPrice?: number;
  selectedUnit?: UnitPrice | null;
  unitPrice?: UnitPrice | null;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemWithProduct extends CartItem {
  product: Product;
  userId: string; 
  slug?: string; 
  unitPrices: UnitPrice;
  selectedUnit?: UnitPrice;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}


// Create a separate interface for local cart operations (doesn't extend CartItem)
export interface LocalCartItem {
  id: string;
  guestId?: string | null;
  userId?: string | null;
  product: AddToCartProduct; // Use minimal product interface
  fixedPrice?: number;
  selectedUnit?: UnitPrice;
  unitPrice?: UnitPrice | null;
  productId: string;
  quantity: number;
  unitPrices: UnitPrice; // Additional properties for local cart
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddToCartProduct {
  id: string; // Required
  name: string; // Required
  guestId?: string | null;
  hasFixedPrice: boolean; // Required
  slug: string; // Required
  // priceType: PriceType; // Required
  fixedPrice?: number; // Optional - can be undefined
  unitPrices?: UnitPrice[]; // Optional - can be undefined/null
  images?: string[]; // Optional - can be undefined
  rating?: number; // Optional - can be undefined
}

// If you need the extended version, create it separately
export interface ExtendedLocalCartItem extends LocalCartItem {
  userId: string; // Make required
  slug?: string;
}

export interface CartResponse {
  success: boolean;
  data: {
    items: CartItem[];
    subtotal: number;
    itemCount: number;
    isAuthenticated: boolean;
    userId?: string | null;
    guestId?: string | null;
  };
  message?: string;
}

export interface NewCartItem {
  id: string;
  guestId?: string;
  userId: string;
  product: Product;
  selectedUnit?: string;
  fixedPrice: number;
  unitPrice: UnitPrice;
  productId: string;
  quantity: number;
}

export interface CartButtonProps {
  totalCartItems: number;
  onClick: () => void;
}
export interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  cartItems?: CartItem[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  subtotal?: number;
}






