import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useProducts } from "@/app/store/slices/productSlice";
import { useCategories } from "@/app/store/slices/categorySlice";
import Image from 'next/image';
import { Product } from '@/types/products';

export interface SearchBarProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  placeholder: string;
}

// Add these interfaces
interface PageSuggestion {
  id: number;
  name: string;
  path: string;
}

interface CategorySuggestion {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
  status?: string;
}

// SearchDropdown Component
const SearchDropdown = ({ isVisible, searchQuery, onClose, searchContainerRef }: {
  isVisible: boolean;
  searchQuery: string;
  onClose: () => void;
  searchContainerRef: React.RefObject<HTMLDivElement>;
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [pageSuggestions, setPageSuggestions] = useState<PageSuggestion[]>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<CategorySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Get products and categories from Redux store
  const { products } = useProducts();
  const { categories, actions: categoryActions } = useCategories();

  // Sample pages - replace with your actual data
  const samplePages: PageSuggestion[] = [
    { id: 1, name: "Privacy policy", path: "/privacy-policy" },
    { id: 2, name: "Refund policy", path: "/refund-policy" },
    { id: 3, name: "Terms of service", path: "/terms-of-service" },
    { id: 4, name: "About us", path: "/about-us" },
    { id: 5, name: "Contact us", path: "/contact-us" },
  ];


  // Load categories when component mounts
  useEffect(() => {
    if (categories.length === 0) {
      categoryActions.fetchCategories({ status: "ACTIVE" });
    }
  }, [categories.length, categoryActions]);

  // Calculate dropdown position relative to viewport
  useEffect(() => {
    if (isVisible && searchContainerRef.current) {
      const rect = searchContainerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: 0, // Full width of viewport
      });
    }
  }, [isVisible, searchContainerRef]);

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Search logic effect
  useEffect(() => {
    if (searchQuery.length < 1) {
      setProductSuggestions([]);
      setPageSuggestions([]);
      setCategorySuggestions([]);
      return;
    }

    setIsLoading(true);
    
    // Use a timeout to debounce the search
    const timer = setTimeout(() => {
      const searchTerm = searchQuery.toLowerCase();
      
      // Filter products from Redux store
      const filteredProducts = products.filter((product: Product) => 
        product.name?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm) ||
        product.category?.name?.toLowerCase().includes(searchTerm)
      ).slice(0, 6); // Limit to 6 products
      
      // Filter pages
      const filteredPages = samplePages.filter(page => 
        page.name.toLowerCase().includes(searchTerm)
      ).slice(0, 4); // Limit to 4 pages
      
      // Filter categories from Redux store
      const filteredCategories = categories.filter(category => 
        category.status === "ACTIVE" && (
          category.name.toLowerCase().includes(searchTerm) ||
          category.slug.toLowerCase().includes(searchTerm) ||
          category.description?.toLowerCase().includes(searchTerm)
        )
      ).slice(0, 6); // Limit to 6 categories
      
      setProductSuggestions(filteredProducts);
      setPageSuggestions(filteredPages);
      setCategorySuggestions(filteredCategories as unknown as CategorySuggestion[]);
      setIsLoading(false);
    }, 300);
    
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, products, categories]);

  if (!isVisible) return null;

  return (
    <div 
      ref={dropdownRef}
      className="fixed left-0 w-full z-50 bg-white shadow-lg border border-gray-200 max-h-[70vh] overflow-y-auto"
      style={{ 
        top: `${dropdownPosition.top}px`,
      }}
    >
      <div className="container mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-gray-600">Searching...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Suggestions header */}
            {(productSuggestions.length > 0 || pageSuggestions.length > 0 || categorySuggestions.length > 0) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Search Results for &quot;{searchQuery}&quot;</h3>
              </div>
            )}

            {/* Products section */}
            {productSuggestions.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-800">Products ({productSuggestions.length})</h4>
                  <Link 
                    href={`/products?search=${encodeURIComponent(searchQuery)}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                    onClick={onClose}
                  >
                    View all products
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {productSuggestions.map((product: Product) => (
                    <Link 
                      key={product.id} 
                      href={`/products/${product.slug}`}
                      className="p-3 border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all bg-white flex flex-col group"
                      onClick={onClose}
                    >
                      <div className="h-32 bg-gray-100 rounded-md mb-3 flex items-center justify-center overflow-hidden group-hover:bg-gray-50 transition-colors">
                        {product.images && product.images.length > 0 ? (
                          <Image 
                            width={200}
                            height={200}
                            src={product.images[0]} 
                            alt={product.name} 
                            className="object-cover h-full w-full rounded-md" 
                          />
                        ) : (
                          <div className="text-gray-400 text-xs">No Image</div>
                        )}
                      </div>
                      <h5 className="font-medium text-sm mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h5>
                      <div className="flex items-center gap-2 mt-auto">
                        <span className="text-green-600 font-semibold text-sm">
                          ${product.hasFixedPrice ? product.fixedPrice?.toFixed(2) : product.displayPrice?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      {/* {product.rating && product.rating > 0 && (
                        <div className="mt-1">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <StarRating 
                                key={star} 
                                className={`w-3 h-3 ${star <= product.rating ? 'text-yellow-400' : 'text-gray-200'}`} 
                                rating={product.rating}
                                showNumber={false}
                                starSize={16}
                              />
                            ))}
                            <span className="text-xs text-gray-500 ml-1">({product.rating})</span>
                          </div>
                        </div>
                      )} */}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* Categories and Pages section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Categories section */}
              {categorySuggestions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-md font-semibold text-gray-800">Categories ({categorySuggestions.length})</h4>
                    <Link 
                      href={`/categories?search=${encodeURIComponent(searchQuery)}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                      onClick={onClose}
                    >
                      View all
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {categorySuggestions.map(category => (
                      <Link 
                        key={category.id} 
                        href={`/products?category=${category.slug}`}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200 group"
                        onClick={onClose}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                            {category.image ? (
                              <Image 
                                src={category.image}
                                alt={category.name}
                                width={50}
                                height={50}
                                className="object-cover w-full h-full rounded-lg"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-gray-300 rounded"></div>
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                              {category.name}
                            </span>
                            {category.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {category.description}
                              </p>
                            )}
                            {category.productCount && (
                              <p className="text-xs text-gray-400 mt-1">
                                {category.productCount} products
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pages section */}
              {pageSuggestions.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Pages ({pageSuggestions.length})</h4>
                  <div className="space-y-2">
                    {pageSuggestions.map(page => (
                      <Link 
                        key={page.id}
                        href={page.path}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200 group"
                        onClick={onClose}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {page.name}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* No results */}
            {productSuggestions.length === 0 && 
             pageSuggestions.length === 0 && 
             categorySuggestions.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No results found</h4>
                <p className="text-gray-500 mb-4">We couldn&quot;t find anything matching &quot;{searchQuery}&quot;</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link 
                    href={`/products?search=${encodeURIComponent(searchQuery)}`}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    onClick={onClose}
                  >
                    Search all products
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                  <Link 
                    href="/products"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    onClick={onClose}
                  >
                    Browse all products
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            Press <kbd className="px-2 py-1 bg-white rounded border text-xs font-mono">Enter</kbd> to see all results
          </p>
          <div className="flex items-center space-x-4">
            <Link 
              href={`/products?search=${encodeURIComponent(searchQuery)}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
              onClick={onClose}
            >
              See all results
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchDropdown;