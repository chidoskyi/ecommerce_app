"use client";

import { Menu, ChevronDown, ChevronUp } from "lucide-react";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Container from "./Container";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import Link from "next/link";
import Image from "next/image";
import {
  fetchCategories,
  // selectCategories,
  // selectLoading,
  // selectError,
  selectCategoriesByStatus,
} from "@/app/store/slices/categorySlice";
import { CategoryStatus } from "@/types/categories";

function Category() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const dispatch = useAppDispatch();
  // const categories = useAppSelector(selectCategories);
  // const loading = useAppSelector(selectLoading);
  // const error = useAppSelector(selectError);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const toggleDropdown = () => {
    if (!showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownTop(rect.bottom);
    }
    setShowDropdown(!showDropdown);
  };
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

  const activeCategories = useAppSelector(
    selectCategoriesByStatus(CategoryStatus.ACTIVE)
  );

  const handleCategoryClick = (category: string) => {
    console.log(`Selected category: ${category}`);
    setShowDropdown(false);
  };

  const navLinks = [
    {
      title: "Today's Deal",
      link: "/todays-deal",
    },
    {
      title: "Completed Orders",
      link: "/account/order",
    },
    {
      title: "Shop",
      link: "/products",
    },
    {
      title: "Customer Support",
      link: "/customer-support",
    },
  ];

  return (
    <>
      <div className="w-full bg-white px-2 md:p-4 ">
        <Container>
          <section className="mx-auto">
            <div className="py-2 md:py-4 flex items-center gap-x-2 whitespace-nowrap scrollbar-hide w-full pr-2">
              {/* Categories Dropdown */}
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={toggleDropdown}
                  className="flex items-center gap-2 text-sm md:text-lg h-7 rounded-md hover:bg-gray-100 transition-colors cursor-pointer px-2"
                >
                  <Menu className="w-4 h-4 md:w-6 md:h-6 text-gray-600" />
                  Categories
                  {showDropdown ? (
                    <ChevronUp className="w-3 h-3 md:w-5 md:h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-3 h-3 md:w-5 md:h-5 text-gray-600" />
                  )}
                </button>

                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="fixed left-0 z-50 w-full bg-white border-b border-gray-200 shadow-lg"
                      style={{ top: `${dropdownTop}px` }}
                    >
                      {/* Mobile view - Simple list */}
                      <div className="block md:hidden">
                        <ul className="py-1">
                          {activeCategories.map((category) => (
                            <motion.li
                              key={category.name}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Link href={`/category/${category.slug}`}>
                                <button
                                  onClick={() =>
                                    handleCategoryClick(category.name)
                                  }
                                  className="block px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                >
                                  {category.name}
                                </button>
                              </Link>
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      {/* Desktop view - Grid with images */}
                      <div className="hidden md:block max-w-7xl mx-auto px-2 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                          {activeCategories.map((category) => {
                            // Move the variable declaration here, before return
                            const imageSrc =
                              typeof category.image === "string"
                                ? category.image
                                : category.image instanceof File
                                ? URL.createObjectURL(category.image)
                                : "/placeholder-category.svg";

                            return (
                              <motion.div
                                key={category.name}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="group"
                              >
                                <Link
                                  href={`/category/${category.slug}`}
                                  onClick={() =>
                                    handleCategoryClick(category.name)
                                  }
                                  className="block p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <div className="text-center">
                                    <div className="mb-2 sm:mb-3 overflow-hidden rounded-lg">
                                      <Image
                                        src={imageSrc}
                                        loading="lazy"
                                        alt={category.name}
                                        width={200}
                                        height={130}
                                        className="mx-auto h-[80px] w-[120px] sm:h-[100px] sm:w-[160px] md:h-[130px] md:w-[200px] object-cover transition-transform duration-300 group-hover:scale-110"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.src =
                                            "/placeholder-category.svg";
                                        }}
                                      />
                                    </div>
                                    <h3 className="text-xs sm:text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">
                                      {category.name}
                                    </h3>
                                  </div>
                                </Link>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="border-l h-7 rounded"></div>

              {/* Navigation Links */}
              <div className="flex items-center text-sm md:text-lg gap-3 overflow-x-auto whitespace-nowrap scrollbar-hide w-full overflow-visible">
                {navLinks.map(({ title, link }) => (
                  <Link
                    key={title}
                    href={link}
                    className="relative inline-block after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:origin-bottom-right after:scale-x-0 after:bg-orange-500 after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.65,0.05,0.36,1)] hover:after:origin-bottom-left hover:after:scale-x-100"
                  >
                    {title}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </Container>
      </div>
    </>
  );
}

export default Category;
