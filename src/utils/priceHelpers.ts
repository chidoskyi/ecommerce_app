import { CartItem } from "@/types/carts";
import { CheckoutItem } from "@/types/checkout";
import { UnitPrice } from "@/types/products";

// Update the function to accept a more generic type
export const getItemPrice = (item: CartItem | CheckoutItem): number => {
  if (item.fixedPrice !== null && item.fixedPrice !== undefined) {
    return item.fixedPrice;
  }
  
  // Handle unitPrice - check if it's a number or UnitPrice object
  if (item.unitPrice !== null && item.unitPrice !== undefined) {
    if (typeof item.unitPrice === 'number') {
      return item.unitPrice;
    } else if (typeof item.unitPrice === 'object' && 'price' in item.unitPrice) {
      return (item.unitPrice as UnitPrice).price;
    }
  }
  
  if (item.selectedUnit && typeof item.selectedUnit === 'object' && 'price' in item.selectedUnit) {
    return (item.selectedUnit as UnitPrice).price;
  }
  
  if (item.product?.fixedPrice) {
    return item.product.fixedPrice;
  }
  
  return 0;
};

// Helper function to get unit display text
export const getUnitDisplay = (item: CartItem) => {
  if (item.selectedUnit && typeof item.selectedUnit === 'object' && 'unit' in item.selectedUnit) {
    return ` (${(item.selectedUnit as UnitPrice).unit})`;
  }
  if (item.selectedUnit && typeof item.selectedUnit === 'string') {
    return ` (${item.selectedUnit})`;
  }
  return "";
};