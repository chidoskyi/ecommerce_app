import Category from "@/components/reuse/Category";
import CategoriesSection from "@/components/home/categories-section";
import NewArrivalsSection from "@/components/home/new-arrivals-section";
import HeroSection from "@/components/home/hero-section";
import TodaysDealsSection from "@/components/home/todays-deals-section";
import BestSellingSection from "@/components/home/best-selling-section";
import PromotionalSection from "@/components/home/promotional-section";
import FreshFruitsSection from "@/components/home/fresh-fruits-section";
import FreshVegetablesSection from "@/components/home/fresh-vegetables-section";
import TrendingSection from "@/components/home/trending";

export default function Home() {
  return (
    <>
      <Category />
      <HeroSection />
      <CategoriesSection />
      <NewArrivalsSection />
      <TodaysDealsSection />
      {/* <BestSellingSection /> */}
      {/* <PromotionalSection /> */}
      <TrendingSection />
      <FreshFruitsSection />
      <FreshVegetablesSection />
     
    </>
  );
}
