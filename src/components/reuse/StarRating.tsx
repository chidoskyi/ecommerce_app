"use client";

import { StarRatingProps } from "@/types/reviews";
import { Star, StarHalf } from "lucide-react";



export const StarRating = ({
  rating = 0,
  maxStars = 5,
  starSize = 14,
  activeColor = "text-orange-400 fill-orange-400",
  inactiveColor = "text-gray-300",
  className = "",
  showNumber = false
}: StarRatingProps) => {
  // Ensure rating is within bounds
  const clampedRating = Math.min(Math.max(rating, 0), maxStars);
  const fullStars = Math.floor(clampedRating);
  const hasHalfStar = clampedRating % 1 >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);
  
  // Format to always show one decimal place
  const formattedRating = clampedRating.toFixed(1);

  return (
    <div className={`flex items-center ${className}`}>
      {/* Optional numeric rating display */}
      {showNumber && (
        <span className="text-2xl font-bold text-gray-900 mr-2">
          {formattedRating}
        </span>
      )}
      
      {/* Stars display */}
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full-${i}`} size={starSize} className={activeColor} />
      ))}
      
      {hasHalfStar && (
        <StarHalf key="half" size={starSize} className={activeColor} />
      )}
      
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={starSize} className={inactiveColor} />
      ))}
    </div>
  );
};