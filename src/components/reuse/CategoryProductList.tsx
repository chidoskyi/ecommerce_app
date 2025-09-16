"use client";

import React, { useState, useEffect } from "react";
import { Pagination } from "@/components/reuse/Pagination";
import ProductCard from "./ProductCard";
import Container from "./Container";
import { useProducts } from "@/app/store/slices/productSlice";
import { Category } from "@/types/categories";

interface CategoryProductListProps {
  categorySlug: string;
  category?: Category | null; // Use the specific Category type
}

function CategoryProductList({
  categorySlug,
  category,
}: CategoryProductListProps) {
  const [sortBy, setSortBy] = useState("featured");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true); // Added local loading state
  const productsPerPage = 12;

  // Get products and categories from Redux store
  const {
    products: productsData,
    error: productsError,
    loading: productsLoading,
    actions: productActions,
    // filters: currentFilters
  } = useProducts();

  // Fetch products for this category when component mounts or category changes
  useEffect(() => {
    console.log("=== CategoryProductList useEffect ===");
    console.log("categorySlug:", categorySlug);
    console.log("category:", category);
    console.log("productsData length:", productsData.length);
    console.log("productsLoading:", productsLoading);

    if (categorySlug && category) {
      setIsLoading(true); // Set loading when starting fetch

      const fetchParams = {
        category: category.slug,
        status: "ACTIVE",
        sortBy: "createdAt",
        sortOrder: "desc" as const,
        page: 1,
        limit: 50, // Get more products to handle local filtering
      };

      console.log("Fetching products with params:", fetchParams);

      // Fetch products filtered by category
      productActions
        .fetchProducts(fetchParams)
        .then((result) => {
          console.log("Fetch products result:", result);
          if (result.type.endsWith("/fulfilled")) {
            console.log("Products fetched successfully:", result.payload);
          } else if (result.type.endsWith("/rejected")) {
            console.log("Products fetch failed:", result.payload);
          }
        })
        .catch((error) => {
          console.log("Fetch products promise error:", error);
        })
        .finally(() => {
          setIsLoading(false); // Clear loading when fetch completes
        });
    } else {
      console.log("Not fetching products - missing categorySlug or category");
      console.log("categorySlug exists:", !!categorySlug);
      console.log("category exists:", !!category);
      setIsLoading(false); // Clear loading if no category
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, category, productActions]);

  // Filter products by category (backup filter in case API doesn't filter properly)
  let filteredProducts = [];

  if (category && productsData.length > 0) {
    filteredProducts = productsData.filter((product) => {
      // Check multiple possible ways the category might match
      const slugMatch = product.category?.slug === category.slug;
      const nameMatch = product.category?.name === category.name;
      const idMatch = product.category?.id === category.id;
      const categoryIdMatch = product.categoryId === category.id;

      const finalMatch = slugMatch || nameMatch || idMatch || categoryIdMatch;
      return finalMatch;
    });
  } else {
    filteredProducts = productsData;
  }

  // Sort products
  filteredProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low": {
        // Fix: Add proper fallbacks for undefined values
        const aPrice = a.hasFixedPrice ? (a.fixedPrice || 0) : (a.displayPrice || 0);
        const bPrice = b.hasFixedPrice ? (b.fixedPrice || 0) : (b.displayPrice || 0);
        return aPrice - bPrice;
      }
      case "price-high": {
        // Fix: Add proper fallbacks for undefined values
        const aPrice = a.hasFixedPrice ? (a.fixedPrice || 0) : (a.displayPrice || 0);
        const bPrice = b.hasFixedPrice ? (b.fixedPrice || 0) : (b.displayPrice || 0);
        return bPrice - aPrice;
      }
      case "alphabetically":
        return (a.name || "").localeCompare(b.name || "");
      case "rating":
        return (
          (b.rating || b.averageRating || 0) -
          (a.rating || a.averageRating || 0)
        );
      case "newest":
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      default: // featured
        // Put featured products first, then by creation date
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
    }
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Combined loading state
  const showLoading =
    isLoading || (productsLoading && productsData.length === 0);

  // Loading state
  if (showLoading) {
    return (
      <div className="space-y-6">
        {/* Sort header skeleton */}
        <div className="flex justify-between items-center p-4 mb-6 shadow-md">
          <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-40 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Products count skeleton */}
        <div className="w-full bg-white mx-auto py-5 mb-5">
          <Container className="w-48 h-4 bg-gray-200 rounded animate-pulse"></Container>
        </div>

        {/* Products grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse"
            >
              <div className="w-full h-48 bg-gray-200"></div>
              <div className="p-4 space-y-2">
                <div className="w-full h-4 bg-gray-200 rounded"></div>
                <div className="w-3/4 h-4 bg-gray-200 rounded"></div>
                <div className="w-1/2 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (productsError) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 mb-4 font-medium">
            Failed to load products
          </p>
          <p className="text-red-500 text-sm mb-4">{productsError}</p>
          <button
            onClick={() => {
              if (!category) return; // Add null/undefined check

              setIsLoading(true); // Set loading when retrying
              productActions
                .fetchProducts({
                  category: category.slug || category.name,
                  status: "ACTIVE",
                })
                .finally(() => {
                  setIsLoading(false); // Clear loading when done
                });
            }}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No products state
  if (filteredProducts.length === 0 && !showLoading) {
    return (
      <div className="text-center py-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-gray-600 mb-2">No products found</p>
          <p className="text-gray-500 text-sm">
            {category
              ? `No products available in "${category.name}" category.`
              : "No products match your criteria."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sort and filter header */}
      <div className="flex justify-between items-center p-4 mb-6 bg-white shadow-md rounded-lg">
        {category && (
          <div className="text-lg text-gray-500 font-semibold">
            Showing {startIndex + 1}-
            {Math.min(endIndex, filteredProducts.length)} of{" "}
            {filteredProducts.length} products
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="p-2 border border-gray-300 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest First</option>
            <option value="alphabetically">Alphabetically, A-Z</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
        {currentProducts.map((product) => (
          <ProductCard
            key={product.id}
            {...product}
            name={product.name}
            price={
              product.hasFixedPrice ? product.fixedPrice : product.displayPrice
            }
            description={product.description || "No description available."}
            unit={
              product.unitPrices && product.unitPrices.length > 0
                ? product.unitPrices[0].unit
                : "Per Item"
            }
            category={product.category?.name || "Uncategorized"}
            rating={product.rating || product.averageRating || 0}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </>
  );
}

export default CategoryProductList;
