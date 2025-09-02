"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ProductCardProps } from "../../types";
import { Heart, Minus, ShoppingCart } from "lucide-react";
import React, { useState } from "react";
import Link from "next/link";
import { PriceFormatter } from "./FormatCurrency";
import { slugify } from "@/lib/slugify";
import { StarRating } from "./StarRating";

export default function CategoryProductCard({
  id,
  name,
  price,
  slug,
  originalPrice = undefined,
  image,
  rating = undefined,
  inStock = true,
  unit = undefined,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isInCart, setIsInCart] = useState(false);

  const productSlug = slug || `${slugify(name)}-${id}`;

  // Helper function to safely handle null/undefined values
  const hasValue = (value?: number | null): value is number => {
    return value !== null && value !== undefined;
  };

  // Handle click on card (excluding buttons)
  const handleCardClick = (e: React.MouseEvent) => {
    // If the click was on a button, don't navigate
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    // Otherwise, navigation will be handled by the Link
  };

  console.log("Product Slug:", productSlug); // Add this inside your component
  return (
    <Link href={`/products/${productSlug}`} passHref>
      {" "}
      {/* Add Link wrapper */}
      <div
        className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        {/* Image Container with Action Buttons */}
        <div className="aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden relative">
          <Image
            src={image}
            alt={name}
            fill
            className="w-full h-full object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          {/* Desktop Hover Actions */}
          <div
            className={`hidden md:flex absolute right-2 top-2 flex-col gap-2 transition-all duration-300 ${
              isHovered ? "translate-x-0" : "translate-x-12"
            }`}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsWishlisted(!isWishlisted);
              }}
              className={`p-2 rounded-full shadow-md ${
                isWishlisted
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-700"
              } transition-colors`}
              aria-label={
                isWishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
            >
              <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsInCart(!isInCart);
              }}
              className={`p-2 rounded-full shadow-md ${
                isInCart ? "bg-green-500 text-white" : "bg-white text-gray-700"
              } transition-colors`}
              aria-label={isInCart ? "Remove from cart" : "Add to cart"}
            >
              <ShoppingCart size={16} />
            </button>
          </div>
        </div>

        {/* Mobile Actions (Always visible) */}
        <div className="md:hidden flex justify-between mb-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsWishlisted(!isWishlisted);
            }}
            className={`p-1 rounded-full ${
              isWishlisted ? "text-red-500" : "text-gray-400"
            } transition-colors`}
            aria-label={
              isWishlisted ? "Remove from wishlist" : "Add to wishlist"
            }
          >
            <Heart size={16} fill={isWishlisted ? "currentColor" : "none"} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsInCart(!isInCart);
            }}
            className={`p-1 rounded-full ${
              isInCart ? "text-green-500" : "text-gray-400"
            } transition-colors`}
            aria-label={isInCart ? "Remove from cart" : "Add to cart"}
          >
            <ShoppingCart size={16} />
          </button>
        </div>

        {/* Product Info */}
        <div className="flex items-center space-x-1">
          <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
            {name}
          </h3>
          <span className="text-xl text-gray-900">-</span>
          {unit && <p className="text-sm text-gray-500">{unit}</p>}
        </div>

        <div className="mb-1">
          <StarRating rating={rating ?? 0} showNumber={false} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-orange-600 text-sm">
              <PriceFormatter amount={price} />
            </span>
            {/* {originalPrice && (
              <span className="text-xs text-gray-400 line-through">
                <PriceFormatter amount={originalPrice} />
              </span>
            )} */}
          </div>
          <Button
            size="sm"
            className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white text-xs h-6"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsInCart(true);
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </Link>
  );
}
