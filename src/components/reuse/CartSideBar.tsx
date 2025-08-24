// 1. Fixed CartSidebar Component
import React, { useState } from "react";
import { X, ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CartSidebarProps } from "@/types/carts";
import Image from "next/image";
import { PriceFormatter } from "./FormatCurrency";
import Link from "next/link";
import { getItemPrice, getUnitDisplay } from "@/utils/priceHelpers";
import { ensureUserIdentification } from "@/utils/userIdentification";
import { StorageUtil } from "@/lib/storageKeys";
import { useDispatch, useSelector } from "react-redux";
import {
  selectUserIdentification,
  clearEntireCart,
} from "@/app/store/slices/cartSlice";
import { AppDispatch } from "@/app/store";
import { toast } from "react-toastify";
import { useUser } from "@clerk/nextjs";

const CartSidebar: React.FC<CartSidebarProps> = ({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  isLoading,
}) => {
  const [cartCleared, setCartCleared] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const userIdentification = useSelector(selectUserIdentification);
  const { user: clerkUser, isSignedIn } = useUser();
  // Calculate total price using the helper function
  const totalPrice = cartItems.reduce((sum, item) => {
    const itemPrice = getItemPrice(item);
    return sum + itemPrice * item.quantity;
  }, 0);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Fixed handlers - removed debug logs and simplified logic
  const handleDecreaseQuantity = (itemId: string, currentQuantity: number) => {
    if (currentQuantity > 1) {
      onUpdateQuantity(itemId, currentQuantity - 1);
    }
  };

  const handleIncreaseQuantity = (itemId: string, currentQuantity: number) => {
    onUpdateQuantity(itemId, currentQuantity + 1);
  };

  const handleRemoveItem = (itemId: string) => {
    onRemoveItem(itemId);
  };

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
      } else if (clearEntireCart.rejected.match(result)) {
        console.error("❌ Failed to clear cart:", result.payload);
      }
    } catch (error) {
      console.error("❌ Error clearing cart:", error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
            className="fixed right-0 top-0 h-full w-full max-w-[600px] bg-white shadow-xl z-[1100] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-gray-700" />
                <h2 className="md:text-xl text-lg font-semibold text-gray-900">
                  My shopping cart ({totalItems}{" "}
                  {totalItems === 1 ? "item" : "items"})
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* Loading state */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <p className="mt-2 text-gray-600">Updating cart...</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
            {cartItems.length > 0 && (
            <div className="flex justify-end p-3">
              <button
                onClick={clearCart}
                className="font-semibold text-xs rounded bg-orange-500 hover:bg-orange-700 p-2 cursor-pointer text-white"
              >
                Clear Cart
              </button>
            </div>)}
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <ShoppingBag className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-gray-500 mb-8">
                    Add some items to your cart to get started
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:from-purple-600 hover:to-blue-700 transition-all duration-200 shadow-lg cursor-pointer "
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {cartItems.map((item) => {
                    const itemPrice = getItemPrice(item);
                    const unitDisplay = getUnitDisplay(item);

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {item.product?.images ? (
                            <Image
                              src={item.product?.images[0]}
                              alt={item.product?.name}
                              width={50}
                              height={50}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {item.product?.name}
                            {unitDisplay && (
                              <span className="text-sm text-gray-500 ml-1">
                                {unitDisplay}
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500 mb-2">
                            <PriceFormatter amount={itemPrice} showDecimals />{" "}
                            each
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-500"></span>
                              <span className="md:text-lg text-sm font-semibold text-orange-700">
                                <PriceFormatter
                                  amount={itemPrice * item.quantity}
                                  showDecimals
                                />
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  handleDecreaseQuantity(item.id, item.quantity)
                                }
                                disabled={item.quantity === 1}
                                className={`md:w-8 md:h-8 h-6 w-6 rounded-full flex items-center justify-center transition-colors ${
                                  item.quantity === 1
                                    ? "bg-gray-100 cursor-not-allowed "
                                    : "bg-gray-200 hover:bg-gray-300 cursor-pointer"
                                }`}
                                aria-label="Decrease quantity"
                              >
                                <Minus
                                  className={`w-4 h-4 ${
                                    item.quantity === 1
                                      ? "text-gray-400"
                                      : "text-gray-600"
                                  }`}
                                />
                              </button>
                              <span className="w-8 text-center font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  handleIncreaseQuantity(item.id, item.quantity)
                                }
                                className="cursor-pointer md:w-8 md:h-8 h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold text-gray-900">
                    Total ({totalItems} {totalItems === 1 ? "item" : "items"})
                  </span>
                  <span className="md:text-2xl text-lg font-bold text-orange-700">
                    <PriceFormatter amount={totalPrice} showDecimals />
                  </span>
                </div>
                <div className="flex gap-x-4">
                  <Link href="/carts" className="flex-1">
                    <button
                      onClick={onClose}
                      className="w-full bg-gradient-to-r from-orange-500 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-green-700 transition-all duration-200 shadow-lg cursor-pointer"
                      aria-label="Proceed to cart"
                    >
                      PROCEED TO CART
                    </button>
                  </Link>

                  <Link href="/checkout" className="flex-1">
                    <button
                      className="w-full bg-gradient-to-r from-orange-500 to-green-600 text-white py-3 px-6 rounded-lg font-medium hover:from-orange-600 hover:to-green-700 transition-all duration-200 shadow-lg cursor-pointer"
                      aria-label="Proceed to checkout"
                      onClick={onClose}
                    >
                      PROCEED TO CHECKOUT
                    </button>
                  </Link>
                </div>

                <button
                  onClick={onClose}
                  className="w-full mt-3 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 transition-colors cursor-pointer"
                  aria-label="Continue shopping"
                >
                  CONTINUE SHOPPING
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
