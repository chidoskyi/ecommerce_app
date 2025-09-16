"use client";

import Link from "next/link";
import ProductCard from "@/components/reuse/ProductCard";
import Container from "./Container";
import { useProducts } from "@/app/store/slices/productSlice";
import { Product } from "@/types/products";

export interface RelatedProductsProps {
  currentProductId: string;
  currentProductCategory: string | { id: string; name: string };
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
  const getCategoryId = (): string => {
    if (typeof currentProductCategory === 'object' && currentProductCategory?.id) {
      return currentProductCategory.id;
    }
    return currentProductCategory as string;
  };

  // Helper function to get category name for display
  const getCategoryName = (): string => {
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
      .filter((product: Product) => {
        // Since categoryId is string | null, we don't need object checks
        const productCategoryId = product.categoryId;
        const productCategory = product.category;
        
        // Match by category ID or category object ID, and exclude current product
        const categoryMatch = productCategoryId === categoryId || 
                             productCategory?.id === categoryId;
        
        const notCurrentProduct = product.id !== currentProductId;
        
        return categoryMatch && notCurrentProduct;
      })
      .slice(0, maxProducts);
  };

  const relatedProducts = getRelatedProducts();

  // If no related products found, try to get any products
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
        {fallbackProducts.map((product) => (
          <ProductCard 
          key={product.id}
          id={product.id}
          name={product.name}
          slug={product.slug || ''}
          price={product.hasFixedPrice ? product.fixedPrice : product.displayPrice}
          images={product.images || ["/placeholder.svg?height=200&width=200"]}
          description={product.description || "No description available."}
          unit={product.unitPrices?.[0]?.unit || "Per Item"}
          category={product.category?.name || "Uncategorized"}
          rating={product.reviews?.[0].rating}
        />
        ))}
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