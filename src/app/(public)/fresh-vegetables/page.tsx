"use client";

import React, { useState, useEffect } from "react";
import { Pagination } from "@/components/reuse/Pagination";
import ProductCard from "@/components/reuse/ProductCard";
import Container from "@/components/reuse/Container";
import { useProducts } from "@/app/store/slices/productSlice";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FreshVegetablesPage() {
  const {
    products,
    loading: productsLoading,
    error: productsError,
    actions,
  } = useProducts();

  const [sortBy, setSortBy] = useState<
    "featured" | "price-low" | "price-high" | "alphabetically" | "rating"
  >("featured");
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);

  // Fetch new arrival products
  useEffect(() => {
    actions.fetchProducts({
      vegetable: true,
      status: "ACTIVE",
      limit: 50,
      sortBy:
        sortBy === "featured"
          ? "createdAt"
          : sortBy === "alphabetically"
          ? "name"
          : sortBy.startsWith("price")
          ? "fixedPrice"
          : "rating",
      sortOrder: sortBy === "price-high" ? "desc" : "asc",
    });
  }, [actions, sortBy]);

  // Filter for fresh vegetable products (client-side fallback)
  const freshVegetableProducts = products.filter(
    (product) => product.isVegetable && product.status === "ACTIVE"
  );

  // Sort products (client-side fallback)
  const sortedProducts = React.useMemo(() => {
    return [...freshVegetableProducts].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (a.fixedPrice || 0) - (b.fixedPrice || 0);
        case "price-high":
          return (b.fixedPrice || 0) - (a.fixedPrice || 0);
        case "alphabetically":
          return a.name.localeCompare(b.name);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        default: // featured
          return 0;
      }
    });
  }, [freshVegetableProducts, sortBy]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const currentProducts = sortedProducts.slice(startIndex, endIndex);

  const handleSortChange = (sort: string) => {
    setSortBy(sort as any);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetry = () => {
    actions.fetchProducts({
      newArrival: true,
      status: "ACTIVE",
    });
  };

  if (productsLoading && products.length === 0) {
    return (
      <Container className="mx-auto px-4 py-8">
        <div className="flex justify-between items-center p-4 mb-6 shadow-md">
          <h1 className="text-xl text-orange-500 font-semibold">
            New Arrivals
          </h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(productsPerPage)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-64 rounded-lg mb-2"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </Container>
    );
  }

  if (productsError) {
    return (
      <Container className="mx-auto px-4 py-8">
        <div className="flex justify-between items-center p-4 mb-6 shadow-md">
          <h1 className="text-xl text-orange-500 font-semibold">
            New Arrivals
          </h1>
        </div>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{productsError}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </Container>
    );
  }

  if (freshVegetableProducts.length === 0) {
    return (
      <Container className="mx-auto px-4 py-8">
        <div className="flex justify-between items-center p-4 mb-6 shadow-md">
          <h1 className="text-xl text-orange-500 font-semibold">
            Trending Products
          </h1>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">
            No new arrivals available at the moment.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <>
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 mb-6 shadow-md">
  {/* Breadcrumbs - Full width on mobile, auto on desktop */}
  <div className="w-full md:w-auto">
    <h1 className="text-xl md:text-2xl text-orange-600 font-semibold">
      {paths.map((path, index) => {
        const href = `/${paths.slice(0, index + 1).join("/")}`;
        const isLast = index === paths.length - 1;
        const pathName = path.replace(/-/g, " ");

        return (
          <span key={path} className="inline-flex items-center">
            {isLast ? (
              <span className="capitalize">{pathName}</span>
            ) : (
              <Link href={href} className="hover:underline">
                {pathName}
              </Link>
            )}
            {!isLast && <span className="mx-1">/</span>}
          </span>
        );
      })}
      <span className="ml-1">Products</span>
    </h1>
  </div>

  {/* Info and Sort - Full width on mobile, auto on desktop */}
  <div className="w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
    {/* Product count - full width on small mobile, auto otherwise */}
    <span className="text-sm text-gray-500 w-full sm:w-auto">
      Showing {startIndex + 1}-{Math.min(endIndex, sortedProducts.length)} of {sortedProducts.length}
    </span>

    {/* Sort selector - full width on mobile, auto on desktop */}
    <div className="w-full sm:w-auto flex items-center gap-2">
      <span className="text-sm whitespace-nowrap">Sort by:</span>
      <select
        value={sortBy}
        onChange={(e) => handleSortChange(e.target.value)}
        className="w-full sm:w-auto p-2 border rounded-md text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <option value="featured">Featured</option>
        <option value="alphabetically">Alphabetically, A-Z</option>
        <option value="price-low">Price: Low to High</option>
        <option value="price-high">Price: High to Low</option>
        <option value="rating">Rating</option>
      </select>
    </div>
  </div>
</div>
      <Container className="mx-auto px-4 py-8">
        <div className="flex justify-between items-center p-4 mb-6 shadow-md">
          <h1 className="text-xl text-orange-500 font-semibold">
            New Arrivals
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Showing {startIndex + 1}-
              {Math.min(endIndex, sortedProducts.length)} of{" "}
              {sortedProducts.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="p-2 border rounded-md text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="featured">Featured</option>
                <option value="alphabetically">Alphabetically, A-Z</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Rating</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
          {currentProducts.map((product) => (
            <ProductCard 
              {...product}
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.hasFixedPrice ? product.fixedPrice : product.displayPrice}
              images={product.images || ["/placeholder.svg?height=200&width=200"]}
              description={product.description || "No description available."}
              unit={product.unitPrices?.[0]?.unit || "Per Item"}
              category={product.category?.name || "Fruits"}
              rating={product.rating}
            />
          ))}
        </div>

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </Container>
    </>
  );
}
