"use client";

import { Menu, ChevronDown, ChevronUp } from "lucide-react";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Container from "./Container";
import { categoriesData } from "../../data/categories";
import Link from "next/link";

function Category() {
  const [showDropdown, setShowDropdown] = useState(false);

  const toggleDropdown = () => setShowDropdown(!showDropdown);

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
                    className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg origin-top"
                  >
                    <ul className="py-1">
                      {categoriesData.map((category) => (
                        <motion.li
                          key={category.name}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                            <Link href={`/category/${category.slug}`} key={category.name}>
                          <button
                            onClick={() => handleCategoryClick(category.name)}
                            className="block px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                          >
                            {category.name}
                          </button>
                          </Link>
                        </motion.li>
                      ))}
                    </ul>
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
