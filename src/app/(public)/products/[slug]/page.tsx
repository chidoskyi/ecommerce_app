"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import Container from "@/components/reuse/Container";
import { fetchProductBySlug, useProducts } from "@/app/store/slices/productSlice";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CustomerReviews } from "@/components/reuse/CustomerReview";
import { RelatedProducts } from "@/components/reuse/RelatedProduct";
import ProductImageGallery from "@/components/reuse/ProductImageSlider";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { Product } from "@/types/products";

const ProductDetailsPage: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [productLoading, setProductLoading] = useState(true);
  const [showNotFound, setShowNotFound] = useState(false);

  const { products, loading, error, actions } = useProducts();
  const dispatch = useAppDispatch();
  const params = useParams();
  const slug = params?.slug

  // Get the current product from Redux state
  const currentProduct = useAppSelector((state) => state.products.activeProduct);

  // Main effect to fetch product by slug
  useEffect(() => {
    if (slug && typeof slug === 'string') {
      console.log('Fetching product for slug:', slug);
      setProductLoading(true);
      setShowNotFound(false);
      
      // Dispatch the fetchProductBySlug thunk
      dispatch(fetchProductBySlug(slug))
        .unwrap()
        .then((fetchedProduct: Product) => {
          console.log('Product fetched successfully:', fetchedProduct);
          actions.setActiveProduct(fetchedProduct);
          setProductLoading(false);
        })
        .catch((error: unknown) => {
          console.error('Error fetching product:', error);
          setProductLoading(false);
          // Try to find in existing products as fallback - use products directly
          const foundProduct = products.find((p: Product) => p.slug === slug);
          if (foundProduct) {
            actions.setActiveProduct(foundProduct);
          } else {
            setShowNotFound(true);
          }
        });
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, dispatch]); // Only depend on slug and dispatch - both are stable

  // Memoize actions to prevent unnecessary re-renders
  const setActiveProduct = useCallback((product: Product | null) => {
    actions.setActiveProduct(product);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.setActiveProduct]);

  const fetchProducts = useCallback(() => {
    actions.fetchProducts();
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.fetchProducts]);

  // Fetch all products if store is empty (fallback)
  useEffect(() => {
    if (products.length === 0 && !loading) {
      fetchProducts();
    }
  }, [products.length, loading, fetchProducts]);

  // Clean up active product when component unmounts or slug changes
  useEffect(() => {
    return () => {
      // Optional: Clear active product when leaving the page
      setActiveProduct(null);
    };
  }, [slug, setActiveProduct]); // Now using memoized function

  // Use currentProduct as the main product variable
  const product = currentProduct;

  // Combined loading state
  const isLoading = productLoading || (loading && !product);

  // Loading state
  if (isLoading) {
    return (
      <Container className="py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product details...</p>
        </div>
      </Container>
    );
  }

  // Error state
  if (error && !product) {
    return (
      <Container className="py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Product
          </h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Button
            onClick={() => {
              if (slug && typeof slug === 'string') {
                dispatch(fetchProductBySlug(slug));
              }
            }}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Try Again
          </Button>
        </div>
      </Container>
    );
  }

  // Product not found state
  if (showNotFound || (!product && !isLoading)) {
    return (
      <Container className="py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Product Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            The product &quot;{slug}&quot; you&apos;re looking for doesn&apos;t exist or
            may have been removed.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Go Back Home
            </Link>
            <Button onClick={fetchProducts} variant="outline">
              Refresh Products
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  // Additional safety check
  if (!product) {
    return (
      <Container className="py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Finalizing product details...</p>
        </div>
      </Container>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full bg-white mx-auto sm:px-6 lg:px-8 py-5 mb-5">
        <Container className="text-sm text-gray-500">
          <Link href="/" className="hover:text-green-600 cursor-pointer">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="text-gray-900">{product.name}</span>
        </Container>
      </div>

      <Container className="bg-gray-50">
        {/* Main Content */}
        <div className="mx-auto sm:px-0 lg:px-0 pb-8">
          {/* Product Image Gallery */}
          <div>
            <ProductImageGallery product={product} />
          </div>

          {/* Product Description */}
          <div className="mt-6 bg-white p-3 rounded-lg">
            <h2 className="mb-4">
              <Button
                type="button"
                className="flex w-full items-center cursor-pointer justify-between py-4 text-left px-3 text-2xl font-semibold"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                variant="ghost"
              >
                Product Description
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </h2>

            {/* Animated description */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="pb-4 pt-0 px-3 text-lg text-gray-700 mb-4">
                {product.description || "No description available."}
              </div>
            </div>
          </div>

          {/* Customer Reviews */}
          <CustomerReviews
            productId={product.id?.toString() || "product-123"}
            initialRating={product.averageRating}
            initialReviewCount={product.reviewCount || 0}
          />

          {/* Related products - using API data */}
          <RelatedProducts
            currentProductId={product.id?.toString() || ""}
            currentProductCategory={product.categoryId ?? ""}
            maxProducts={5}
            title="You might also like"
            showViewAll={true}
          />
        </div>
      </Container>
    </>
  );
};

export default ProductDetailsPage;