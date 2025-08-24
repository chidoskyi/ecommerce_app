
'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules'; // Updated import path
import 'swiper/css';
import 'swiper/css/navigation';
import Container from "../reuse/Container";
import ProductCard from "../reuse/ProductCard";
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect } from 'react';
import { useProducts } from '@/app/store/slices/productSlice';
import { Product } from '@/types/products';

export default function BestSellingSection() {
  const { products, loading, error, actions } = useProducts();

  // Fetch best selling products on component mount
  useEffect(() => {
    actions.fetchProducts({
      bestSelling: true,
      status: 'ACTIVE',
      limit: 20 // Get more products for the carousel
    });
  }, []);

  // Filter for best selling products (backup filter in case API doesn't support it)
  const bestSelling = products.filter(product =>
    product.isBestSelling && product.status === 'ACTIVE'
  );

  if (loading && products.length === 0) {
    return (
      <Container className="mx-auto px-4 py-8 shadow-md rounded-[8px] relative mb-12">
        <div className="flex items-center justify-between mb-8 border-b border-gray-300 pb-5">
          <h2 className="md:text-3xl text-xl font-bold text-gray-700">Best Selling Products</h2>
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
          <h2 className="md:text-3xl text-xl font-bold text-gray-700">Best Selling Products</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-red-500">Error loading best selling products: {error}</p>
          <button 
            onClick={() => actions.fetchProducts({ bestSelling: true, status: 'ACTIVE' })}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container className="mx-auto px-4 py-8 shadow-md rounded-[8px] relative mb-12">
      <div className="flex items-center justify-between mb-8 border-b border-gray-300 pb-5">
        <h2 className="md:text-3xl text-xl font-bold text-gray-700">Best Selling Products</h2>
        <button className="text-orange-500 hover:text-orange-600 font-medium cursor-pointer">See More →</button>
      </div>

      <Swiper
        modules={[Navigation]}
        spaceBetween={16}
        slidesPerView={2}
        navigation={{
          nextEl: '.new-arrivals-next',
          prevEl: '.new-arrivals-prev',
        }}
        breakpoints={{
          640: { slidesPerView: 3 },
          768: { slidesPerView: 4 },
          1024: { slidesPerView: 5 }
        }}

        className='flex gap-4 cursor-pointer relative'
      >
        {bestSelling.map((product, index) => (
          <SwiperSlide key={index}>
            <ProductCard  
            {...product}
              id={product.id}
              name={product.name}
              price={product.hasFixedPrice ? product.fixedPrice : product.displayPrice}
              images={product.images || ["/placeholder.svg?height=200&width=200"]}
              description={product.description || "No description available."}
              unit={product.unitPrices && product.unitPrices.length > 0 ? product.unitPrices[0].unit : "Per Item"}
              category={product.category?.name || "Best Selling"}
              rating={product.rating}
              isFeatured={product.isFeatured}
             />
          </SwiperSlide>
        ))}

        {/* Navigation Buttons */}
      <button className="new-arrivals-prev cursor-pointer absolute left-2 top-1/2 z-10 -translate-y-1/2 bg-white md:p-2 p-1  md:py-4 py-2 rounded-[8px] shadow-md hover:bg-gray-100">
        <ChevronLeft />
      </button>
      <button className="new-arrivals-next absolute cursor-pointer right-2 top-1/2  z-10 -translate-y-1/2 bg-white md:p-2 p-1  md:py-4 py-2  rounded-[8px] shadow-md hover:bg-gray-100">
        <ChevronRight/>
      </button>
      </Swiper>

      
    </Container>
  )
}
