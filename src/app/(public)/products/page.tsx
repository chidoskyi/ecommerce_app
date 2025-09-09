"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/reuse/ProductCard";
import {
  ProductFilters,
  ProductFiltersMobile,
} from "@/components/reuse/ProductFilters";
import Container from "@/components/reuse/Container";
import { Filter, X } from "lucide-react";
import { Pagination } from "@/components/reuse/Pagination";
import {
  useProductSelectors,
  useProducts,
} from "@/app/store/slices/productSlice";
import { FilterParams, Product } from "@/types/products";
import Breadcrumb from "@/components/reuse/Breadcrumb";

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { products, loading, error, pagination } = useProductSelectors();
  const { actions } = useProducts();
  const { fetchProducts, updateFilters } = actions;

  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, boolean>
  >({});
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Build URL parameters from current filters
  const buildUrlParams = useCallback(
    (
      newParams: Record<string, string | number | boolean | undefined | null>
    ) => {
      const urlParams = new URLSearchParams();

      // Add all parameters that have values
      Object.entries(newParams).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          value !== "all"
        ) {
          if (key === "page" && value === 1) return; // Don't add page=1 to URL
          urlParams.set(key, value.toString());
        }
      });

      return urlParams.toString();
    },
    []
  );

  // Update URL without triggering navigation
  const updateUrl = useCallback(
    (params: Record<string, string | number | boolean | undefined | null>) => {
      const urlString = buildUrlParams(params);
      const newUrl = urlString ? `/products?${urlString}` : "/products";
      router.replace(newUrl);
    },
    [router, buildUrlParams]
  );

  // Parse URL parameters and sync with Redux
  const syncUrlParamsWithRedux = useCallback(() => {
    const params = {
      search: searchParams?.get("search") || "",
      category: searchParams?.get("category") || "",
      minPrice: searchParams?.get("minPrice")
        ? parseFloat(searchParams.get("minPrice")!)
        : undefined,
      maxPrice: searchParams?.get("maxPrice")
        ? parseFloat(searchParams.get("maxPrice")!)
        : undefined,
      minRating: searchParams?.get("minRating")
        ? parseFloat(searchParams.get("minRating")!)
        : undefined,
      sortBy: searchParams?.get("sortBy") || "createdAt",
      sortOrder:
        searchParams?.get("sortOrder") === "asc" ||
        searchParams?.get("sortOrder") === "desc"
          ? (searchParams.get("sortOrder") as "asc" | "desc")
          : ("desc" as const),
      page: searchParams?.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams?.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 12,
      status: searchParams?.get("status") || "ACTIVE",

      // Boolean filters
      featured: searchParams?.get("featured") === "true" ? true : undefined,
      fruit: searchParams?.get("fruit") === "true" ? true : undefined,
      vegetable: searchParams?.get("vegetable") === "true" ? true : undefined,
      trending: searchParams?.get("trending") === "true" ? true : undefined,
      bestSelling:
        searchParams?.get("bestSelling") === "true" ? true : undefined,
      dealOfTheDay:
        searchParams?.get("dealOfTheDay") === "true" ? true : undefined,
      newArrival: searchParams?.get("newArrival") === "true" ? true : undefined,
    };

    // Update Redux store and fetch products
    updateFilters(params);
    fetchProducts(params);
  }, [searchParams, updateFilters, fetchProducts]);

  // Initial load and URL param sync
  useEffect(() => {
    syncUrlParamsWithRedux();
  }, [searchParams, syncUrlParamsWithRedux]);

  // Get current values from URL params
  const currentSearch = searchParams?.get("search") || "";
  const currentCategory = searchParams?.get("category") || "";
  const currentSortBy = searchParams?.get("sortBy") || "createdAt";
  const currentSortOrder = searchParams?.get("sortOrder") || "desc";
  const currentPage = parseInt(searchParams?.get("page") || "1");

  // Convert Redux sortBy/sortOrder to UI sort value
  const getSortValue = useCallback(() => {
    if (currentSortBy === "fixedPrice" && currentSortOrder === "asc")
      return "price-low";
    if (currentSortBy === "fixedPrice" && currentSortOrder === "desc")
      return "price-high";
    if (currentSortBy === "name" && currentSortOrder === "asc")
      return "alphabetically";
    if (currentSortBy === "rating" && currentSortOrder === "desc")
      return "rating";
    return "featured";
  }, [currentSortBy, currentSortOrder]);

  // Handle category change
  // const handleCategoryChange = (category: string) => {
  //   const newParams = {
  //     search: currentSearch,
  //     category: category === "all" ? "" : category,
  //     minPrice: searchParams.get("minPrice"),
  //     maxPrice: searchParams.get("maxPrice"),
  //     minRating: searchParams.get("minRating"),
  //     sortBy: currentSortBy,
  //     sortOrder: currentSortOrder,
  //     featured: searchParams.get("featured"),
  //     fruit: searchParams.get("fruit"),
  //     vegetable: searchParams.get("vegetable"),
  //     trending: searchParams.get("trending"),
  //     bestSelling: searchParams.get("bestSelling"),
  //     dealOfTheDay: searchParams.get("dealOfTheDay"),
  //     newArrival: searchParams.get("newArrival"),
  //     page: 1, // Reset to page 1
  //   };
  //   updateUrl(newParams);
  // };

  // Handle sort change
  const handleSortChange = (sort: string) => {
    let sortByField = "createdAt";
    let sortOrder: "asc" | "desc" = "desc";

    switch (sort) {
      case "price-low":
        sortByField = "fixedPrice";
        sortOrder = "asc";
        break;
      case "price-high":
        sortByField = "fixedPrice";
        sortOrder = "desc";
        break;
      case "alphabetically":
        sortByField = "name";
        sortOrder = "asc";
        break;
      case "rating":
        sortByField = "rating";
        sortOrder = "desc";
        break;
      default:
        sortByField = "createdAt";
        sortOrder = "desc";
    }

    const newParams = {
      search: currentSearch,
      category: currentCategory,
      minPrice: searchParams?.get("minPrice"),
      maxPrice: searchParams?.get("maxPrice"),
      minRating: searchParams?.get("minRating"),
      sortBy: sortByField,
      sortOrder: sortOrder,
      featured: searchParams?.get("featured"),
      fruit: searchParams?.get("fruit"),
      vegetable: searchParams?.get("vegetable"),
      trending: searchParams?.get("trending"),
      bestSelling: searchParams?.get("bestSelling"),
      dealOfTheDay: searchParams?.get("dealOfTheDay"),
      newArrival: searchParams?.get("newArrival"),
      page: 1, // Reset to page 1
    };
    updateUrl(newParams);
  };

  // Handle filter change
  const handleFilterChange = (newFilters: Record<string, boolean>) => {
    setSelectedFilters(newFilters);

    // Convert UI filters to URL parameters

    const filterParams: FilterParams = {
      search: currentSearch,
      category: currentCategory,
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      page: 1, // Reset to page 1
    };

    // Map filter checkboxes to URL parameters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        switch (key) {
          case "In stock":
            filterParams.status = "ACTIVE";
            break;
          case "Out of stock":
            filterParams.status = "INACTIVE";
            break;
          case "Featured":
            filterParams.featured = "true";
            break;
          case "Trending":
            filterParams.trending = "true";
            break;
          case "Best Selling":
            filterParams.bestSelling = "true";
            break;
          case "Deal of the Day":
            filterParams.dealOfTheDay = "true";
            break;
          case "New Arrivals":
            filterParams.newArrival = "true";
            break;
          case "Fruits":
            filterParams.fruit = "true";
            break;
          case "Vegetables":
            filterParams.vegetable = "true";
            break;
          default:
            // Category filters
            if (!filterParams.category) {
              filterParams.category = key;
            }
        }
      }
    });

    updateUrl(filterParams);
  };

  // Handle search clear
  const handleClearSearch = () => {
    const newParams = {
      category: currentCategory,
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      featured: searchParams?.get("featured"),
      fruit: searchParams?.get("fruit"),
      vegetable: searchParams?.get("vegetable"),
      trending: searchParams?.get("trending"),
      bestSelling: searchParams?.get("bestSelling"),
      dealOfTheDay: searchParams?.get("dealOfTheDay"),
      newArrival: searchParams?.get("newArrival"),
      page: 1,
    };
    updateUrl(newParams);
  };

  // Handle clear all filters
  const handleClearAllFilters = () => {
    setSelectedFilters({});
    router.replace("/products");
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const newParams = {
      search: currentSearch,
      category: currentCategory,
      minPrice: searchParams?.get("minPrice"),
      maxPrice: searchParams?.get("maxPrice"),
      minRating: searchParams?.get("minRating"),
      sortBy: currentSortBy,
      sortOrder: currentSortOrder,
      featured: searchParams?.get("featured"),
      fruit: searchParams?.get("fruit"),
      vegetable: searchParams?.get("vegetable"),
      trending: searchParams?.get("trending"),
      bestSelling: searchParams?.get("bestSelling"),
      dealOfTheDay: searchParams?.get("dealOfTheDay"),
      newArrival: searchParams?.get("newArrival"),
      page: page,
    };
    updateUrl(newParams);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate display values
  const totalProducts = pagination.total;
  const totalPages = pagination.pages;
  const startIndex = (currentPage - 1) * pagination.limit;
  const endIndex = Math.min(startIndex + pagination.limit, totalProducts);

  // Check if any filters are active
  const hasActiveFilters =
    currentSearch ||
    currentCategory ||
    searchParams?.get("featured") ||
    searchParams?.get("trending") ||
    searchParams?.get("bestSelling") ||
    searchParams?.get("dealOfTheDay") ||
    searchParams?.get("newArrival") ||
    searchParams?.get("fruit") ||
    searchParams?.get("vegetable") ||
    searchParams?.get("minPrice") ||
    searchParams?.get("maxPrice") ||
    searchParams?.get("minRating");

  if (loading && products.length === 0) {
    return (
      <Container className="px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading products...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-red-600">Error: {error}</div>
        </div>
      </Container>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb />

      <Container className="px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">
            {currentSearch ? "Search Results" : "Products"}
          </h1>

          {/* Clear all filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAllFilters}
              className="text-sm text-orange-600 hover:text-orange-700 underline cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Search results banner */}
        {currentSearch && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800">
                Search results for:{" "}
                <span className="font-semibold">
                  &ldquo;{currentSearch}&ldquo;
                </span>
                <span className="ml-2 text-blue-600">
                  ({totalProducts} {totalProducts === 1 ? "result" : "results"}{" "}
                  found)
                </span>
              </p>
              <button
                onClick={handleClearSearch}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <X className="h-4 w-4" />
                Clear search
              </button>
            </div>
          </div>
        )}

        {/* Mobile filter button */}
        <button
          type="button"
          className="lg:hidden flex items-center gap-2 mb-4 p-2 border rounded-md"
          onClick={() => setMobileFiltersOpen(true)}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </button>

        {/* Mobile filters sidebar */}
        <ProductFiltersMobile
          selectedFilters={selectedFilters}
          onFilterChange={handleFilterChange}
          handleClearAllFilters={handleClearAllFilters}
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
        />

        <div className="flex flex-col md:flex-row gap-8 mt-8">
          {/* Desktop filters - hidden on mobile */}
          <div className="hidden lg:block w-64 shrink-0">
            <ProductFilters
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
            />
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <div className="text-sm text-gray-500">
                {totalProducts === 0
                  ? "No products found"
                  : `Showing ${
                      startIndex + 1
                    }-${endIndex} of ${totalProducts} products`}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Sort by:</span>
                <select
                  value={getSortValue()}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="p-2 border rounded-md text-sm cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="alphabetically">Alphabetically, A-Z</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
            </div>

            {/* Products grid or no results message */}
            {products.length === 0 && !loading ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="mx-auto h-16 w-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-500 mb-4">
                  {currentSearch
                    ? `We couldn't find any products matching "${currentSearch}"`
                    : "No products match your current filters"}
                </p>
                <button
                  onClick={handleClearAllFilters}
                  className="text-orange-600 hover:text-orange-800 underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 grid-cols-2 grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
                {products.map((product: Product) => (
                  <ProductCard
                    {...product}
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={
                      product.hasFixedPrice
                        ? product.fixedPrice
                        : product.displayPrice
                    }
                    description={
                      product.description || "No description available."
                    }
                    unit={
                      product.unitPrices && product.unitPrices.length > 0
                        ? product.unitPrices[0].unit
                        : "Per Item"
                    }
                    category={product.category?.name || "Uncategorized"}
                    rating={product.reviews?.[0]?.rating}
                    unitPrices={product.unitPrices ?? undefined}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
