"use client";

import Image from "next/image";
import Container from "../reuse/Container";
import Link from "next/link";
import { useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { CategoryStatus } from "@/types/categories";
import {
  fetchCategories,
  selectCategories,
  selectLoading,
  selectError,
  selectCategoriesByStatus,
} from "@/app/store/slices/categorySlice";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CategoriesSection() {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectCategories);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);

  // Get only active categories for display
  const activeCategories = useAppSelector(
    selectCategoriesByStatus(CategoryStatus.ACTIVE)
  );

  // Create refs for navigation buttons
  const swiperRef = useRef<any>(null);

  // Memoized retry handler
  useEffect(() => {
    console.log("🚀 CategoriesPage: Initial fetchCategories");
    dispatch(
      fetchCategories({
        sortBy: "name",
        status: CategoryStatus.ACTIVE,
        sortOrder: "asc",
        page: 1,
        limit: 10,
      })
    );
  }, [dispatch]); // Only depend on dispatch

  // Fetch categories on component mount
  useEffect(() => {
    // Only fetch if we don't have categories or if there was an error
    if (categories.length === 0 && !loading) {
      dispatch(
        fetchCategories({
          limit: 14,
          status: CategoryStatus.ACTIVE,
          sortBy: "name",
          sortOrder: "asc",
        })
      );
    }
  }, [dispatch, categories.length, loading]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <Container className="mx-auto px-4 py-8 mb-10">
      <div className="mb-8 border-b border-gray-200">
        <h2 className="md:text-3xl text-xl font-bold text-gray-400">
          Shop From <span className="text-orange-500">Top Categories</span>
        </h2>
        <div className="w-64 h-1 bg-orange-600 mt-2"></div>
      </div>

      <Swiper
        spaceBetween={20}
        slidesPerView={2}
        breakpoints={{
          640: { slidesPerView: 3, spaceBetween: 20 },
          768: { slidesPerView: 4, spaceBetween: 25 },
          1024: { slidesPerView: 6, spaceBetween: 30 },
          1280: { slidesPerView: 7, spaceBetween: 30 },
        }}
        className="py-3"
      >
        {Array.from({ length: 14 }).map((_, index) => (
          <SwiperSlide key={`skeleton-${index}`}>
            <div className="text-center">
              <div className="bg-gray-200 rounded-2xl p-2 mb-3 animate-pulse">
                <div className="w-full h-32 bg-gray-300 rounded"></div>
              </div>
              <div className="h-4 bg-gray-300 rounded animate-pulse mx-auto w-3/4"></div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </Container>
  );

  // Error component
  const ErrorComponent = () => (
    <Container className="mx-auto px-4 py-8 mb-10">
      <div className="mb-8 border-b border-gray-200">
        <h2 className="md:text-3xl text-xl font-bold text-gray-400">
          Shop From <span className="text-orange-500">Top Categories</span>
        </h2>
        <div className="w-64 h-1 bg-orange-600 mt-2"></div>
      </div>

      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-red-600 mb-4 font-medium">
            Failed to load categories
          </p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    </Container>
  );

  // Empty state component
  const EmptyState = () => (
    <Container className="mx-auto px-4 py-8 mb-10">
      <div className="mb-8 border-b border-gray-200">
        <h2 className="md:text-3xl text-xl font-bold text-gray-400">
          Shop From <span className="text-orange-500">Top Categories</span>
        </h2>
        <div className="w-64 h-1 bg-orange-600 mt-2"></div>
      </div>

      <div className="text-center py-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 max-w-md mx-auto">
          <p className="text-gray-600 mb-2">No categories available</p>
          <p className="text-gray-500 text-sm">
            Categories will appear here once they are added.
          </p>
        </div>
      </div>
    </Container>
  );

  // Render loading state
  if (loading && categories.length === 0) {
    return <LoadingSkeleton />;
  }

  // Render error state
  if (error && categories.length === 0) {
    return <ErrorComponent />;
  }

  // Render empty state
  if (activeCategories.length === 0) {
    return <EmptyState />;
  }

  return (
    <Container className="mx-auto px-4 py-8 mb-10 relative">
      <div className="mb-8 border-b border-gray-200">
        <h2 className="md:text-3xl text-xl font-bold text-gray-400">
          Shop From <span className="text-orange-500">Top Categories</span>
        </h2>
        <div className="w-64 h-1 bg-orange-600 mt-2"></div>
      </div>

      <div className="relative">
        <Swiper
          modules={[Navigation]}
          spaceBetween={16}
          slidesPerView={2}
          onSwiper={(swiper) => {
            swiperRef.current = swiper;
          }}
          breakpoints={{
            640: { slidesPerView: 3 },
            768: { slidesPerView: 4 },
            1024: { slidesPerView: 6 },
          }}
          className="py-3"
        >
          {activeCategories.map((category) => (
            <SwiperSlide key={category.slug}>
              <Link
                href={`/category/${category.slug}`}
                className="block group"
                aria-label={`Browse ${category.name} products`}
              >
                <div className="text-center">
                  <div
                    className={`${""} rounded-2xl bg-gray-100 p-2 mb-3 hover:shadow-md transition-all duration-300 cursor-pointer group-hover:scale-105`}
                  >
                    <Image
                      src={category.image || "/placeholder-category.svg"}
                      loading="lazy"
                      alt={category.name}
                      width={200}
                      height={130}
                      className="mx-auto h-[130px] w-[200px] object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder-category.svg";
                      }}
                    />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors duration-200">
                    {category.name}
                  </h3>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Navigation Buttons - Only show if there are enough categories */}
        {activeCategories.length > 6 && (
          <>
            <button
              onClick={() => swiperRef.current?.slidePrev()}
              className="absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-label="Previous categories"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => swiperRef.current?.slideNext()}
              className="absolute right-0 top-1/2 z-10 -translate-y-1/2 bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
              aria-label="Next categories"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </>
        )}
      </div>
    </Container>
  );
}
