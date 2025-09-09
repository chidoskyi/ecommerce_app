// Fixed ProductImageGallery component with proper add to cart logic

"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Truck,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  Heart,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StarRating } from "./StarRating";
import { PriceFormatter } from "./FormatCurrency";
import { ProductImageGalleryProps, ProductOption } from "@/types/products";
import {
  addItemToCart,
  selectCartLoading,
  // selectItemQuantity,
  // openCart,
} from "@/app/store/slices/cartSlice";
import {
  toggleItem,
  selectIsInWishlist,
  selectWishlistLoading,
} from "@/app/store/slices/wishlistSlice";
import { StorageUtil } from "@/lib/storageKeys";
import ShareButton from "./ShareButon";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
// import { Review } from "@/types/reviews";

const ProductImageGallery = ({ product }: ProductImageGalleryProps) => {
  const dispatch = useAppDispatch();
  const [activeImage, setActiveImage] = useState(0);
  const [isWishlistUpdating, setIsWishlistUpdating] = useState(false);
  const isInWishlist = useAppSelector(selectIsInWishlist(product.id));
  const [quantity, setQuantity] = useState(1);
  const [showQuantity, setShowQuantity] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const cartLoading = useAppSelector(selectCartLoading);

  // localStorage utilities
  const userId = StorageUtil.getUserId();
  const guestId = StorageUtil.getGuestId();
  const isWishlistLoading = useAppSelector(selectWishlistLoading);
  // const toggleCart = useAppSelector(openCart);

  // Get product images - prefer API data over hardcoded
  const getProductImages = (): string[] => {
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images;
    }
    if (typeof product.images === "string" && product.images.length > 0) {
      return [product.images];
    }
    return ["/placeholder.svg"];
  };

  const productImages = getProductImages();

  // FIXED: Get product options based on pricing type
  const getProductOptions = (): ProductOption[] => {
    // If product has fixed price, return single option
    if (product.hasFixedPrice) {
      return [
        {
          id: "fixed-price",
          weight: product.weight || "Standard",
          price: product.fixedPrice,
          image: product.images?.[0] || "/placeholder.svg",
          unitPrice: {
            unit: product.weight || "Standard",
            price: product.fixedPrice,
          },
          fixedPrice: product.fixedPrice,
        },
      ];
    }

    // If product has unit prices, create options from unitPrices
    if (
      product.unitPrices &&
      Array.isArray(product.unitPrices) &&
      product.unitPrices.length > 0
    ) {
      return product.unitPrices.map((unitPrice, index) => ({
        id: `option-${index}`,
        weight: unitPrice.unit,
        price: unitPrice.price,
        image:
          product.images?.[index] || product.images?.[0] || "/placeholder.svg",
        unitPrice: unitPrice,
        fixedPrice: 0,
      }));
    }

    // Fallback: create single option with display price or 0
    return [
      {
        id: "default",
        weight: product.weight || "Standard",
        price: product.displayPrice || 0,
        image: product.images?.[0] || "/placeholder.svg",
        unitPrice: {
          unit: product.weight || "Standard",
          price: product.displayPrice || 0,
        },
        fixedPrice: product.displayPrice || 0,
      },
    ];
  };

  const productOptions = getProductOptions();
  const [selectedOption, setSelectedOption] = useState<string | null>(
    productOptions?.[0]?.id || null
  );

  // Calculate when needed
// const calculateAverageRating = (reviews: Review[]) => {
//   if (!reviews || reviews.length === 0) return 0;
//   return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
// };

  // FIXED: Get current price based on product pricing type
  const getCurrentPrice = () => {
    if (product.hasFixedPrice) {
      return product.fixedPrice;
    }

    const selectedOptionData = productOptions.find(
      (opt) => opt.id === selectedOption
    );
    if (selectedOptionData) {
      return selectedOptionData.price;
    }

    // Fallback to first unit price or display price
    if (product.unitPrices && product.unitPrices.length > 0) {
      return product.unitPrices[0].price;
    }

    return product.displayPrice || 0;
  };

  const currentPrice = getCurrentPrice();

  // Get selected option details
  const selectedOptionData = productOptions.find(
    (opt) => opt.id === selectedOption
  );

  // Preload images for better performance
  useEffect(() => {
    const imagePromises = productImages.map((src) => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = resolve;
        img.onerror = resolve; // Still resolve on error to continue
        img.src = src;
      });
    });

    Promise.all(imagePromises).then(() => {
      setImagesLoaded(true);
    });
  }, [productImages]);

  // Reset zoom when changing images
  useEffect(() => {
    setIsZoomed(false);
  }, [activeImage]);

  const handlePrevImage = () => {
    setActiveImage((prev) =>
      prev === 0 ? productImages.length - 1 : prev - 1
    );
    setIsZoomed(false);
  };

  const handleNextImage = () => {
    setActiveImage((prev) =>
      prev === productImages.length - 1 ? 0 : prev + 1
    );
    setIsZoomed(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;

    const { left, top, width, height } =
      imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setZoomPosition({ x, y });
  };

  const handleMouseEnter = () => {
    setIsZoomed(true);
  };

  const handleMouseLeave = () => {
    setIsZoomed(false);
  };

  const handleThumbnailClick = (index: number) => {
    setActiveImage(index);
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () =>
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  // FIXED: Proper add to cart handler with user validation
  const handleAddToCart = () => {
    // Check if user is logged in or has guest session
    if (!userId && !guestId) {
      alert("Please log in or create a guest session to add items to cart");
      return;
    }

    // For fixed price products or when no options are available, show quantity selector
    if (product.hasFixedPrice || !selectedOptionData) {
      setShowQuantity(true);
      return;
    }

    // For variable pricing, ensure an option is selected
    if (!product.hasFixedPrice && !selectedOption) {
      alert("Please select an option before adding to cart");
      return;
    }

    setShowQuantity(true);
  };

  // Proper cart dispatch handler matching ProductCard structure
  const handleAddToCartConfirm = async () => {
    try {
      // Check if user is logged in or has guest session before proceeding
      if (!userId && !guestId) {
        console.error("User ID or Guest ID is required to add items to cart");
        alert("Please log in or create a guest session to add items to cart");
        return;
      }

      // Create product object for cart (matching ProductCard structure)
      const productForCart = {
        id: product.id,
        name: product.name,
        hasFixedPrice: product.hasFixedPrice,
        slug: product.slug,
        fixedPrice: product.fixedPrice,
        unitPrices: product.unitPrices,
        images: productImages,
        rating: product.rating || product.averageRating,
        priceType: product.hasFixedPrice ? "fixed" : "variable",
      };

      // Prepare selectedUnit for variable pricing
      let selectedUnitForCart = null;
      if (!product.hasFixedPrice && selectedOptionData) {
        selectedUnitForCart = {
          unit: selectedOptionData.weight,
          price: selectedOptionData.price,
        };
      }

      // Dispatch to cart with same structure as ProductCard
      await dispatch(
        addItemToCart({
          product: productForCart,
          quantity,
          selectedUnit: selectedUnitForCart,
          userId: userId,
          guestId: guestId,
        })
      ).unwrap();

      console.log("Added to cart:", {
        productId: product.id,
        name: product.name,
        quantity,
        price: currentPrice,
        unit: product.hasFixedPrice ? null : selectedOptionData?.weight,
        total: currentPrice * quantity,
        userId: userId,
        guestId: guestId,
      });

      // Reset quantity and hide quantity selector
      setQuantity(1);
      setShowQuantity(false);
    } catch (error) {
      console.error("Error adding item to cart:", error);
      alert("Failed to add item to cart. Please try again.");
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlistUpdating) return; // Prevent double clicks

    try {
      setIsWishlistUpdating(true);
      await dispatch(toggleItem(product.id)).unwrap();
      console.log(
        `${isInWishlist ? "Removed from" : "Added to"} wishlist:`,
        name
      );
    } catch (error) {
      console.error("Failed to update wishlist:", error);
      // You could add a toast notification here
    } finally {
      setIsWishlistUpdating(false);
    }
  };

  return (
    <div className="py-4 grid grid-cols-1 md:grid-cols-6 lg:grid-cols-8 gap-4 md:gap-8 bg-white my-6 p-3 h-full">
      {/* Product Image Gallery */}
      <div className="col-span-3">
        <div className="flex flex-col gap-4 h-full">
          {/* Main Image Container */}
          <div className="relative mb-5 border">
            {/* Loading state */}
            {!imagesLoaded && (
              <div className="flex items-center justify-center bg-gray-100 rounded-lg h-[500px]">
                <div className="animate-pulse flex space-x-4">
                  <div className="rounded-lg bg-gray-300 h-96 w-96"></div>
                </div>
              </div>
            )}

            {/* Main image container */}
            {imagesLoaded && (
              <div
                ref={imageContainerRef}
                className={cn(
                  "relative overflow-hidden w-full h-[500px]",
                  "cursor-zoom-in"
                )}
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                  backgroundImage: isZoomed
                    ? `url(${productImages[activeImage] || "/placeholder.svg"})`
                    : "none",
                  backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  backgroundSize: isZoomed ? "250%" : "contain",
                  backgroundRepeat: "no-repeat",
                }}
              >
                {!isZoomed && (
                  <Image
                    src={productImages[activeImage] || "/placeholder.svg"}
                    alt={`${product.name} - Image ${activeImage + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={activeImage === 0}
                  />
                )}

                {/* Zoom indicator */}
                {!isZoomed && (
                  <div className="absolute bottom-4 right-4 bg-white/80 p-2 rounded-full shadow-md">
                    <ZoomIn size={20} />
                  </div>
                )}
              </div>
            )}

            {/* Navigation arrows - only show if multiple images */}
            {productImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute md:left-2 -left-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center cursor-pointer z-10 hover:bg-gray-100 transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center cursor-pointer z-10 hover:bg-gray-100 transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Image counter */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm z-10">
                  {activeImage + 1} / {productImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="col-span-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {product.name}
          </h1>
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex">
              <StarRating
                rating={product.averageRating || 0}
                showNumber={true}
              />
            </div>
            <span className="text-sm text-gray-500">
              {product.reviewCount || 0} ratings
            </span>
          </div>

          {/* Product Status Indicators */}
          <div className="flex items-center flex-wrap gap-2 mb-2">
            {product.isFeatured && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                Featured
              </span>
            )}
            {product.isTrending && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                Trending
              </span>
            )}
            {product.isDealOfTheDay && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                Deal of the Day
              </span>
            )}
            {product.isNewArrival && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                New Arrival
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex border items-center gap-2 py-1 px-2">
              <span className="text-lg text-green-600 font-medium">
                Freshness Guarantee
              </span>
              <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            </div>
          </div>

          {/* Current Price Display */}
          <div className="mt-4 mb-4">
            <div className="text-3xl font-bold text-green-600">
              <PriceFormatter amount={currentPrice} />
            </div>
            {/* Show pricing type info */}
            <div className="text-sm text-gray-600 mt-1">
              {product.hasFixedPrice ? (
                <span>Fixed Price</span>
              ) : (
                selectedOptionData && (
                  <span>Price for {selectedOptionData.weight}</span>
                )
              )}
            </div>
            {/* Show price range for variable pricing */}
            {!product.hasFixedPrice && product.priceRange && (
              <div className="text-sm text-gray-500">
                Range: <PriceFormatter amount={product.priceRange.min} /> -{" "}
                <PriceFormatter amount={product.priceRange.max} />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 bg-border bg-gray-300 h-[1px] w-full mt-6 mb-6"></div>

        {/* Variation */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {product.category?.name
              ? `${product.category.name} - Grade A`
              : "Variation: Grade A"}
          </h3>

          {/* Product Images as Thumbnails */}
          {productImages.length && (
            <div className="mb-6">
              <div className="flex flex-row gap-2">
                {productImages.map((thumb, index) => (
                  <div
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`w-[70px] h-[70px] p-0.5 cursor-pointer rounded-md ${
                      activeImage === index
                        ? "border-2 border-orange-600"
                        : "border border-gray-300 hover:border-orange-600"
                    }`}
                  >
                    <Image
                      width={65}
                      height={65}
                      src={thumb || "/placeholder.svg"}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 bg-border bg-gray-300 h-[1px] w-full mt-6 mb-6"></div>

        {/* Pricing Options - Only show for variable pricing */}
        {!product.hasFixedPrice && productOptions.length > 1 && (
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-[10px]">
              <p className="font-semibold text-lg">Select Option</p>
              <p className="text-[#B54708] text-xs font-semibold bg-[#FFFAEB] py-1 px-2 rounded-[16px] flex items-center">
                Required
              </p>
            </div>

            <div
              role="radiogroup"
              aria-required="false"
              className="grid gap-2 max-h-[10rem] overflow-y-auto"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
              tabIndex={0}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {productOptions.map((option) => (
                <div key={option.id}>
                  <div className="flex items-center justify-between pr-4">
                    <label
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-4"
                      htmlFor={option.id}
                    >
                      <Image
                        alt={option.weight}
                        width={65}
                        height={65}
                        className="size-[70px] rounded-[5px] border-[0.31px] border-[#81a6e2]"
                        src={option.image}
                      />
                      <div className="flex flex-col gap-[4px]">
                        <p className="font-bold">{option.weight}</p>
                        <p>
                          <PriceFormatter amount={option.price} />
                        </p>
                      </div>
                    </label>

                    <label
                      htmlFor={option.id}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="product-option"
                        id={option.id}
                        value={option.id}
                        checked={selectedOption === option.id}
                        onChange={() => setSelectedOption(option.id)}
                        className="sr-only"
                      />
                      <div
                        className={`aspect-square h-4 w-4 rounded-full border ${
                          selectedOption === option.id
                            ? "border-orange-600 ring-2 ring-orange-600"
                            : "border-gray-300"
                        } bg-white flex items-center justify-center shadow`}
                      >
                        {selectedOption === option.id && (
                          <div className="h-2.5 w-2.5 rounded-full bg-orange-600" />
                        )}
                      </div>
                    </label>
                  </div>
                  <div className="shrink-0 bg-border bg-gray-300 h-[1px] w-full my-2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fixed Price Display (when only fixed pricing) */}
        {product.hasFixedPrice && (
          <div className="mb-6">
            <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <Image
                alt={product.weight || "Product"}
                width={65}
                height={65}
                className="size-[70px] rounded-[5px]"
                src={productImages[0] || "/placeholder.svg"}
              />
              <div className="flex flex-col gap-1">
                <p className="font-bold">{product.weight || "Standard"}</p>
                <p className="text-lg font-semibold text-green-600">
                  <PriceFormatter amount={product.fixedPrice} />
                </p>
                <p className="text-sm text-gray-500">Fixed Price</p>
              </div>
            </div>
          </div>
        )}

        {/* Single Variable Option Display (when only one unit price) */}
        {!product.hasFixedPrice && productOptions.length === 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <Image
                alt={productOptions[0].weight}
                width={65}
                height={65}
                className="size-[70px] rounded-[5px]"
                src={productOptions[0].image}
              />
              <div className="flex flex-col gap-1">
                <p className="font-bold">
                  <span>weight</span>-{productOptions[0].weight}
                </p>
                <p className="text-lg font-semibold text-green-600">
                  <PriceFormatter amount={productOptions[0].price} />
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Info & Actions */}
      <div className="col-span-1 md:col-span-6 lg:col-span-2 border border-gray-400 p-4 w-full h-fit bg-white">
        {/* Current Selection Summary */}
        {selectedOptionData && (
          <div className="mb-4 p-3 rounded-lg bg-orange-50">
            <h4 className="font-semibold text-gray-900 mb-2">Selected:</h4>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">
                {selectedOptionData.weight}
              </span>
              <span className="font-bold text-green-600">
                <PriceFormatter amount={selectedOptionData.price} />
              </span>
            </div>
            {product.hasFixedPrice && (
              <span className="text-xs text-gray-500 mt-1 block">
                Fixed Price
              </span>
            )}
          </div>
        )}

        {/* Delivery Info */}
        <div className="flex items-start space-x-3 mb-4">
          <div>
            <div className="flex text-[13px] mb-1 gap-2">
              <Truck className="text-gray-700" size={20} />
              <div className="font-semibold text-gray-900 text-[15px]">
                Fast Delivery
              </div>
            </div>
            <div className="text-gray-600 text-[0.85rem]">
              Get your order at your doorstep in 3 hours or less.
            </div>
          </div>
        </div>
        <div className="flex flex-col items-start space-x-3">
          <div className="flex text-[13px] mb-1 gap-2">
            <ShieldCheck className="text-gray-700 mt-1" size={20} />
            <div>
              <div className="font-semibold text-gray-900 text-[15px]">
                Security & Privacy
              </div>
            </div>
          </div>
          <div className="text-gray-600 text-[0.85rem]">
            Safe payments. We do not share your personal details with any third
            parties without your consent.
          </div>
        </div>

        <div className="shrink-0 bg-border bg-gray-300 h-[1px] w-full mt-4 mb-2"></div>

        {/* Quantity Section */}
        {showQuantity && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Quantity</h3>
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={decrementQuantity}
                className={`p-2 text-gray-500 hover:text-gray-700 ${
                  quantity <= 1
                    ? "cursor-not-allowed pointer-events-none opacity-50"
                    : "cursor-pointer"
                }`}
                disabled={quantity <= 1}
              >
                <Trash2 size={20} />
              </button>

              {quantity > 1 && (
                <button
                  onClick={decrementQuantity}
                  className="cursor-pointer w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center hover:bg-orange-700"
                >
                  <Minus size={16} />
                </button>
              )}

              <span className="text-lg font-medium min-w-[2rem] text-center">
                {quantity}
              </span>

              <button
                onClick={incrementQuantity}
                className="cursor-pointer w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center hover:bg-orange-700"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Total Price */}
            <div className="mb-4 p-3 rounded-lg bg-green-50">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold text-green-600">
                  <PriceFormatter amount={currentPrice * quantity} />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!showQuantity ? (
            <button
              onClick={handleAddToCart}
              disabled={
                product.quantity === 0 ||
                (!product.hasFixedPrice && !selectedOption) ||
                (!userId && !guestId)
              }
              className={`cursor-pointer w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                product.quantity === 0 ||
                (!product.hasFixedPrice && !selectedOption) ||
                (!userId && !guestId)
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-100"
              }`}
            >
              {product.quantity === 0
                ? "Out of Stock"
                : !product.hasFixedPrice && !selectedOption
                ? "Select Option First"
                : !userId && !guestId
                ? "Login Required"
                : "Add to Cart"}
            </button>
          ) : (
            <>
              <button
                onClick={handleAddToCartConfirm}
                disabled={
                  product.quantity === 0 || cartLoading || (!userId && !guestId)
                }
                className={`cursor-pointer w-full py-3 px-6 font-semibold rounded-lg transition-colors ${
                  product.quantity === 0 || cartLoading || (!userId && !guestId)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                }`}
              >
                {cartLoading
                  ? "Adding..."
                  : product.quantity === 0
                  ? "Out of Stock"
                  : !userId && !guestId
                  ? "Login Required"
                  : "Confirm Add to Cart"}
              </button>
              <button className="cursor-pointer w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                View Cart
              </button>
            </>
          )}
          <div className="flex space-x-2">
            <ShareButton />
            <button
              onClick={handleWishlistToggle}
              disabled={isWishlistLoading}
              className={`cursor-pointer text-sm flex items-center space-x-2 px-4 py-2 font-semibold rounded-lg flex-1 justify-center transition-colors ${
                isInWishlist
                  ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                  : "bg-orange-50 text-orange-600 hover:bg-orange-100"
              } ${isWishlistLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isWishlistLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Heart
                  size={20}
                  className={isInWishlist ? "fill-orange-600" : ""}
                />
              )}
              <span>
                {isWishlistLoading
                  ? "Updating..."
                  : isInWishlist
                  ? "In Wishlist"
                  : "Wishlist"}
              </span>
            </button>
          </div>
        </div>

        {/* Product Meta Information */}
        {(product.sku || product.category || product.status) && (
          <>
            <div className="shrink-0 bg-border bg-gray-300 h-[1px] w-full mt-6 mb-4"></div>
            <div className="space-y-2 text-sm">
              {product.sku && (
                <div className="flex justify-between">
                  <span className="text-gray-600">SKU:</span>
                  <span className="font-medium">{product.sku}</span>
                </div>
              )}
              {product.category?.name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{product.category.name}</span>
                </div>
              )}
              {product.status && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${
                      product.status === "ACTIVE"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {product.status}
                  </span>
                </div>
              )}
              {/* Show pricing type */}
              <div className="flex justify-between">
                <span className="text-gray-600">Pricing:</span>
                <span className="font-medium">
                  {product.hasFixedPrice ? "Fixed" : "Variable"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProductImageGallery;
