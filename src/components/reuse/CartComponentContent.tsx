"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Container from "@/components/reuse/Container";
import ProductCard from "@/components/reuse/ProductCard";
import Link from "next/link";
import Image from "next/image";
import { ensureUserIdentification } from "@/utils/userIdentification";
import {
  updateCartQuantity,
  selectUserIdentification,
  clearEntireCart,
} from "@/app/store/slices/cartSlice";
import { StorageUtil } from "@/lib/storageKeys";
import { useUser } from "@clerk/nextjs";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { getItemPrice, getUnitDisplay } from "@/utils/priceHelpers";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { CartItem } from "@/types/carts";
import {
  useProductSelectors,
  useProducts,
} from "@/app/store/slices/productSlice";
import { Product, UnitPrice } from "@/types/products";
import Breadcrumb from "@/components/reuse/Breadcrumb";

// This should be moved to a separate component file
export function CartComponentContent() {
  const dispatch = useAppDispatch();
  const { user: clerkUser, isSignedIn } = useUser();

  // Cart state from Redux
  const cart = useAppSelector((state) => state.cart);
  const userIdentification = useAppSelector(selectUserIdentification);

  // Product store integration
  const {
    products,
    loading: productsLoading,
    error: productsError,
  } = useProductSelectors();
  const { actions } = useProducts();
  const { fetchProducts } = actions;

  // Memoize cartItems to prevent new array creation on every render
  const cartItems = useMemo(() => cart.items || [], [cart.items]);

  // Extract other cart data from Redux store
  const totalCartItems = cart.itemCount || 0;
  const cartSubtotal = cart.subtotal || 0;
  const isCartLoading = cart.loading || false;

  // Categories hook
  // const { categories, status } = useCategories();
  const [cartCleared, setCartCleared] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // Fetch products on component mount if not already loaded
  useEffect(() => {
    if (products.length === 0 && !productsLoading && !productsError) {
      fetchProducts();
    }
  }, [products.length, productsLoading, productsError, fetchProducts]);

  // Memoize cart category IDs to prevent unnecessary recalculations
  const cartCategoryIds = useMemo(() => {
    if (cartItems.length === 0) return [];

    return [
      ...new Set(
        cartItems
          .map((item: CartItem) => item.product?.categoryId)
          .filter(Boolean)
      ),
    ];
  }, [cartItems]);

  // Memoize cart product IDs
  const cartProductIds = useMemo(() => {
    return new Set(
      cartItems
        .map((item: CartItem) => item.productId || item.product?.id || item.id)
        .filter(Boolean)
    );
  }, [cartItems]);

  // Extract complex expressions to separate variables for dependency tracking
  const cartCategoryIdsKey = cartCategoryIds.join(",");
  // const cartProductIdsKey = Array.from(cartProductIds).join(",");

  // Memoize filtered products to avoid recalculating on every render
  const relatedProducts = useMemo(() => {
    if (
      cartItems.length === 0 ||
      products.length === 0 ||
      cartCategoryIds.length === 0
    ) {
      return [];
    }

    return products.filter((product) => {
      // Exclude products already in cart
      if (cartProductIds.has(product.id)) {
        return false;
      }
      // Include products from same categories
      return cartCategoryIds.includes(product.categoryId);
    });
  }, [
    cartItems.length,
    products,
    cartCategoryIds,
    cartProductIds,
  ]);

  // Extract the length to a separate variable for cleaner dependency
  const relatedProductsLength = relatedProducts.length;

  // Update recommended products when related products change
  useEffect(() => {
    if (relatedProducts.length > 0) {
      // Shuffle and limit to 7 recommended products
      const shuffledProducts = [...relatedProducts]
        .sort(() => Math.random() - 0.5)
        .slice(0, 7);

      setRecommendedProducts(shuffledProducts);
    } else {
      setRecommendedProducts([]);
    }
  }, [relatedProducts, relatedProductsLength, cartCategoryIdsKey]);

  const clearCart = async () => {
    if (cartCleared) return;

    const storageUserId = StorageUtil.getUserId();
    const storageGuestId =
      StorageUtil.getGuestIdForMerge() || StorageUtil.getGuestId();

    try {
      console.log("🛒 Clearing entire cart after successful payment");

      const { userId, guestId } = ensureUserIdentification({
        storageUserId,
        storageGuestId,
        reduxUserId: userIdentification.userId,
        reduxGuestId: userIdentification.guestId,
        clerkUserId: clerkUser?.id,
        isSignedIn,
        dispatch,
      });

      if (!userId && !guestId) {
        console.error(
          "❌ Could not establish user identification for cart update"
        );
        toast.error("Unable to update cart. Please refresh the page.");
        return;
      }

      // Pass userId and guestId to the thunk
      const result = await dispatch(clearEntireCart({ userId, guestId }));

      if (clearEntireCart.fulfilled.match(result)) {
        setCartCleared(true);
        console.log("✅ Cart cleared successfully:", result.payload);
        toast.success("Cart cleared successfully");
      } else if (clearEntireCart.rejected.match(result)) {
        console.error("❌ Failed to clear cart:", result.payload);
      }
    } catch (error) {
      console.error("❌ Error clearing cart:", error);
    }
  };

  const handleUpdateQuantity = async (
    itemId: string,
    newQuantity: number
  ): Promise<void> => {
    console.log("🛒 handleUpdateQuantity called:", {
      itemId,
      newQuantity,
      currentUserIdentification: userIdentification,
      isSignedIn,
      clerkUserId: clerkUser?.id,
    });

    if (!itemId || newQuantity < 0) {
      console.error("❌ Invalid parameters for updateQuantity");
      return;
    }

    // Set loading state for this item
    setIsUpdating(itemId);

    try {
      // Ensure we have proper user identification
      const storageUserId = StorageUtil.getUserId();
      const storageGuestId =
        StorageUtil.getGuestIdForMerge() || StorageUtil.getGuestId();
      const { userId, guestId } = ensureUserIdentification({
        storageUserId,
        storageGuestId,
        reduxUserId: userIdentification.userId,
        reduxGuestId: userIdentification.guestId,
        clerkUserId: clerkUser?.id,
        isSignedIn,
        dispatch,
      });

      if (!userId && !guestId) {
        console.error(
          "❌ Could not establish user identification for cart update"
        );
        toast.error("Unable to update cart. Please refresh the page.");
        return;
      }

      console.log("🔄 Updating cart with identification:", { userId, guestId });

      await dispatch(
        updateCartQuantity({
          cartItemId: itemId,
          quantity: newQuantity,
          // userId,
          // guestId,
          // Only pass userId and guestId if they are valid properties for updateCartQuantity
        })
      );
    } catch (error) {
      console.error("❌ Error updating cart quantity:", error);
      toast.error("Failed to update cart. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveItem = async (itemId: string): Promise<void> => {
    console.log("🗑️ handleRemoveItem called:", { itemId });

    if (!itemId) {
      console.error("❌ Invalid itemId for removeItem");
      return;
    }
    const storageUserId = StorageUtil.getUserId();
    const storageGuestId =
      StorageUtil.getGuestIdForMerge() || StorageUtil.getGuestId();

    // Set loading state for this item
    setIsUpdating(itemId);

    try {
      // Ensure we have proper user identification
      const { userId, guestId } = ensureUserIdentification({
        storageUserId,
        storageGuestId,
        reduxUserId: userIdentification.userId,
        reduxGuestId: userIdentification.guestId,
        clerkUserId: clerkUser?.id,
        isSignedIn,
        dispatch,
      });

      if (!userId && !guestId) {
        console.error(
          "❌ Could not establish user identification for cart removal"
        );
        toast.error("Unable to remove item. Please refresh the page.");
        return;
      }

      console.log("🔄 Removing item with identification:", { userId, guestId });

      // Remove item by setting quantity to 0
      await dispatch(
        updateCartQuantity({
          cartItemId: itemId,
          quantity: 0,
          // userId,
          // guestId,
        })
      );

      toast.success("Item removed from cart");
    } catch (error) {
      console.error("❌ Error removing cart item:", error);
      toast.error("Failed to remove item. Please try again.");
    } finally {
      setIsUpdating(null);
    }
  };

  const router = useRouter();

  const handleProceedToCheckout = async (): Promise<void> => {
    // Check authentication using Clerk
    if (!isSignedIn) {
      // Store the current URL in sessionStorage as a fallback
      if (typeof window !== "undefined") {
        sessionStorage.setItem("checkout_redirect", window.location.pathname);
      }

      const returnUrl = encodeURIComponent("/checkout");
      router.push(`/sign-in?redirect_url=${returnUrl}`);
      return;
    }

    // Rest of your checkout logic...
    router.push("/checkout");
  };

  // Calculate item price using imported helper function
  const getDisplayPrice = (item: CartItem) => {
    return getItemPrice(item);
  };

  // Empty Cart State
  if (cartItems.length === 0) {
    return (
      <>
        {/* Breadcrumb */}
        <Breadcrumb />
        <Container className="min-h-[600px] bg-gray-50 flex items-center justify-center p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 mx-auto mb-8 bg-gray-200 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-8">
              Start adding delicious items to your cart!
            </p>
            <Link href="/">
              <button
                className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Start Shopping
              </button>
            </Link>
          </div>
        </Container>
      </>
    );
  }

  // Cart with Items
  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumb />

      <Container className="mx-auto px-4 py-8">
        <Container className="bg-gray-50 p-6">
          <div className="mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-gray-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Your Cart</h1>
            </div>

            {/* Loading state */}
            {(isCartLoading || productsLoading) && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <p className="mt-2 text-gray-600">
                  {isCartLoading ? "Updating cart..." : "Loading products..."}
                </p>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8 mb-10">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={clearCart}
                    className="font-semibold text-xs rounded bg-orange-500 hover:bg-orange-700 p-2 cursor-pointer text-white"
                  >
                    Clear Cart
                  </button>
                </div>
                {cartItems.map((item: CartItem) => {
                  const itemPrice = getDisplayPrice(item);
                  const isItemUpdating = isUpdating === item.id;
                  const priceValue =
                    typeof itemPrice === "number"
                      ? itemPrice
                      : (itemPrice as UnitPrice)?.price || 0;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${
                        isItemUpdating ? "opacity-60" : ""
                      }`}
                    >
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold text-gray-900">
                            {item.product?.name}
                            {getUnitDisplay(item)}
                          </h2>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isItemUpdating}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            aria-label={`Remove ${item.product?.name} from cart`}
                          >
                            <Trash2 className="w-5 h-5 text-gray-400" />
                          </button>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            {item.product?.images?.[0] ? (
                              <Image
                                src={item.product?.images?.[0]}
                                alt={item.product?.name}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-red-600 rounded"></div>
                            )}
                          </div>

                          <div className="flex-grow">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {item.product?.name}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {item.product?.category?.name || "General"}
                            </p>
                            {(item.product?.unitPrices || item.unitPrice?.unit) && (
                              <p className="text-gray-500 text-xs">
                              {item.product?.unitPrices?.[0]?.unit ?? item.unitPrice?.unit}

                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                handleUpdateQuantity(
                                  item.id,
                                  Math.max(0, item.quantity - 1)
                                )
                              }
                              disabled={item.quantity <= 1 || isItemUpdating}
                              className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {isItemUpdating ? "..." : item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity + 1)
                              }
                              disabled={isItemUpdating}
                              className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-bold text-orange-600">
                              <PriceFormatter
                                amount={priceValue * item.quantity}
                                showDecimals
                              />
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-sm text-gray-500 mt-1">
                                <PriceFormatter
                                  amount={itemPrice as number} // Type assertion to ensure it's a number
                                  showDecimals
                                />{" "}
                                each
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">
                    Order Summary
                  </h3>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Subtotal ({totalCartItems} item
                        {totalCartItems !== 1 ? "s" : ""})
                      </span>
                      <span className="font-semibold">
                        <PriceFormatter amount={cartSubtotal} showDecimals />
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>
                        <PriceFormatter amount={cartSubtotal} showDecimals />
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Delivery fees not included yet.
                    </p>
                  </div>

                  <button
                    disabled={isCartLoading}
                    onClick={handleProceedToCheckout}
                    className="w-full cursor-pointer bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCartLoading ? "Processing..." : "Proceed to Checkout"}
                  </button>
                </div>
              </div>
            </div>

            {/* Recommended Products */}
            {cartItems.length > 0 && (
              <div className="mt-12">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {recommendedProducts.length > 0
                      ? "Recommended for You"
                      : "Looking for More?"}
                  </h2>
                  {recommendedProducts.length > 0 ? (
                    <p className="text-gray-600">
                      Related products from your cart categories:{" "}
                      <span className="text-orange-600 font-medium">
                        {cartItems
                          .map((item: CartItem) => item.product?.category?.name) // string | undefined
                          .filter((name: string | undefined): name is string => Boolean(name)) // type guard ensures 'name' is string
                          .filter(
                            (name: string, index: number, arr: string[]) =>
                              arr.indexOf(name) === index
                          )
                          .join(", ")}
                      </span>
                    </p>
                  ) : (
                    <p className="text-gray-600">
                      {cartCategoryIds.length > 0
                        ? "No more products available in your cart categories at the moment."
                        : "Add more items to see related product recommendations."}
                    </p>
                  )}
                </div>

                {productsLoading && (
                  <div className="text-center py-4">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                    <p className="mt-2 text-sm text-gray-600">
                      Loading recommendations...
                    </p>
                  </div>
                )}

                {recommendedProducts.length > 0 && (
                  <div className="relative">
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                      {recommendedProducts.map((product) => (
                        <div key={product.id} className="flex-shrink-0 w-64">
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
                              product.images || [
                                "/placeholder.svg?height=200&width=200",
                              ]
                            }
                            description={
                              product.description || "No description available."
                            }
                            unit={product.unitPrices?.[0]?.unit || "Per Item"}
                            category={product.category?.name || "General"}
                            rating={product.reviews?.[0]?.rating}
                            unitPrices={product.unitPrices || undefined}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Navigation arrows - only show if there are products */}
                    {recommendedProducts.length > 3 && (
                      <>
                        <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50">
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50">
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Container>
      </Container>
    </>
  );
}