"use client"

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Copy,
  MessageCircle,
  FileText,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";
import Image from "next/image";
import { getItemPrice } from "@/utils/priceHelpers";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import {
  fetchOrderById,
  selectCurrentOrder,
  selectLoading,
  selectError,
} from "@/app/store/slices/orderSlice";
import { selectUserIdentification, clearEntireCart } from "@/app/store/slices/cartSlice";
import Container from "@/components/reuse/Container";
import { StorageUtil } from "@/lib/storageKeys";
import { ensureUserIdentification } from "@/utils/userIdentification";

import { useUser } from '@clerk/nextjs';

// Order status configurations
const ORDER_STATUSES = {
  pending: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: Clock,
    label: "Pending",
  },
  confirmed: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircle,
    label: "Confirmed",
  },
  processing: {
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Package,
    label: "Processing",
  },
  shipped: {
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Truck,
    label: "Shipped",
  },
  delivered: {
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    label: "Delivered",
  },
  cancelled: {
    color: "bg-red-100 text-red-800 border-red-200",
    icon: AlertCircle,
    label: "Cancelled",
  },
};

const PAYMENT_STATUSES = {
  pending: {
    color: "bg-yellow-100 text-yellow-800",
    label: "Pending",
  },
  paid: {
    color: "bg-green-100 text-green-800",
    label: "Paid",
  },
  failed: {
    color: "bg-red-100 text-red-800",
    label: "Failed",
  },
  refunded: {
    color: "bg-gray-100 text-gray-800",
    label: "Refunded",
  },
};

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params?.orderId as string | undefined;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, isAuthenticated } = useAuth();
  const [cartCleared, setCartCleared] = useState(false);
  
  // Redux selectors
  const orderData = useAppSelector(selectCurrentOrder);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);
  const userIdentification = useAppSelector(selectUserIdentification);
  const { user: clerkUser, isSignedIn } = useUser();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && orderId) {
      dispatch(fetchOrderById(orderId));
    }
  }, [isAuthenticated, orderId, dispatch]);

  // Auto-show review modal when order is delivered
  useEffect(() => {
    if (orderData?.status === "DELIVERED" && !showReviewModal) {
      // Add a small delay to ensure the page has loaded
      const timer = setTimeout(() => {
        setShowReviewModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [orderData?.status, showReviewModal]);

  const clearCartAfterPayment = useCallback(async () => {
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
      } else if (clearEntireCart.rejected.match(result)) {
        console.error("❌ Failed to clear cart:", result.payload);
      }
      
    } catch (error) {
      console.error("❌ Error clearing cart:", error);
    }
  }, [cartCleared, dispatch, userIdentification, clerkUser, isSignedIn]);

  // Clear cart after successful payment
  useEffect(() => {
    if (orderData?.paymentStatus?.toLowerCase() === 'paid' && !cartCleared) {
      clearCartAfterPayment();
    }
  }, [orderData?.paymentStatus, cartCleared, clearCartAfterPayment]);





  // Clear cart after successful payment
  useEffect(() => {
    if (orderData?.paymentStatus?.toLowerCase() === 'paid' && !cartCleared) {
      clearCartAfterPayment();
    }
  }, [orderData?.paymentStatus, cartCleared, clearCartAfterPayment]);

    const fetchOrderDetails = async (showRefreshIndicator = false) => {
    if (!token || !orderId) return;

    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      }
        // Refresh Redux store
        dispatch(fetchOrderById(orderId));
        toast.success("Order details refreshed");
    } catch (error) {
      console.error("Error refreshing order:", error);
      toast.error("Failed to refresh order details");
    } finally {
      setRefreshing(false);
    }
  };

  // const handleDownloadReceipt = async () => {
  //   if (!orderData?.orderNumber || !token) return;

  //   try {
  //     const response = await fetch("/api/orders/receipt", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${token}`,
  //         "x-auth-token": token,
  //         "x-user-id": userId || "",
  //       },
  //       body: JSON.stringify({
  //         orderNumber: orderData.orderNumber,
  //       }),
  //     });

  //     if (response.ok) {
  //       const blob = await response.blob();
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement("a");
  //       a.style.display = "none";
  //       a.href = url;
  //       a.download = `receipt-${orderData.orderNumber}.pdf`;
  //       document.body.appendChild(a);
  //       a.click();
  //       window.URL.revokeObjectURL(url);
  //       document.body.removeChild(a);
  //       toast.success("Receipt downloaded successfully");
  //     } else {
  //       toast.error("Failed to download receipt");
  //     }
  //   } catch (error) {
  //     console.error("Receipt download error:", error);
  //     toast.error("Failed to download receipt");
  //   }
  // };

  const handleContinueShopping = () => {
    router.push("/");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard`);
    });
  };

  const handleRefresh = () => {
    fetchOrderDetails(true);
  };

  const handleGoBack = () => {
    router.back();
  };


  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <Container className=" mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Loading Order Details
            </h2>
            <p className="text-gray-600">
              Please wait while we fetch your order information...
            </p>
          </div>
        </Container>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Order Not Found
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGoBack}
                className="flex items-center justify-center px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </button>
              <button
                onClick={handleRefresh}
                className="flex items-center justify-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return null;
  }

  const statusKey = (orderData.status?.toLowerCase() ?? "pending") as keyof typeof ORDER_STATUSES;
  const paymentStatusKey = (orderData.paymentStatus?.toLowerCase() ?? "pending") as keyof typeof PAYMENT_STATUSES;

  const statusConfig = ORDER_STATUSES[statusKey] || ORDER_STATUSES.pending;
  const paymentStatusConfig = PAYMENT_STATUSES[paymentStatusKey] || PAYMENT_STATUSES.pending;
  const StatusIcon = statusConfig.icon;

  return (
    <Container className="bg-gray-50 py-8 px-4">
      <div className=" mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={handleGoBack}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Order Details
              </h1>
              <p className="text-gray-600 mt-1">
                Order #{orderData.orderNumber}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">
                  Order Status
                </h2>
                <div
                  className={`flex items-center px-3 py-1 rounded-full border ${statusConfig.color}`}
                >
                  <StatusIcon className="w-4 h-4 mr-2" />
                  {statusConfig.label}
                </div>
              </div>

              {/* Progress Steps - Desktop */}
              <div className="hidden md:flex items-center justify-between mb-6 relative">
                {Object.entries(ORDER_STATUSES).map(([key, config], index) => {
                  const Icon = config.icon;
                  const isActive =
                    Object.keys(ORDER_STATUSES).indexOf(
                      orderData.status?.toLowerCase()
                    ) >= index;
                  const isCurrent = orderData.status?.toLowerCase() === key;

                  return (
                    <div key={key} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                          isCurrent
                            ? "bg-orange-500 border-orange-500 text-white"
                            : isActive
                            ? "bg-green-500 border-green-500 text-white"
                            : "bg-gray-100 border-gray-300 text-gray-400"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-xs mt-2 text-center max-w-16 ${
                          isActive ? "text-gray-800" : "text-gray-400"
                        }`}
                      >
                        {config.label}
                      </span>
                    </div>
                  );
                })}
                {/* Connecting line */}
                <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-300 -z-10">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{
                      width: `${(Object.keys(ORDER_STATUSES).indexOf(orderData.status?.toLowerCase()) / (Object.keys(ORDER_STATUSES).length - 1)) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Progress Steps - Mobile */}
              <div className="md:hidden space-y-2 mb-6">
                {Object.entries(ORDER_STATUSES).map(([key, config]) => {
                  const Icon = config.icon;
                  const isActive =
                    Object.keys(ORDER_STATUSES).indexOf(
                      orderData.status?.toLowerCase()
                    ) >= Object.keys(ORDER_STATUSES).indexOf(key);
                  const isCurrent = orderData.status?.toLowerCase() === key;

                  return (
                    <div key={key} className={`flex items-center p-2 rounded ${isCurrent ? 'bg-orange-50' : ''}`}>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                          isCurrent
                            ? "bg-orange-500 text-white"
                            : isActive
                            ? "bg-green-500 text-white"
                            : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className={`${isActive ? "text-gray-800" : "text-gray-400"}`}>
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Order Date:</span>
                  <span className="font-medium">
                    {new Date(orderData.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Order Items ({orderData.items?.length || 0})
              </h2>
              <div className="space-y-4">
                {orderData.items?.map((item, index) => {
                  
                  const itemPrice = getItemPrice(item);
                  return (
                    <div
                      key={index}
                      className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      {item.product?.images?.[0] && (
                        <Image
                          src={item.product?.images[0]}
                          alt={item.title}
                          width={64}
                          height={64}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-orange-600">
                          <PriceFormatter amount={item.totalPrice} />
                        </p>
                        <p className="text-gray-500 text-sm">
                          <PriceFormatter amount={itemPrice} /> each
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Continue Shopping Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Want to explore more?
                </h2>
                <p className="text-gray-600 mb-6">
                  Check out our latest products and amazing deals
                </p>
                <button
                  onClick={handleContinueShopping}
                  className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Order Summary
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    <PriceFormatter amount={orderData.subtotalPrice} />
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping:</span>
                  <span className="font-medium">
                     <PriceFormatter amount={orderData.totalShipping} />
                  </span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-lg font-semibold text-orange-600">
                      <PriceFormatter amount={orderData.totalPrice} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Payment Information
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-sm font-medium ${paymentStatusConfig.color}`}
                  >
                    {paymentStatusConfig.label}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium capitalize">
                    {orderData.paymentMethod}
                  </span>
                </div>

                {orderData.transactionId && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-600">Transaction ID:</span>
                    <div className="flex items-center ml-2">
                      <span className="font-mono text-sm mr-2 break-all">
                        {orderData.transactionId.slice(0, 12)}...
                      </span>
                      <button
                        onClick={() =>
                          orderData.transactionId &&
                          copyToClipboard(
                            orderData.transactionId,
                            "Transaction ID"
                          )
                        }
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                        title="Copy transaction ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            {orderData.shippingAddress && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Shipping Address
                </h2>

                <div className="text-gray-600 space-y-1">
                  <p className="font-medium text-gray-800">
                    {orderData.shippingAddress.firstName}{" "}
                    {orderData.shippingAddress.lastName}
                  </p>
                  <p>{orderData.shippingAddress.address}</p>
                  <p>
                    {orderData.shippingAddress.city},{" "}
                    {orderData.shippingAddress.state}
                  </p>
                  <p>{orderData.shippingAddress.country}</p>

                  {orderData.shippingAddress.phone && (
                    <p className="flex items-center mt-2">
                      <Phone className="w-4 h-4 mr-2" />
                      {orderData.shippingAddress.phone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Actions
              </h2>

              <div className="space-y-3">
                {/* <button
                  onClick={handleDownloadReceipt}
                  className="w-full flex items-center justify-center px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </button> */}

                <button
                  onClick={() => router.push("/orders")}
                  className="w-full flex items-center justify-center px-4 py-3 border bg-orange-500 cursor-pointer text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View All Orders
                </button>
              </div>
            </div>

            {/* Support */}
            <div className="bg-orange-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Need Help?
              </h3>
              <p className="text-gray-600 text-sm mb-3">
                Contact our support team for any questions about your order.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-orange-600">
                  <Mail className="w-4 h-4 mr-2" />
                  support@yourstore.com
                </div>
                <div className="flex items-center text-orange-600">
                  <Phone className="w-4 h-4 mr-2" />
                  +234 800 123 4567
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}