"use client"

import Container from "@/components/reuse/Container";
import CategoryProductList from "@/components/reuse/CategoryProductList";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react"; // Added useState
import { useCategories } from "@/app/store/slices/categorySlice";
import { CategoryStatus } from "@/types/categories";

export default function GetProductsByCategoryPage() {
  const params = useParams();
  const [isInitialLoading, setIsInitialLoading] = useState(true); // Added local loading state
  
  // Handle both slug and id params in case of conflicts
  const categorySlug = Array.isArray(params?.slug) 
    ? params.slug[0] 
    : params?.slug as string;
  
  // Get data from Redux store using the custom hook
  const { 
    categories, 
    loading: categoriesLoading, 
    error: categoriesError,
    actions: categoryActions 
  } = useCategories();

  // Find current category by slug or name
  const currentCategory = categories.find(cat => 
    cat.slug === categorySlug || 
    cat.id === categorySlug ||
    cat.name.toLowerCase().replace(/\s+/g, '-') === categorySlug
  );

  console.log('=== GetProductsByCategoryPage Debug ===');
  console.log('categorySlug from params:', categorySlug);
  console.log('Available categories:', categories.map(cat => ({ 
    id: cat.id, 
    name: cat.name, 
    slug: cat.slug,
    nameToSlug: cat.name.toLowerCase().replace(/\s+/g, '-')
  })));
  console.log('currentCategory found:', currentCategory);
  console.log('currentCategory details:', currentCategory ? {
    id: currentCategory.id,
    name: currentCategory.name,
    slug: currentCategory.slug,
    status: currentCategory.status
  } : 'null');
  console.log('isInitialLoading:', isInitialLoading); // Added to debug
  console.log('=====================================');

  // Fetch categories if not loaded
  useEffect(() => {
    console.log('=== Categories useEffect ===');
    console.log('categories.length:', categories.length);
    console.log('categoriesLoading:', categoriesLoading);
    
    if (categories.length === 0 && !categoriesLoading) {
      console.log("Fetching categories for category page...");
      setIsInitialLoading(true); // Set loading when starting fetch
      categoryActions.fetchCategories({
        limit: 50, // Get more categories to ensure we have all
        status: CategoryStatus.ACTIVE,
        sortBy: 'name',
        sortOrder: 'asc'
      }).finally(() => {
        setIsInitialLoading(false); // Clear loading when fetch completes
      });
    } else if (categories.length > 0) {
      // If we already have categories, clear the loading state
      setIsInitialLoading(false);
    } else {
      console.log('Not fetching categories - already have data or loading');
    }
    console.log('===========================');
  }, [categories.length, categoriesLoading, categoryActions]);

  // Combined loading state - show loading if either Redux is loading OR we're initially loading
  const showLoading = isInitialLoading || (categoriesLoading && categories.length === 0);

  // Loading state
  if (showLoading) {
    return (
      <>
        {/* Breadcrumb skeleton */}
        <div className="w-full bg-white mx-auto px-4 sm:px-6 lg:px-8 py-5 mb-5">
          <Container className="text-lg text-gray-500 font-semibold">
            <Link href="/">
              <span className="hover:text-orange-600 cursor-pointer">Home</span>
            </Link>
            <span className="mx-2">›</span>
            <div className="inline-block w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          </Container>
        </div>
        
        <Container className="px-4 py-8">
          <div className="animate-pulse space-y-6">
            {/* Title skeleton */}
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            
            {/* Content skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-gray-200 h-64 rounded-lg"></div>
              ))}
            </div>
          </div>
        </Container>
      </>
    );
  }

  // Error state for categories
  if (categoriesError && !currentCategory) {
    return (
      <>
        {/* Breadcrumb */}
        <div className="w-full bg-white mx-auto px-4 sm:px-6 lg:px-8 py-5 mb-5">
          <Container className="text-lg text-gray-500 font-semibold">
            <Link href="/">
              <span className="hover:text-orange-600 cursor-pointer">Home</span>
            </Link>
            <span className="mx-2">›</span>
            <span className="text-gray-900 text-sm">Error Loading Categories</span>
          </Container>
        </div>
        
        <Container className="px-4 py-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-800 mb-4">Error Loading Categories</h1>
              <p className="text-red-600 mb-6">{categoriesError}</p>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setIsInitialLoading(true); // Set loading when retrying
                    categoryActions.fetchCategories({
                      limit: 50,
                      status: CategoryStatus.ACTIVE,
                      sortBy: 'name',
                      sortOrder: 'asc'
                    }).finally(() => {
                      setIsInitialLoading(false); // Clear loading when done
                    });
                  }}
                  className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Try Again
                </button>
                <div className="text-sm">
                  <Link 
                    href="/" 
                    className="text-orange-600 hover:text-orange-700 underline"
                  >
                    ← Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </>
    );
  }

  // Category not found after loading is complete
  if (!currentCategory && !categoriesLoading && !isInitialLoading) {
    return (
      <>
        {/* Breadcrumb */}
        <div className="w-full bg-white mx-auto px-4 sm:px-6 lg:px-8 py-5 mb-5">
          <Container className="text-lg text-gray-500 font-semibold">
            <Link href="/">
              <span className="hover:text-orange-600 cursor-pointer">Home</span>
            </Link>
            <span className="mx-2">›</span>
            <span className="text-gray-900 text-sm">Category Not Found</span>
          </Container>
        </div>
        
        <Container className="px-4 py-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Category Not Found</h1>
              <p className="text-gray-600 mb-6">
                The category &apos;{categorySlug}&apos; doesn&apos;t exist or has been removed.
              </p>
              <div className="space-y-4">
                <Link 
                  href="/" 
                  className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  ← Back to Home
                </Link>
                
                {/* Show available categories if we have them */}
                {categories.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-600 mb-3">Available categories:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {categories.slice(0, 6).map(cat => (
                        <Link
                          key={cat.id}
                          href={`/category/${cat.slug || cat.id}`}
                          className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm hover:bg-orange-200 transition-colors"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                    {categories.length > 6 && (
                      <p className="text-xs text-gray-500 mt-2">
                        and {categories.length - 6} more...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Container>
      </>
    );
  }

  // Main render when category is found
  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full bg-white mx-auto px-4 sm:px-6 lg:px-8 py-5 mb-5 shadow-sm">
        <Container className="text-lg text-gray-500 font-semibold">
          <Link href="/">
            <span className="hover:text-orange-600 cursor-pointer transition-colors">Home</span>
          </Link>
          <span className="mx-2">›</span>
          {currentCategory && (
            <span className="text-gray-900 text-sm capitalize">{currentCategory.name}</span>
          )}
        </Container>
      </div>
      
      <Container className="px-4 py-8">
        {currentCategory && (
          <>
            {/* Category header */}
            <div className="mb-8 px-4">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentCategory.name}
              </h1>
              {currentCategory.description && (
                <p className="text-gray-600 max-w-2xl leading-relaxed">
                  {currentCategory.description}
                </p>
              )}
            </div>
            
            {/* Products list - pass both slug and category object */}
            <CategoryProductList 
              categorySlug={categorySlug} 
              category={currentCategory} 
            />
          </>
        )}
      </Container>
    </>
  );
}