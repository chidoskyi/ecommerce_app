"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { Button } from "@/components/ui/button";
import { ProductFiltersMobileProps, ProductFiltersProps } from "@/types";
import { useProducts } from "@/app/store/slices/productSlice";
import { useCategories } from "@/app/store/slices/categorySlice";
import { debounce } from "lodash";
import { StarRating } from "./StarRating";

export function ProductFilters({
  selectedFilters,
  onFilterChange,
  onClose,
  handleClearAllFilters,
  showCloseButton = false,
}: ProductFiltersProps) {
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [isLoadingPriceRange, setIsLoadingPriceRange] = useState(true);
  
  const { actions, filters: reduxFilters, products } = useProducts();
  const { categories, actions: categoryActions } = useCategories();

  // Filter to get only active categories
  const activeCategories = categories.filter(
    (category) => category.status === "ACTIVE"
  );

  // Calculate price range from products in Redux store
  const calculatePriceRange = useCallback(() => {
    try {
      setIsLoadingPriceRange(true);
      
      if (products.length === 0) {
        // If no products, use default range
        setMaxPrice(1000);
        setIsLoadingPriceRange(false);
        return;
      }

      // Extract all prices from products
      const allPrices: number[] = [];
      
      products.forEach(product => {
        // Get fixed price if available
        if (product.hasFixedPrice && product.fixedPrice !== undefined && product.fixedPrice > 0) {
          allPrices.push(product.fixedPrice);
        }
        
        // Get display price if available
        if (product.displayPrice && product.displayPrice > 0) {
          allPrices.push(product.displayPrice);
        }
        
        // Get unit prices if available
        if (product.unitPrices && product.unitPrices.length > 0) {
          product.unitPrices.forEach(unitPrice => {
            if (unitPrice.price > 0) {
              allPrices.push(unitPrice.price);
            }
          });
        }
      });

      if (allPrices.length > 0) {
        const minProductPrice = Math.floor(Math.min(...allPrices));
        const maxProductPrice = Math.ceil(Math.max(...allPrices));
        
        // Set calculated max price
        setMaxPrice(maxProductPrice);
        
        // Update price range if current max exceeds calculated max
        setPriceRange(prev => [
          Math.max(prev[0], minProductPrice),
          Math.min(prev[1], maxProductPrice)
        ]);
      } else {
        // Fallback if no valid prices found
        setMaxPrice(1000);
      }
    } catch (error) {
      console.error('Failed to calculate price range:', error);
      setMaxPrice(1000);
    } finally {
      setIsLoadingPriceRange(false);
    }
  }, [products]);

  // Debounced price update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedPriceUpdate = useCallback(
    debounce((range: number[]) => {
      const minPrice = range[0] > 0 ? range[0] : undefined;
      const maxPriceValue = range[1] < maxPrice ? range[1] : undefined;
      
      // Use the enhanced action that updates filters and fetches automatically
      actions.updateFiltersAndFetch({
        minPrice,
        maxPrice: maxPriceValue,
      });
    }, 500),
    [actions, maxPrice]
  );

  // Initialize component
  useEffect(() => {
    calculatePriceRange();
    
    // Fetch categories if not loaded
    if (categories.length === 0) {
      categoryActions.fetchCategories({ status: "ACTIVE" });
    }
  }, [calculatePriceRange, categories.length, categoryActions]);

  // Recalculate price range when products change
  useEffect(() => {
    if (products.length > 0) {
      calculatePriceRange();
    }
  }, [products, calculatePriceRange]);

  // Sync local price range with Redux filters
  useEffect(() => {
    if (
      reduxFilters.minPrice !== undefined ||
      reduxFilters.maxPrice !== undefined
    ) {
      setPriceRange([
        reduxFilters.minPrice || 0,
        reduxFilters.maxPrice || maxPrice,
      ]);
    } else {
      setPriceRange([0, maxPrice]);
    }
  }, [reduxFilters.minPrice, reduxFilters.maxPrice, maxPrice]);

  const handleCategoryChange = (categorySlug: string, checked: boolean) => {
    const updatedFilters = { ...reduxFilters };
    
    if (checked) {
      updatedFilters.category = categorySlug;
    } else {
      updatedFilters.category = "";
    }
    
    // Use the enhanced action that updates filters and fetches automatically
    actions.updateFiltersAndFetch(updatedFilters);

    // Update local selectedFilters for UI state
    const newSelectedFilters = { ...selectedFilters };
    
    // Clear other category selections
    activeCategories.forEach((cat) => {
      delete newSelectedFilters[cat.slug];
      delete newSelectedFilters[cat.name];
    });
    
    if (checked) {
      newSelectedFilters[categorySlug] = true;
    }
    
    onFilterChange(newSelectedFilters);
  };

  const handleRatingChange = (rating: number, checked: boolean) => {
    const updatedFilters = { ...reduxFilters };
    
    if (checked) {
      updatedFilters.minRating = rating;
    } else {
      updatedFilters.minRating = undefined;
    }
    
    // Use the enhanced action that updates filters and fetches automatically
    actions.updateFiltersAndFetch(updatedFilters);

    // Update local selectedFilters for UI state
    const newFilters = { ...selectedFilters };
    
    // Clear other rating selections since only one can be active
    [1, 2, 3, 4, 5].forEach((r) => {
      delete newFilters[`rating_${r}`];
    });
    
    if (checked) {
      newFilters[`rating_${rating}`] = true;
    }
    
    onFilterChange(newFilters);
  };

  const resetCategory = () => {
    actions.updateFiltersAndFetch({ category: "" });

    // Clear all category selections from local state
    const newFilters = { ...selectedFilters };
    activeCategories.forEach((cat) => {
      delete newFilters[cat.slug];
      delete newFilters[cat.name];
    });
    onFilterChange(newFilters);
  };

  const resetPrice = () => {
    setPriceRange([0, maxPrice]);
    actions.updateFiltersAndFetch({ 
      minPrice: undefined, 
      maxPrice: undefined 
    });
  };

  const resetRating = () => {
    actions.updateFiltersAndFetch({ minRating: undefined });

    // Clear all rating selections from local state
    const newFilters = { ...selectedFilters };
    [1, 2, 3, 4, 5].forEach((rating) => {
      delete newFilters[`rating_${rating}`];
    });
    onFilterChange(newFilters);
  };

  const handlePriceChange = (newRange: number[]) => {
    setPriceRange(newRange);
    debouncedPriceUpdate(newRange);
  };

  // Check if category is currently selected based on Redux state
  const isCategorySelected = (categorySlug: string) => {
    return reduxFilters.category === categorySlug;
  };

  // Check if rating is currently selected based on Redux state
  const isRatingSelected = (rating: number) => {
    return reduxFilters.minRating === rating;
  };

  // Clear all filters function
  const clearAllFilters = () => {
    // Use the built-in clearFilters action from the slice
    actions.clearFilters();

    // Reset local price range
    setPriceRange([0, maxPrice]);

    // Clear all local selectedFilters
    onFilterChange({});
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      reduxFilters.category ||
      reduxFilters.minPrice !== undefined ||
      reduxFilters.maxPrice !== undefined ||
      reduxFilters.minRating !== undefined ||
      reduxFilters.search ||
      reduxFilters.featured ||
      reduxFilters.trending ||
      reduxFilters.bestSelling ||
      reduxFilters.dealOfTheDay ||
      reduxFilters.newArrival ||
      reduxFilters.fruit ||
      reduxFilters.vegetable
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="p-4 space-y-6">
        {showCloseButton && (
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Filters</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Categories Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Categories</h3>
            {reduxFilters.category && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                onClick={resetCategory}
              >
                Reset
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {activeCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={category.slug}
                    checked={isCategorySelected(category.slug)}
                    onCheckedChange={(checked) =>
                      handleCategoryChange(category.slug, Boolean(checked))
                    }
                    className="cursor-pointer"
                  />
                  <Label
                    htmlFor={category.slug}
                    className="text-sm text-gray-700 cursor-pointer hover:text-gray-900"
                  >
                    {category.name}
                  </Label>
                </div>
                {category.productsCount && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {category.productsCount}
                  </span>
                )}
              </div>
            ))}
            {activeCategories.length === 0 && (
              <div className="text-sm text-gray-500 py-2">
                No categories available
              </div>
            )}
          </div>
        </div>

        {/* Price Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Price</h3>
            {(reduxFilters.minPrice !== undefined || reduxFilters.maxPrice !== undefined) && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                onClick={resetPrice}
              >
                Reset
              </Button>
            )}
          </div>
          <div className="px-3 py-4">
            {isLoadingPriceRange ? (
              <div className="text-sm text-gray-500 text-center py-6 flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Calculating price range...</span>
              </div>
            ) : (
              <>
                <Slider
                  range
                  min={0}
                  max={maxPrice}
                  value={priceRange}
                  onChange={(value) => handlePriceChange(Array.isArray(value) ? value : [value, value])}
                  trackStyle={[{ backgroundColor: '#3B82F6' }]}
                  handleStyle={[
                    { borderColor: '#3B82F6', backgroundColor: '#3B82F6' },
                    { borderColor: '#3B82F6', backgroundColor: '#3B82F6' }
                  ]}
                  railStyle={{ backgroundColor: '#E5E7EB' }}
                />
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      ${priceRange[0]}
                    </span>
                    <span className="text-sm text-gray-400">-</span>
                    <span className="text-sm font-medium text-gray-700">
                      ${priceRange[1]}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Max: ${maxPrice}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rating Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Customer Rating</h3>
            {reduxFilters.minRating !== undefined && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                onClick={resetRating}
              >
                Reset
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center space-x-3">
                <Checkbox
                  id={`rating_${rating}`}
                  checked={isRatingSelected(rating)}
                  onCheckedChange={(checked) =>
                    handleRatingChange(rating, Boolean(checked))
                  }
                  className="cursor-pointer"
                />
                <Label 
                  htmlFor={`rating_${rating}`} 
                  className="cursor-pointer flex items-center space-x-2 flex-1"
                >
                  <StarRating
                    rating={rating}
                    showNumber={false}
                    starSize={16}
                    className=""
                  />
                  <span className="text-sm text-gray-600">& up</span>
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Clear All Filters */}
        {hasActiveFilters() && (
          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300"
              onClick={handleClearAllFilters || clearAllFilters}
            >
              <X className="w-4 h-4 mr-2" />
              Clear All Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductFiltersMobile({
  selectedFilters,
  onFilterChange,
  isOpen,
  onClose,
  handleClearAllFilters,
}: ProductFiltersMobileProps) {
  return (
    <>
      {/* Mobile filter overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={onClose}
          />
          
          {/* Sliding panel */}
          <div className="relative h-full w-full max-w-sm bg-white shadow-xl transform transition-transform">
            <div className="h-full overflow-y-auto">
              <ProductFilters
                selectedFilters={selectedFilters}
                onFilterChange={onFilterChange}
                // categoryId={categoryId}
                onClose={onClose}
                handleClearAllFilters={handleClearAllFilters}
                showCloseButton={true}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}