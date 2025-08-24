"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Trash2,
  Package,
  Heart,
  Search,
  Filter,
  Grid3X3,
  List,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
// import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useCategories } from "@/app/store/slices/categorySlice";
import { CategoryStatus } from "@/types/categories";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchWishlist,
  removeItem,
  toggleItem,
  clearWishlist,
  selectWishlistItems,
  selectWishlistLoading,
  selectWishlistError,
  selectWishlistCount,
  clearError,
} from "@/app/store/slices/wishlistSlice";
import type { AppDispatch } from "@/app/store";
import ProductCard from "@/components/reuse/ProductCard";

type ViewMode = "grid" | "list";
type SortOption = "featured" | "alphabetically" | "price-low" | "price-high";

export default function Wishlist() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    token,
  } = useAuth();

  // Redux state
  const wishlistItems = useSelector(selectWishlistItems);
  const loading = useSelector(selectWishlistLoading);
  const error = useSelector(selectWishlistError);
  const wishlistCount = useSelector(selectWishlistCount);

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Get categories data from Redux store
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  // Filter categories with ACTIVE status
  const categoriesData = useMemo(() => {
    return categories.filter(
      (category) => category.status === CategoryStatus.ACTIVE
    );
  }, [categories]);

  // Fetch wishlist when authenticated and token is available
  const fetchWishlistData = useCallback(async () => {
    if (!isAuthenticated || !token || loading) {
      console.log("⏳ Cannot fetch wishlist:", {
        isAuthenticated,
        hasToken: !!token,
        loading,
      });
      return;
    }

    try {
      console.log("🔄 Fetching wishlist data...");
      await dispatch(fetchWishlist({ page: 1, limit: 10 })).unwrap();
      setHasAttemptedFetch(true);
    } catch (error) {
      console.error("❌ Failed to fetch wishlist:", error);
      setHasAttemptedFetch(true);
    }
  }, [dispatch, isAuthenticated, token, loading]);

  // Effect to fetch wishlist when authentication is ready
  useEffect(() => {
    if (isAuthenticated && token && !hasAttemptedFetch) {
      console.log("✅ Authentication ready, fetching wishlist");
      fetchWishlistData();
    }
  }, [isAuthenticated, token, hasAttemptedFetch, fetchWishlistData]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      if (error) {
        dispatch(clearError());
      }
    };
  }, [error, dispatch]);

  const handleSortChange = useCallback((sortOption: SortOption) => {
    setSortBy(sortOption);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    setSelectedCategory(category);
  }, []);

  const handleRemoveItem = useCallback(
    async (productId: string) => {
      if (!isAuthenticated || !token) {
        console.error("❌ Cannot remove item: not authenticated");
        return;
      }

      try {
        await dispatch(removeItem(productId)).unwrap();
        console.log("✅ Item removed successfully");
      } catch (error) {
        console.error("❌ Failed to remove item:", error);
      }
    },
    [dispatch, isAuthenticated, token]
  );

  const handleClearWishlist = useCallback(async () => {
    if (!isAuthenticated || !token) {
      console.error("❌ Cannot clear wishlist: not authenticated");
      return;
    }

    if (!confirm("Are you sure you want to clear your entire wishlist?")) {
      return;
    }

    try {
      await dispatch(clearWishlist()).unwrap();
      console.log("✅ Wishlist cleared successfully");
    } catch (error) {
      console.error("❌ Failed to clear wishlist:", error);
    }
  }, [dispatch, isAuthenticated, token]);

  const handleRetry = useCallback(() => {
    if (error) {
      dispatch(clearError());
    }
    setHasAttemptedFetch(false);
    fetchWishlistData();
  }, [dispatch, error, fetchWishlistData]);

  // Filter and sort wishlist items
  const filteredWishlist = useMemo(() => {
    return wishlistItems
      .filter((item) => {
        // Search filter
        const matchesSearch = item.product.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

        // Category filter
        const matchesCategory =
          selectedCategory === "All Categories" ||
          item.product.category === selectedCategory;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        // Sorting logic
        switch (sortBy) {
          case "alphabetically":
            return a.product.name.localeCompare(b.product.name);
          case "price-low":
            return (a.product.price || 0) - (b.product.price || 0);
          case "price-high":
            return (b.product.price || 0) - (a.product.price || 0);
          case "featured":
          default:
            return (
              new Date(b.product.createdAt || b.createdAt).getTime() -
              new Date(a.product.createdAt || a.createdAt).getTime()
            );
        }
      });
  }, [wishlistItems, searchQuery, selectedCategory, sortBy]);

  const hasWishlist = wishlistCount > 0;
  const isLoadingInitialData =
    (authLoading || loading) && wishlistItems.length === 0;

  // Authentication loading state
  if (authLoading) {
    return (
      <Card className="border-gray-200 border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <p className="text-muted-foreground">Checking authentication...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Authentication error state
  if (authError) {
    return (
      <Card className="border-gray-200 border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h3 className="text-lg font-medium">Authentication Error</h3>
            <p className="text-muted-foreground">{authError}</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <Card className="border-gray-200 border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <Heart className="h-12 w-12 text-orange-600" />
            <h3 className="text-lg font-medium">Sign In Required</h3>
            <p className="text-muted-foreground">
              Please sign in to view your wishlist
            </p>
            <Button
              onClick={() => {
                const currentUrl = encodeURIComponent(window.location.pathname);
                window.location.href = `/sign-in?redirect_url=${currentUrl}`;
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial loading state (after authentication)
  if (isLoadingInitialData) {
    return (
      <Card className="border-gray-200 border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <p className="text-muted-foreground">Loading your wishlist...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Wishlist error state (after authentication)
  if (error && hasAttemptedFetch && !loading) {
    return (
      <Card className="border-gray-200 border">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-red-500">
              <AlertCircle className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium">Failed to load wishlist</h3>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={() => dispatch(clearError())} variant="ghost">
                Dismiss
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-200 border">
      <CardHeader className="px-4 md:px-6">
        <div className="bg-orange-600 text-white rounded-lg p-4 flex justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Heart className="h-6 w-6 fill-current" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">My Favorites</h1>
                <p className="text-green-100">Products you love</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{wishlistCount}</div>
            <div className="text-sm text-green-100">Products</div>
            {hasWishlist && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 mt-2 cursor-pointer"
                onClick={handleClearWishlist}
                disabled={loading}
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="py-4 sm:py-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              autoComplete="off"
              spellCheck={false}
              aria-autocomplete="none"
              className="w-full rounded-md px-3 py-1 !text-[16px] h-14 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border pl-10 h-10 sm:h-12 border-gray-200 focus:border-[#1B6013] focus:ring-orange-600"
              placeholder="Search favorites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-6 shadow-md p-4">
          <div className="lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </Button>

              <div className="flex items-center border rounded-lg p-1">
                {hasWishlist && (
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="shrink-0 bg-border bg-gray-300 h-[1px] w-full mt-4 mb-2"></div>
            {showMobileFilters && (
              <div className="mt-4 space-y-4 p-4 shadow-md rounded-lg">
                <div>
                  <h4 className="text-sm font-medium mb-2">Category</h4>
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-md text-sm cursor-pointer"
                    disabled={categoriesLoading}
                  >
                    <option value="All Categories">All Categories</option>
                    {categoriesData.map((category) => (
                      <option value={category.name} key={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Sort By</h4>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      handleSortChange(e.target.value as SortOption)
                    }
                    className="w-full p-3 border rounded-md text-sm cursor-pointer border-gray-200"
                  >
                    <option value="featured">Date: Newest first</option>
                    <option value="alphabetically">Alphabetically, A-Z</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="hidden lg:flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <div className="relative flex items-center gap-2">
                <Filter className="h-6 w-6" />
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="p-3 border rounded-md text-sm cursor-pointer"
                  disabled={categoriesLoading}
                >
                  <option value="All Categories">All Categories</option>
                  {categoriesData.map((category) => (
                    <option value={category.name} key={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    handleSortChange(e.target.value as SortOption)
                  }
                  className="p-3 border rounded-md text-sm cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="alphabetically">Alphabetically, A-Z</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>
              </div>
            </div>

            <div className="flex items-center border rounded-lg p-1">
              {hasWishlist && (
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {loading && wishlistItems.length > 0 && (
          <div className="flex items-center justify-center py-4 mb-4">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Updating...</span>
          </div>
        )}

        {hasWishlist ? (
          <>
            {filteredWishlist.length > 0 ? (
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                    : "space-y-4"
                }
              >
                {filteredWishlist.map((item) => (
                  <ProductCard
                    key={item.id}
                    id={item.product.id}
                    name={item.product.name}
                    slug={item.product.slug}
                    // Try these alternative price props based on your earlier error:
                    hasFixedPrice={item.product.hasFixedPrice ?? false}
                    fixedPrice={
                      item.product.hasFixedPrice
                        ? item.product.fixedPrice
                        : item.product.displayPrice
                    }
                    unitPrices={item.product.unitPrices || []}
                    // OR if you have different field names:
                    // price={item.product.price}
                    // unit={item.product.unitPrices?.[0]?.unit || "Per Item"}
                    images={item.product.images}
                    viewMode={viewMode}
                    onRemove={() => handleRemoveItem(item.product.id)}
                    isRemoving={loading}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No matching items</h3>
                <p className="mt-2 text-muted-foreground">
                  Try adjusting your search or filter
                </p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("All Categories");
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Your wishlist is empty</h3>
            <p className="mt-2 text-muted-foreground">
              Start adding items you love to your wishlist
            </p>
            <Button className="mt-4">
              <Package className="mr-2 h-4 w-4" />
              Browse Products
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
