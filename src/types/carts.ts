import { Product, UnitPrice } from "./products";

export interface CartItem {
  id: string;
  guestId?: string;
  userId: string;
  product: Product;
  fixedPrice?: number;
  selectedUnit?: string;
  unitPrice?: UnitPrice | null;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItemWithProduct extends CartItem {
  product: Product;
  userId: string; 
  unitPrices: UnitPrice;
  selectedUnit: string;
  price: number
  createdAt: Date;
  updatedAt: Date;
}

export interface CartResponse {
  success: boolean;
  data: {
    items: any[];
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
}




