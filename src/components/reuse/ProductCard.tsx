"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PriceFormatter } from "./FormatCurrency";
import { ProductCardProps, UnitPrice } from "@/types/products";
import { StorageUtil } from "@/lib/storageKeys";
import {
  toggleItem,
  selectIsInWishlist,
} from "@/app/store/slices/wishlistSlice";
import {
  addItemToCart,
  selectCartLoading,
  selectItemQuantity,
  openCart,
} from "@/app/store/slices/cartSlice";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";

export default function ProductCard({
  id,
  name,
  hasFixedPrice,
  slug,
  fixedPrice,
  unitPrices,
  images,
  rating = undefined,
  onRemove,
  isRemoving,
}: ProductCardProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  // Redux state
  const isInWishlist = useAppSelector(selectIsInWishlist(id));
  const cartLoading = useAppSelector(selectCartLoading);
  const itemQuantityInCart = useAppSelector(selectItemQuantity(id));

  // Local state
  const [isHovered, setIsHovered] = useState(false);
  const [showQuantity, setShowQuantity] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<UnitPrice | null>(null);
  const [isWishlistUpdating, setIsWishlistUpdating] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Ref for quantity selection container
  const quantityRef = useRef<HTMLDivElement>(null);

  // Get user/guest IDs
  const userId = StorageUtil.getUserId();
  const guestId = StorageUtil.getGuestId();

  // Initialize selected unit when quantity section opens
  useEffect(() => {
    if (showQuantity && !hasFixedPrice && unitPrices && unitPrices.length > 0 && !selectedUnit) {
      setSelectedUnit(unitPrices[0]);
    }
  }, [showQuantity, hasFixedPrice, unitPrices, selectedUnit]);

  // Handle click outside to close quantity selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showQuantity &&
        quantityRef.current &&
        !quantityRef.current.contains(event.target as Node)
      ) {
        // Close the quantity selection like clicking cancel
        handleCancel();
      }
    };

    if (showQuantity) {
      // Add event listener with a slight delay to prevent immediate closing
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showQuantity]);

  // Close quantity selection when component unmounts or showQuantity changes
  useEffect(() => {
    return () => {
      if (showQuantity) {
        setShowQuantity(false);
        setQuantity(1);
        setSelectedUnit(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get display price for card
  const getCardDisplayPrice = () => {
    if (hasFixedPrice && fixedPrice > 0) return fixedPrice;
    if (unitPrices && unitPrices.length > 0) return unitPrices[0].price;
    return 0;
  };

  // Get current price for quantity calculation
  const getCurrentPrice = () => {
    if (hasFixedPrice) return fixedPrice || 0;
    return selectedUnit?.price || 0;
  };

  const displayPrice = getCardDisplayPrice();
  const currentPrice = getCurrentPrice();

  // FIXED: Use router.push for navigation instead of Link wrapper
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest(".quantity-section") ||
      target.closest("input") ||
      target.closest("label") ||
      showQuantity // Don't navigate when quantity section is open
    ) {
      e.preventDefault();
      return;
    }

    // Navigate programmatically
    router.push(`/products/${slug}`);
  };

  // Handle wishlist toggle
  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlistUpdating) return;

    try {
      setIsWishlistUpdating(true);
      await dispatch(toggleItem(id)).unwrap();
    } catch (error) {
      console.error("Failed to update wishlist:", error);
    } finally {
      setIsWishlistUpdating(false);
    }
  };

  // Handle add to cart
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId && !guestId) {
      console.warn("User must be logged in or have a guest session to add items to cart");
      return;
    }
    
    setShowQuantity(true);
    setQuantity(1);
  };

  const handleConfirmAdd = async () => {
    if (isAddingToCart || (!userId && !guestId)) return;

    try {
      setIsAddingToCart(true);
      
      const productForCart = {
        id,
        name,
        hasFixedPrice,
        slug,
        fixedPrice,
        unitPrices,
        images,
        rating,
        priceType: hasFixedPrice ? 'fixed' : 'variable',
      };

      await dispatch(addItemToCart({ 
        product: productForCart, 
        quantity,
        selectedUnit: hasFixedPrice ? null : selectedUnit,
        userId: userId,
        guestId: guestId
      })).unwrap();

      setShowQuantity(false);
      setQuantity(1);
      setSelectedUnit(null);
      
      dispatch(openCart());
      
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleCancel = () => {
    setShowQuantity(false);
    setQuantity(1);
    setSelectedUnit(null);
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);

  const handleRemoveFromWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.();
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:shadow-md transition-all relative overflow-hidden cursor-pointer ${
        showQuantity ? "h-auto" : "h-[380px] flex flex-col"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Image Container with Action Buttons */}
      <div className={`aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden relative ${showQuantity ? "" : "flex-shrink-0"}`}>
        <Image
          src={images?.[0] || "/placeholder.svg?height=200&width=200"}
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
          {/* Wishlist/Remove button */}
          {onRemove ? (
            <button
              onClick={handleRemoveFromWishlist}
              disabled={isRemoving}
              className="p-2 rounded-full shadow-md bg-red-500 text-white hover:bg-red-600 transition-colors"
              aria-label="Remove from wishlist"
            >
              <Trash2 size={16} />
            </button>
          ) : (
            <button
              onClick={handleWishlistToggle}
              disabled={isWishlistUpdating}
              className={`p-2 rounded-full shadow-md transition-colors ${
                isInWishlist ? "bg-red-500 text-white" : "bg-white text-gray-700"
              } ${isWishlistUpdating ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
              aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <Heart
                size={16}
                fill={isInWishlist ? "currentColor" : "none"}
                className={isWishlistUpdating ? "animate-pulse" : ""}
              />
            </button>
          )}
          
          {/* Cart button */}
          <button
            onClick={handleAddToCart}
            disabled={cartLoading || isAddingToCart || (!userId && !guestId)}
            className={`p-2 rounded-full shadow-md transition-colors relative ${
              (!userId && !guestId) 
                ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                : "bg-white text-gray-700 hover:bg-gray-50"
            } ${(cartLoading || isAddingToCart) ? "opacity-50 cursor-not-allowed" : ""}`}
            aria-label={(!userId && !guestId) ? "Login to add to cart" : "Add to cart"}
          >
            <ShoppingCart 
              size={16} 
              className={(cartLoading || isAddingToCart) ? "animate-pulse" : ""}
            />
            {itemQuantityInCart > 0 && (userId || guestId) && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {itemQuantityInCart}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Action Buttons */}
      <div className={`md:hidden flex justify-between mb-3 ${showQuantity ? "" : "flex-shrink-0"}`}>
        {onRemove ? (
          <button
            onClick={handleRemoveFromWishlist}
            disabled={isRemoving}
            className="p-1 rounded-full text-red-500 transition-colors"
            aria-label="Remove from wishlist"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <button
            onClick={handleWishlistToggle}
            disabled={isWishlistUpdating}
            className={`p-1 rounded-full transition-colors ${
              isInWishlist ? "text-red-500" : "text-gray-400"
            } ${isWishlistUpdating ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
            aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              size={16}
              fill={isInWishlist ? "currentColor" : "none"}
              className={isWishlistUpdating ? "animate-pulse" : ""}
            />
          </button>
        )}
        
        <button
          onClick={handleAddToCart}
          disabled={cartLoading || isAddingToCart || (!userId && !guestId)}
          className={`p-1 rounded-full transition-colors relative ${
            (!userId && !guestId) ? "text-gray-400 cursor-not-allowed" : "text-gray-400"
          } ${(cartLoading || isAddingToCart) ? "opacity-50 cursor-not-allowed" : ""}`}
          aria-label={(!userId && !guestId) ? "Login to add to cart" : "Add to cart"}
        >
          <ShoppingCart 
            size={16} 
            className={(cartLoading || isAddingToCart) ? "animate-pulse" : ""}
          />
          {itemQuantityInCart > 0 && (userId || guestId) && (
            <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {itemQuantityInCart}
            </span>
          )}
        </button>
      </div>

      {/* Scrollable Content Area - Takes remaining space */}
      <div className={showQuantity ? "" : "flex-1 flex flex-col min-h-0"}>
        {/* Product Info */}
        <h3 className={`font-medium text-gray-900 mb-1 text-sm line-clamp-2 ${showQuantity ? "" : "flex-shrink-0"}`}>
          {name}
        </h3>

        {/* Show unit info for variable pricing */}
        {!hasFixedPrice && unitPrices && unitPrices.length > 0 && !showQuantity && (
          <p className="text-xs text-gray-500 mb-2 flex-shrink-0">
            From {unitPrices[0].unit}
          </p>
        )}

        {/* Default Price Display (when not showing quantity) */}
        {!showQuantity && (
          <div className="flex items-center justify-between mt-auto flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-orange-600 text-sm">
                <PriceFormatter amount={displayPrice} />
              </span>
            </div>
            <Button
              size="sm"
              className={`text-white text-xs h-6 transition-colors cursor-pointer ${
                (!userId && !guestId) 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-orange-500 hover:bg-orange-600"
              } ${(cartLoading || isAddingToCart) ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleAddToCart}
              disabled={cartLoading || isAddingToCart || (!userId && !guestId)}
            >
              {(!userId && !guestId) ? "Login" : "Add"}
            </Button>
          </div>
        )}

        {/* Quantity Selection Section - Scrollable */}
        {showQuantity && (
          <div 
            ref={quantityRef}
            className="quantity-section border-t pt-4 mt-3"
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
          >
            <div className="space-y-4">
              {/* Unit Selection (for variable pricing) */}
              {!hasFixedPrice && unitPrices && unitPrices.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Select Unit:</h4>
                  <div className="space-y-1">
                    {unitPrices.map((unit, index) => (
                      <label
                        key={index}
                        className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors text-sm ${
                          selectedUnit?.unit === unit.unit
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-orange-300"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`unit-selection-${id}`}
                            value={unit.unit}
                            checked={selectedUnit?.unit === unit.unit}
                            onChange={() => setSelectedUnit(unit)}
                            className="text-orange-500 w-3 h-3"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs">{unit.unit}</span>
                        </div>
                        <span className="font-bold text-orange-600 text-xs">
                          <PriceFormatter amount={unit.price} />
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Fixed Price Display */}
              {hasFixedPrice && (
                <div>
                  <div className="p-2 border border-gray-200 rounded bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Price:</span>
                      <span className="text-sm font-bold text-orange-600">
                        <PriceFormatter amount={fixedPrice || 0} />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity Controls */}
              <div>
                <h4 className="text-sm font-medium mb-2">Quantity:</h4>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      decrementQuantity();
                    }}
                    className={`p-1 text-gray-500 hover:text-gray-700 ${
                      quantity <= 1 ? "cursor-not-allowed pointer-events-none opacity-50" : ""
                    }`}
                    disabled={quantity <= 1}
                  >
                    <Trash2 size={14} />
                  </button>

                  {quantity > 1 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        decrementQuantity();
                      }}
                      className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center hover:bg-orange-700"
                    >
                      <Minus size={12} />
                    </button>
                  )}

                  <span className="text-sm font-medium min-w-[2rem] text-center bg-gray-100 px-2 py-1 rounded">
                    {quantity}
                  </span>

                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      incrementQuantity();
                    }}
                    className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center hover:bg-orange-700"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>

              {/* Total Price */}
              <div className="p-2 rounded bg-green-50">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">Total:</span>
                    {!hasFixedPrice && selectedUnit && (
                      <div className="text-xs text-gray-600">
                        {quantity} × {selectedUnit.unit}
                      </div>
                    )}
                    {hasFixedPrice && (
                      <div className="text-xs text-gray-600">
                        {quantity} items
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    <PriceFormatter amount={currentPrice * quantity} />
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancel();
                }}
                className="flex-1 text-xs h-7 hover:bg-gray-200 cursor-pointer"
                disabled={isAddingToCart}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleConfirmAdd();
                }}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-xs h-7 text-white cursor-pointer"
                disabled={(!hasFixedPrice && !selectedUnit) || isAddingToCart}
              >
                {isAddingToCart ? "Adding..." : "Add to Cart"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}