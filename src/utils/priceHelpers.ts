// Helper function to get the correct price for each item
export const getItemPrice = (item: any) => {
  if (item.fixedPrice !== null && item.fixedPrice !== undefined) {
    return item.fixedPrice;
  }
  if (item.unitPrice !== null && item.unitPrice !== undefined) {
    return item.unitPrice;
  }
  if (item.selectedUnit?.price) {
    return item.selectedUnit.price;
  }
  if (item.product?.fixedPrice) {
    return item.product.fixedPrice;
  }
  return 0;
};

// Helper function to get unit display text
export const getUnitDisplay = (item: any) => {
  if (item.selectedUnit?.unit) {
    return ` (${item.selectedUnit.unit})`;
  }
  if (item.selectedUnit) {
    return ` (${item.selectedUnit})`;
  }
  return "";
};