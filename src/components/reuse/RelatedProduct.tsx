"use client";

import Link from "next/link";
import ProductCard from "@/components/reuse/ProductCard";
import Container from "./Container";
import { useProducts } from "@/app/store/slices/productSlice";
import { Product } from "@/types/products";

export interface RelatedProductsProps {
  currentProductId: string | number;
  currentProductCategory: string | number | { id: string | number; name: string };
  maxProducts?: number;
  title?: string;
  showViewAll?: boolean;
}

export const RelatedProducts = ({
  currentProductId,
  currentProductCategory,
  maxProducts = 5,
  title = "You might also like",
  showViewAll = false,
}: RelatedProductsProps) => {
  const { products } = useProducts();

  // Helper function to get category ID from different formats
  const getCategoryId = () => {
    if (typeof currentProductCategory === 'object' && currentProductCategory?.id) {
      return currentProductCategory.id;
    }
    return currentProductCategory;
  };

  // Helper function to get category name for display
  const getCategoryName = () => {
    if (typeof currentProductCategory === 'object' && currentProductCategory?.name) {
      return currentProductCategory.name;
    }
    
    // Try to find category name from products
    const currentProduct = products.find(p => p.id === currentProductId);
    if (currentProduct?.category?.name) {
      return currentProduct.category.name;
    }
    
    return "Related Products";
  };

  // Get related products by filtering from the Redux store
  const getRelatedProducts = (): Product[] => {
    const categoryId = getCategoryId();
    
    return products
      .filter((product) => {
        // Handle different category ID formats
        const productCategoryId = typeof product.categoryId === 'object' 
          ? product.categoryId?.id 
          : product.categoryId;
        
        const productCategoryName = typeof product.categoryId === 'object'
          ? product.categoryId?.name
          : product.category?.name;

        // Match by category ID or name, and exclude current product
        const categoryMatch = productCategoryId === categoryId || 
                             productCategoryName === currentProductCategory ||
                             product.category?.id === categoryId;
        
        const notCurrentProduct = product.id !== currentProductId;
        
        return categoryMatch && notCurrentProduct;
      })
      .slice(0, maxProducts);
  };

  const relatedProducts = getRelatedProducts();

  // If no related products found, try to get products from the same category using utility
  const fallbackProducts = relatedProducts.length === 0 
    ? products
        .filter(p => p.id !== currentProductId)
        .slice(0, maxProducts)
    : relatedProducts;

  if (fallbackProducts.length === 0) return null;

  return (
    <Container className="mt-8">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">{title}</h2>
        {showViewAll && (
          <Link 
            href={`/category/${getCategoryId()}`}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium"
          >
            View All
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {fallbackProducts.map((product) => {
          // Get proper product pricing
          // const productPrice = product.hasFixedPrice && product.fixedPrice > 0
          //   ? product.fixedPrice
          //   : product.displayPrice || 
          //     (product.unitPrices?.[0]?.price) || 
          //     0;

          return (
            <ProductCard 
              { ...product }
              key={product.id}
              id={product.id}
              name={product.name}
              hasFixedPrice={product.hasFixedPrice}
              fixedPrice={product.fixedPrice}
              slug={product.slug || ''}
              unitPrice={product.unitPrices?.[0] || { unit: '', price: 0 }}
              images={product.images?.[0] || product.images || "/placeholder.svg"}
              category={typeof product.categoryId === 'object' 
                ? product.categoryId?.name 
                : product.category?.name || "General"}
              rating={product.rating || product.averageRating || 0}
            />
          );
        })}
      </div>

      {/* Show category info if available */}
      {relatedProducts.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            More products from <span className="font-medium">{getCategoryName()}</span>
          </p>
        </div>
      )}
    </Container>
  );
};