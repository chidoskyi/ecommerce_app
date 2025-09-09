"use client"

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Download, Package, ArrowRight, Mail, Truck, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectUserIdentification, clearEntireCart } from "@/app/store/slices/cartSlice";
import { toast } from 'react-toastify';
import { StorageUtil } from '@/lib/storageKeys';
import { useUser } from '@clerk/nextjs';
import { ensureUserIdentification } from '@/utils/userIdentification';
// import { toast } from 'react-hot-toast';

export interface OrderData {
  orderNumber: string;
  transactionId: string;
  amount: string;
  paymentMethod: string;
  customerEmail: string;
  estimatedDelivery: string;
  status: string;
  paymentStatus: string;
  items: Array<{
    title: string;
    quantity: number;
    totalPrice: number;
  }>;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    country: string;
  };
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  order?: OrderData;
  error?: string;
  paymentMethod?: string;
}

export default function PaymentSuccess() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cartCleared, setCartCleared] = useState(false);
  
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    userId, 
    token,
    // err 
  } = useAuth();
  const { user: clerkUser, isSignedIn } = useUser();
  const dispatch = useAppDispatch();
  const userIdentification = useAppSelector(selectUserIdentification);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get parameters from URL
  const reference = searchParams?.get('reference') || searchParams?.get('trxref');
  const paymentMethod = searchParams?.get('method') || 'paystack'; // Default to paystack
  const orderId = searchParams?.get('orderId');

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);
  }, []);

  // useEffect(() => {
  //   // Wait for auth to complete before verifying payment
  //   if (!authLoading) {
  //     if (!isAuthenticated) {
  //       // Redirect to login if not authenticated
  //       setError('Please log in to view your order');
  //       setIsLoading(false);
  //       setIsVerifying(false);
  //       // Optionally redirect to login page
  //       // router.push('/login');
  //       return;
  //     }

  //     // Verify payment once authenticated
  //     if (reference && token) {
  //       verifyPayment();
  //     } else if (!reference) {
  //       setError('No payment reference found');
  //       setIsLoading(false);
  //       setIsVerifying(false);
  //     }
  //   }
  // }, [authLoading, isAuthenticated, reference, token]);


  const clearCartAfterPayment = async () => {
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

  const verifyPayment = async () => {
    if (!token) {
      setError('Authentication required');
      setIsLoading(false);
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);
    setIsLoading(true);
    setError(null);

    try {
      // Determine which verification endpoint to use
      const verificationEndpoint = paymentMethod === 'opay' 
        ? '/api/payments/opay/verify'
        : '/api/payments/paystack/verify';

      console.log(`Verifying payment with ${paymentMethod}:`, reference);

      const response = await fetch(verificationEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ 
          reference,
          orderId: orderId || undefined
        }),
      });

      const data = await response.json();
      console.log('Verification response:', data);

      if (response.ok && data.success) {
        setVerificationResult({
          success: true,
          verified: true,
          order: data.order,
          paymentMethod: paymentMethod
        });

        if (data.order) {
          setOrderData(data.order);
          // Clear cart after successful payment verification
          await clearCartAfterPayment();
        }
      } else {
        setVerificationResult({
          success: false,
          verified: false,
          error: data.error || 'Payment verification failed',
          paymentMethod: paymentMethod
        });
        setError(data.error || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      const errorMessage = 'Failed to verify payment. Please contact support.';
      setError(errorMessage);
      setVerificationResult({
        success: false,
        verified: false,
        error: errorMessage,
        paymentMethod: paymentMethod
      });
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!orderData?.orderNumber || !token) return;
    
    try {
      const response = await fetch('/api/orders/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token,
          'x-user-id': userId || '',
        },
        body: JSON.stringify({ 
          orderNumber: orderData.orderNumber 
        }),
      });

      if (response.ok) {
        // Create download link for PDF
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `receipt-${orderData.orderNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download receipt. Please try again.');
      }
    } catch (error) {
      console.error('Receipt download error:', error);
      alert('Failed to download receipt. Please try again.');
    }
  };

  const handleTrackOrder = () => {
    if (orderData?.orderNumber) {
      router.push(`/track-order/${orderData.orderNumber}`);
    }
  };

  const handleContinueShopping = () => {
    router.push('/');
  };

  const handleRetryVerification = () => {
    verifyPayment();
  };

  const handleLogin = () => {
    router.push('/login');
  };

  // Authentication loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader className="w-12 h-12 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Loading...
          </h1>
          <p className="text-gray-600">
            Please wait while we verify your authentication...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please log in to view your payment confirmation and order details.
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={handleLogin}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Log In
            </button>
            <button
              onClick={handleContinueShopping}
              className="border-2 border-orange-500 text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-orange-500 hover:text-white transition-all duration-300"
            >
              Return to Store
            </button>
          </div>
          {reference && (
            <div className="mt-4 text-sm text-gray-500">
              Payment Reference: {reference}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Payment verification loading state
  if (isLoading || isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader className="w-12 h-12 text-white animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Verifying Payment
          </h1>
          <p className="text-gray-600">
            Please wait while we confirm your payment...
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Reference: {reference}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !verificationResult?.verified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Payment Verification Failed
          </h1>
          <p className="text-gray-600 mb-6">
            {error || 'We could not verify your payment. Please contact support.'}
          </p>
          <div className="flex flex-col gap-4">
            <button
              onClick={handleRetryVerification}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Retry Verification
            </button>
            <button
              onClick={handleContinueShopping}
              className="border-2 border-orange-500 text-orange-600 px-6 py-3 rounded-xl font-semibold hover:bg-orange-500 hover:text-white transition-all duration-300"
            >
              Return to Store
            </button>
          </div>
          {reference && (
            <div className="mt-4 text-sm text-gray-500">
              Reference: {reference}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success state with real data
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 flex items-center justify-center p-4">
      <div className={`max-w-4xl w-full transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Success Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-orange-600"></div>
          
          {/* Animated checkmark */}
          <div className="relative z-10 mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Payment Successful!
            </h1>
            
            <p className="text-xl text-gray-600 leading-relaxed">
              Thank you for your purchase! Your order has been confirmed and you&apos;ll receive a confirmation email shortly.
            </p>
          </div>

          {/* Order Details */}
          {orderData && (
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-6 mb-8 border border-orange-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600 mr-2" />
                Order Details
              </h2>
              
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700">Order Number:</span>
                  <span className="text-orange-600 font-mono font-bold">{orderData.orderNumber}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700">Amount Paid:</span>
                  <span className="text-orange-600 font-bold text-lg">{orderData.amount}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700">Transaction ID:</span>
                  <span className="text-gray-600 font-mono text-sm">{orderData.transactionId}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700">Payment Method:</span>
                  <span className="text-gray-600 font-mono capitalize">{orderData.paymentMethod}</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700">Status:</span>
                  <span className="text-green-600 font-semibold capitalize">{orderData.status}</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="font-semibold text-gray-700">Email:</span>
                  <span className="text-gray-600">{orderData.customerEmail}</span>
                </div>
              </div>

              {/* Order Items */}
              {orderData.items && orderData.items.length > 0 && (
                <div className="mt-6 pt-6 border-t border-orange-200">
                  <h3 className="font-semibold text-gray-700 mb-4">Items Ordered:</h3>
                  <div className="space-y-2">
                    {orderData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 bg-white rounded-lg px-4">
                        <span className="text-gray-700">{item.title}</span>
                        <span className="text-gray-600">Qty: {item.quantity}</span>
                        <span className="text-orange-600 font-semibold">₦{item.totalPrice.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {orderData.shippingAddress && (
                <div className="mt-6 pt-6 border-t border-orange-200 text-left">
                  <h3 className="font-semibold text-gray-700 mb-2">Shipping Address:</h3>
                  <div className="text-gray-600 text-sm">
                    <p>{orderData.shippingAddress.firstName} {orderData.shippingAddress.lastName}</p>
                    <p>{orderData.shippingAddress.address}</p>
                    <p>{orderData.shippingAddress.city}, {orderData.shippingAddress.state}</p>
                    <p>{orderData.shippingAddress.country}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={handleDownloadReceipt}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center cursor-pointer"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Receipt
            </button>
            
            <button
              onClick={handleTrackOrder}
              className="flex-1 border-2 border-orange-500 text-orange-600 px-8 py-4 rounded-xl font-semibold hover:bg-orange-500 hover:text-white transform hover:scale-105 transition-all duration-300 flex items-center justify-center cursor-pointer"
            >
              <Truck className="w-5 h-5 mr-2" />
              Track Order
            </button>
          </div>

          {/* Next Steps */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">What happens next?</h3>
            
            <div className="grid md:grid-cols-2 gap-4 text-left max-w-4xl mx-auto">
              <div className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors duration-300">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                  1
                </div>
                <div>
                  <div className="font-semibold text-gray-800 mb-1">Email Confirmation</div>
                  <div className="text-gray-600 text-sm">You&apos;ll receive a confirmation email within 5 minutes</div>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors duration-300">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                  2
                </div>
                <div>
                  <div className="font-semibold text-gray-800 mb-1">Order Processing</div>
                  <div className="text-gray-600 text-sm">Your order will be processed within 24 hours</div>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors duration-300">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                  3
                </div>
                <div>
                  <div className="font-semibold text-gray-800 mb-1">Shipping Notification</div>
                  <div className="text-gray-600 text-sm">You&apos;ll get tracking info once your order ships</div>
                </div>
              </div>
              
              <div className="flex items-start p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors duration-300">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                  4
                </div>
                <div>
                  <div className="font-semibold text-gray-800 mb-1">Delivery</div>
                  <div className="text-gray-600 text-sm">Estimated delivery: {orderData?.estimatedDelivery || '3-5 business days'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Shopping */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleContinueShopping}
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-semibold transition-colors duration-300 group cursor-pointer"
            >
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* Support Info */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-2">
            Need help? Contact our support team
          </p>
          <div className="flex items-center justify-center text-orange-600 hover:text-orange-700 transition-colors duration-300">
            <Mail className="w-4 h-4 mr-2" />
            <span className="font-medium">support@yourstore.com</span>
          </div>
        </div>

        {/* Payment Method Badge */}
        {verificationResult?.paymentMethod && (
          <div className="mt-4 text-center">
            <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium capitalize">
              Verified via {verificationResult.paymentMethod}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}