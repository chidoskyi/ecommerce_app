"use client"

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Minus, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Container from '@/components/reuse/Container';
import ProductCard from '@/components/reuse/ProductCard';
import Link from 'next/link';
import Image from 'next/image';
import { useDispatch, useSelector } from 'react-redux';
import { ensureUserIdentification } from '@/utils/userIdentification';
import {
  updateCartQuantity,
  setAuthenticated,
  selectUserIdentification,
  clearEntireCart
} from "@/app/store/slices/cartSlice";
import { StorageUtil } from '@/lib/storageKeys';
import { useCategories } from "@/app/store/slices/categorySlice";
import { CategoryStatus } from "@/types/categories";
import { useUser } from '@clerk/nextjs';
import { PriceFormatter } from '@/components/reuse/FormatCurrency';
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AppDispatch } from '@/app/store';
import { getItemPrice, getUnitDisplay } from "@/utils/priceHelpers";

interface CartComponentProps {
  onStartShopping?: () => void;
  onProceedToCheckout?: (total: number) => void;
}

const CartComponent: React.FC<CartComponentProps> = ({
  onStartShopping,
  onProceedToCheckout
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: clerkUser, isSignedIn } = useUser();
  
  // Cart state from Redux
  const cart = useSelector((state: any) => state.cart);
  const userIdentification = useSelector(selectUserIdentification);
  
  // Extract cart data from Redux store
  const cartItems = cart.items || [];
  const totalCartItems = cart.itemCount || 0;
  const cartSubtotal = cart.subtotal || 0;
  const isCartLoading = cart.loading || false;
  const isCartOpen = cart.isOpen || false;
  
  // Categories hook
  const { categories, status } = useCategories();
  const [cartCleared, setCartCleared] = useState(false);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // Track which item is being updated
  const { isAuthenticated } = useAuth(); 
  const paths = ['cart'];

  // Get related products based on categories of cart items
  useEffect(() => {
    if (cartItems.length > 0 && categories.length > 0 && status === CategoryStatus.SUCCEEDED) {
      // Get unique category IDs from cart items
      const cartCategoryIds = [...new Set(cartItems.map((item: any) => item.product?.categoryId || item.categoryId).filter(Boolean))];
      
      // Find related products from the same categories
      const relatedProducts: any[] = [];
      
      cartCategoryIds.forEach(categoryId => {
        const category = categories.find(cat => cat.id === categoryId);
        if (category?.products) {
          // Filter out products that are already in cart and add up to 3 products per category
          const categoryProducts = category.products
            .filter(product => !cartItems.some((cartItem: any) => cartItem.productId === product.id || cartItem.id === product.id))
            .slice(0, 3);
          relatedProducts.push(...categoryProducts);
        }
      });
      
      // Limit to 7 recommended products and shuffle them
      const shuffledProducts = relatedProducts
        .sort(() => Math.random() - 0.5)
        .slice(0, 7);
        
      setRecommendedProducts(shuffledProducts);
    }
  }, [cartItems, categories, status]);

  // const ensureUserIdentification = (): { userId: string | null; guestId: string | null } => {
  //   // Get the most current values from storage and Redux
  //   const storageUserId = StorageUtil.getUserId();
  //   const storageGuestId = StorageUtil.getGuestIdForMerge() || StorageUtil.getGuestId();
  //   const reduxUserId = userIdentification.userId;
  //   const reduxGuestId = userIdentification.guestId;
    
  //   console.log("🔍 User identification check:", {
  //     storageUserId,
  //     storageGuestId,
  //     reduxUserId,
  //     reduxGuestId,
  //     clerkUserId: clerkUser?.id,
  //     isSignedIn
  //   });

  //   // Priority order: Clerk user > Storage > Redux
  //   let finalUserId: string | null = null;
  //   let finalGuestId: string | null = null;

  //   if (isSignedIn && clerkUser?.id) {
  //     // User is authenticated
  //     finalUserId = clerkUser.id;
  //     finalGuestId = null;
      
  //     // Ensure storage is in sync
  //     if (storageUserId !== clerkUser.id) {
  //       console.log("🔧 Syncing storage with authenticated user");
  //       StorageUtil.setUserMode(clerkUser.id);
  //     }
      
  //     // Ensure Redux is in sync
  //     if (reduxUserId !== clerkUser.id) {
  //       console.log("🔧 Syncing Redux with authenticated user");
  //       dispatch(setAuthenticated({
  //         isAuthenticated: true,
  //         userId: clerkUser.id,
  //       }));
  //     }
  //   } else {
  //     // User is not authenticated - use guest mode
  //     finalUserId = null;
  //     finalGuestId = storageGuestId || reduxGuestId;
      
  //     // If no guest ID exists anywhere, create one
  //     if (!finalGuestId) {
  //       console.log("⚠️ Creating new guest ID for cart operation");
  //       finalGuestId = StorageUtil.generateAndSetGuestId();
  //       dispatch(setAuthenticated({
  //         isAuthenticated: false,
  //         userId: null,
  //       }));
  //     }
  //   }

  //   console.log("✅ Final user identification:", { 
  //     userId: finalUserId, 
  //     guestId: finalGuestId 
  //   });

  //   return { userId: finalUserId, guestId: finalGuestId };
  // };

  const clearCart = async () => {
    if (cartCleared) return;

    const storageUserId = StorageUtil.getUserId();
    const storageGuestId = StorageUtil.getGuestIdForMerge() || StorageUtil.getGuestId();
    
    try {
      console.log("🛒 Clearing entire cart after successful payment");
  
      const { userId, guestId } = ensureUserIdentification({
        storageUserId,
        storageGuestId,
        reduxUserId: userIdentification.userId,
        reduxGuestId: userIdentification.guestId,
        clerkUserId: clerkUser?.id,
        isSignedIn,
        dispatch
      });
  
      if (!userId && !guestId) {
        console.error("❌ Could not establish user identification for cart update");
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

  const handleUpdateQuantity = async (itemId: string, newQuantity: number): Promise<void> => {
    console.log("🛒 handleUpdateQuantity called:", {
      itemId,
      newQuantity,
      currentUserIdentification: userIdentification,
      isSignedIn,
      clerkUserId: clerkUser?.id
    });

    if (!itemId || newQuantity < 0) {
      console.error("❌ Invalid parameters for updateQuantity");
      return;
    }

    // Set loading state for this item
    setIsUpdating(itemId);

    try {
      // Ensure we have proper user identification
      const { userId, guestId } = ensureUserIdentification();

      if (!userId && !guestId) {
        console.error("❌ Could not establish user identification for cart update");
        toast.error("Unable to update cart. Please refresh the page.");
        return;
      }

      console.log("🔄 Updating cart with identification:", { userId, guestId });

      await dispatch(
        updateCartQuantity({
          cartItemId: itemId,
          quantity: newQuantity,
          userId,
          guestId,
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
    const storageGuestId = StorageUtil.getGuestIdForMerge() || StorageUtil.getGuestId();

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
        dispatch
      });

      if (!userId && !guestId) {
        console.error("❌ Could not establish user identification for cart removal");
        toast.error("Unable to remove item. Please refresh the page.");
        return;
      }

      console.log("🔄 Removing item with identification:", { userId, guestId });

      // Remove item by setting quantity to 0
      await dispatch(
        updateCartQuantity({
          cartItemId: itemId,
          quantity: 0,
          userId,
          guestId,
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

  const handleStartShopping = (): void => {
    if (onStartShopping) {
      onStartShopping();
    }
  };

  const router = useRouter();

  const handleProceedToCheckout = async (): Promise<void> => {
    // Check authentication using Clerk
    if (!isSignedIn) {
      // Store the current URL in sessionStorage as a fallback
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('checkout_redirect', window.location.pathname);
      }
      
      const returnUrl = encodeURIComponent('/checkout');
      router.push(`/sign-in?redirect_url=${returnUrl}`);
      return;
    }
  
    // Rest of your checkout logic...
    if (onProceedToCheckout) {
      try {
        await onProceedToCheckout(cartSubtotal);
        router.push("/checkout");
      } catch (error) {
        console.error('Checkout failed:', error);
        toast.error('Checkout processing failed. Please try again.');
      }
    } else {
      router.push("/checkout");
    }
  };

  // Calculate item price using imported helper function
  const getDisplayPrice = (item: any) => {
    return getItemPrice(item);
  };

  // Empty Cart State
  if (cartItems.length === 0) {
    return (
      <>
        {/* Breadcrumb */}
        <div className="w-full bg-white mx-auto sm:px-6 lg:px-8 py-5 mb-5">
          <Container className="text-lg text-gray-500 font-semibold">
            <Link href="/">
              <span className="hover:text-orange-600 cursor-pointer">Home</span>
            </Link>
            
            {paths.map((path, index) => {
              const href = `/${paths.slice(0, index + 1).join('/')}`;
              const isLast = index === paths.length - 1;
              const pathName = path.replace(/-/g, ' ');

              return (
                <span key={path}>
                  <span className="mx-2">›</span>
                  {isLast ? (
                    <span className="text-gray-900 text-sm capitalize">{pathName}</span>
                  ) : (
                    <Link href={href}>
                      <span className="hover:text-orange-600 cursor-pointer capitalize">{pathName}</span>
                    </Link>
                  )}
                </span>
              );
            })}
          </Container>
        </div>
        <Container className="min-h-[600px] bg-gray-50 flex items-center justify-center p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="w-32 h-32 mx-auto mb-8 bg-gray-200 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-8">Start adding delicious items to your cart!</p>
            <Link href="/">
              <button 
                onClick={handleStartShopping}
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
      <div className="w-full bg-white mx-auto px-4 sm:px-6 lg:px-8 py-5 mb-5">
        <Container className="text-lg text-gray-500 font-semibold">
          <Link href="/">
            <span className="hover:text-orange-600 cursor-pointer">Home</span>
          </Link>
          
          {paths.map((path, index) => {
            const href = `/${paths.slice(0, index + 1).join('/')}`;
            const isLast = index === paths.length - 1;
            const pathName = path.replace(/-/g, ' ');

            return (
              <span key={path}>
                <span className="mx-2">›</span>
                {isLast ? (
                  <span className="text-gray-900 text-sm capitalize">{pathName}</span>
                ) : (
                  <Link href={href}>
                    <span className="hover:text-orange-600 cursor-pointer capitalize">{pathName}</span>
                  </Link>
                )}
              </span>
            );
          })}
        </Container>
      </div>
      
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
            {isCartLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <p className="mt-2 text-gray-600">Updating cart...</p>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8 mb-10">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <div className='flex justify-end'><button onClick={clearCart} className='font-semibold text-xs rounded bg-orange-500 hover:bg-orange-700 p-2 cursor-pointer text-white'>Clear Cart</button></div>
                {cartItems.map((item: any) => {
                  const itemPrice = getDisplayPrice(item);
                  const isItemUpdating = isUpdating === item.id;
                  
                  return (
                    <div key={item.id} className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden ${isItemUpdating ? 'opacity-60' : ''}`}>
                      <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold text-gray-900">
                            {item.product?.name || item.name}
                            {getUnitDisplay(item)}
                          </h2>
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={isItemUpdating}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            aria-label={`Remove ${item.product?.name || item.name} from cart`}
                          >
                            <Trash2 className="w-5 h-5 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            {item.product?.images?.[0] || item.images?.[0] ? (
                              <Image 
                                src={item.product?.images?.[0] || item.images?.[0]} 
                                alt={item.product?.name || item.name}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-red-600 rounded"></div>
                            )}
                          </div>
                          
                          <div className="flex-grow">
                            <h3 className="font-semibold text-gray-900 mb-1">{item.product?.name || item.name}</h3>
                            <p className="text-gray-600 text-sm">{item.product?.category?.name || item.category || 'General'}</p>
                            {(item.product?.unit || item.unit) && (
                              <p className="text-gray-500 text-xs">{item.product?.unit || item.unit}</p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                              disabled={item.quantity <= 1 || isItemUpdating}
                              className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {isItemUpdating ? '...' : item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              disabled={isItemUpdating}
                              className="w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xl font-bold text-orange-600">
                              <PriceFormatter amount={itemPrice * item.quantity} showDecimals />
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-sm text-gray-500 mt-1">
                                <PriceFormatter amount={itemPrice} showDecimals /> each
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h3>
                  
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Subtotal ({totalCartItems} item{totalCartItems !== 1 ? 's' : ''})
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
                    <p className="text-sm text-gray-500">Delivery fees not included yet.</p>
                  </div>

                  {/* <Link href="/checkout"> */}
                    <button 
                      disabled={isCartLoading}
                      onClick={handleProceedToCheckout}
                      className="w-full cursor-pointer bg-orange-600 text-white py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCartLoading ? 'Processing...' : 'Proceed to Checkout'}
                    </button>
                  {/* </Link> */}
                </div>
              </div>
            </div>

            {/* Recommended Products */}
            {recommendedProducts.length > 0 && (
              <div className="mt-12">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Recommended for You</h2>
                  <p className="text-gray-600">Related products from your cart categories</p>
                </div>

                <div className="relative">
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    {recommendedProducts.map((product) => (
                      <div key={product.id} className="flex-shrink-0 w-64">
                        <ProductCard 
                          {...product}
                          id={product.id}
                          name={product.name}
                          price={product.hasFixedPrice ? product.fixedPrice : product.displayPrice}
                          images={product.images || ["/placeholder.svg?height=200&width=200"]}
                          description={product.description || "No description available."}
                          unit={product.unitPrices?.[0]?.unit || "Per Item"}
                          category={product.category?.name || "General"}
                          rating={product.rating}
                        />
                      </div>
                    ))}
                  </div>
                  
                  {/* Navigation arrows */}
                  <button className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50">
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50">
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Container>
      </Container>
    </>
  );
};

export default CartComponent;

