"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import Container from "../reuse/Container";
import ProductCard from "../reuse/ProductCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Product } from "@/types/products";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function TodaysDealsSection() {
  const [todaysDeals, setTodaysDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch deal products directly with local state

  const fetchTodaysDeals = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        dealOfTheDay: "true",
        status: "ACTIVE",
        limit: "50",
      });

      const response = await axios.get(`/api/products?${params.toString()}`);

      if (response.data.success) {
        setTodaysDeals(response.data.products);
        console.log("Today's deals fetched:", response.data.products.length);
      } else {
        throw new Error(response.data.message || "Failed to fetch deals");
      }
    } catch (err) {
      console.error("Error fetching today's deals:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaysDeals();
  }, []);

  const handleSeeMore = () => {
    router.push("/todays-deal?dealOfTheDay=true");
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchTodaysDeals();
  };

  // Loading and error states
  if (loading && todaysDeals.length === 0) {
    return (
      <Container className="mx-auto px-4 py-8 shadow-md rounded-[8px] relative mb-12">
        <div className="flex items-center justify-between mb-8 border-b border-gray-300 pb-5">
          <h2 className="md:text-3xl text-xl font-bold text-gray-700">
            New Arrivals
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-48 rounded-lg mb-2"></div>
              <div className="bg-gray-200 h-4 rounded mb-2"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="mx-auto px-4 py-8 shadow-md rounded-[8px] relative mb-12">
        <div className="flex items-center justify-between mb-8 border-b border-gray-300 pb-5">
          <h2 className="md:text-3xl text-xl font-bold text-gray-700">
            New Arrivals
          </h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-500">Error loading new arrivals: {error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Try Again
          </button>
        </div>
      </Container>
    );
  }
  if (todaysDeals.length === 0)
    return <div className="text-center py-8">No deals available today</div>;

  return (
    <Container className="mx-auto px-4 py-8 shadow-md rounded-[8px] relative mb-12 bg-white">
      <div className="flex items-center justify-between mb-8 border-b border-gray-300 pb-5">
        <h2 className="md:text-3xl text-xl font-bold text-gray-700">
          Today&apos;s Deals
        </h2>
        <button
          className="text-orange-500 hover:text-orange-600 font-medium cursor-pointer"
          onClick={handleSeeMore}
        >
          See More →
        </button>
      </div>

      <Swiper
        modules={[Navigation]}
        spaceBetween={16}
        slidesPerView={2}
        navigation={{
          nextEl: ".todays-deals-next", // Unique class name
          prevEl: ".todays-deals-prev", // Unique class name
        }}
        breakpoints={{
          640: { slidesPerView: 3 },
          768: { slidesPerView: 4 },
          1024: { slidesPerView: 5 },
        }}
        className="flex gap-4 cursor-pointer relative"
      >
        {todaysDeals.map((product) => (
          <SwiperSlide key={product.id}>
            <ProductCard
              {...product}
              id={product.id}
              name={product.name}
              price={
                product.hasFixedPrice
                  ? product.fixedPrice
                  : product.displayPrice
              }
              images={
                product.images || ["/placeholder.svg?height=200&width=200"]
              }
              description={product.description || "No description available."}
              unit={product.unitPrices?.[0]?.unit || "Per Item"}
              category={product.category?.name || "Fruits"}
              rating={product.reviews?.[0].rating}
            />
          </SwiperSlide>
        ))}

        {/* Navigation Buttons with unique class names */}
        <button className="todays-deals-prev cursor-pointer absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-white md:p-2 p-1 md:py-4 py-2 rounded-[8px] shadow-md hover:bg-gray-100">
          <ChevronLeft />
        </button>
        <button className="todays-deals-next absolute cursor-pointer right-2 top-1/2 z-10 -translate-y-1/2 bg-white md:p-2 p-1 md:py-4 py-2 rounded-[8px] shadow-md hover:bg-gray-100">
          <ChevronRight />
        </button>
      </Swiper>
    </Container>
  );
}
