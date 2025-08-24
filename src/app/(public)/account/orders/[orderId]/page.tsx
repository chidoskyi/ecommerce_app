// pages/orders/[orderId].tsx or app/orders/[orderId]/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import Container from "@/components/reuse/Container";
import Link from "next/link";
import Image from "next/image";
import { 
  CheckCircle, 
  Clock, 
  Truck, 
  MapPin, 
  CreditCard, 
  Package,
  Download,
  ArrowLeft,
  Copy,
  ExternalLink
} from "lucide-react";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import { AppDispatch } from "@/app/store";
import {
    fetchOrderById,
    selectCurrentOrder,
    selectLoading,
    selectError,
  } from "@/app/store/slices/orderSlice";

interface OrderPageProps {
  params: {
    orderId: string;
  };
}

const OrderPage: React.FC<OrderPageProps> = ({ params }) => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [copied, setCopied] = useState(false);

  // Redux state
  const order = useSelector(selectCurrentOrder);
  const isLoading = useSelector(selectLoading);
  const error = useSelector(selectError);

  // Fetch order on mount
  useEffect(() => {
    if (params.orderId) {
      dispatch(fetchOrderById(params.orderId));
    }
  }, [dispatch, params.orderId]);

  // Copy order ID to clipboard
  const copyOrderId = async () => {
    if (order?.id) {
      try {
        await navigator.clipboard.writeText(order.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy order ID');
      }
    }
  };

  // Get status configuration
  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: 'Order Completed'
        };
      case 'processing':
      case 'confirmed':
        return {
          icon: <Package className="w-5 h-5" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          text: 'Processing Order'
        };
      case 'shipped':
      case 'in_transit':
        return {
          icon: <Truck className="w-5 h-5" />,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          text: 'Order Shipped'
        };
      case 'pending':
      default:
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          text: 'Order Pending'
        };
    }
  };

  const getPaymentStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'completed':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          text: 'Payment Successful'
        };
      case 'pending':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          text: 'Payment Pending'
        };
      case 'failed':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          text: 'Payment Failed'
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          text: 'Payment Status Unknown'
        };
    }
  };

  if (isLoading) {
    return (
      <Container className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
              <div className="space-y-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Order Not Found
            </h3>
            <p className="text-gray-600 mb-8">
              We couldn't find the order you're looking for. Please check the order ID and try again.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.back()}
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
              <Link href="/orders">
                <button className="bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                  View All Orders
                </button>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  if (!order) {
    return null;
  }

  const statusConfig = getStatusConfig(order.status || 'pending');
  const paymentStatusConfig = getPaymentStatusConfig(order.paymentStatus || 'pending');

  return (
    <Container className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <div className="flex gap-3">
            {order.paymentMethod === 'bank_transfer' && order.status === 'pending' && (
              <Link href={`/invoice/${order.id}`}>
                <button className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  View Invoice
                </button>
              </Link>
            )}
            
            <button className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
              <Download className="w-4 h-4" />
              Download Receipt
            </button>
          </div>
        </div>

        {/* Order Status Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Order Details
              </h1>
              <div className="flex items-center gap-2 text-gray-600">
                <span>Order ID: {order.id}</span>
                <button
                  onClick={copyOrderId}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                {copied && (
                  <span className="text-green-600 text-sm">Copied!</span>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color} mb-2`}>
                {statusConfig.icon}
                {statusConfig.text}
              </div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${paymentStatusConfig.bgColor} ${paymentStatusConfig.color}`}>
                <CreditCard className="w-4 h-4" />
                {paymentStatusConfig.text}
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Placed: {new Date(order.createdAt || '').toLocaleDateString()}</span>
              {order.estimatedDelivery && (
                <>
                  <span>•</span>
                  <span>Est. Delivery: {new Date(order.estimatedDelivery).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Items ({order.items?.length || 0})
              </h3>
              
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          width={64}
                          height={64}
                          alt={item.name || item.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {item.name || item.title}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>Qty: {item.quantity}</span>
                        {item.unit && <span>Unit: {item.unit}</span>}
                        {item.weight && <span>Weight: {item.weight}</span>}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        <PriceFormatter amount={item.totalPrice || (item.price * item.quantity)} showDecimals />
                      </p>
                      <p className="text-sm text-gray-600">
                        <PriceFormatter amount={item.price} showDecimals /> each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Shipping Address
              </h3>
              
              {order.shippingAddress ? (
                <div className="text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </p>
                  <p>{order.shippingAddress.address}</p>
                  <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && (
                    <p>Phone: {order.shippingAddress.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No shipping address provided</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <PriceFormatter amount={order.subtotal || 0} showDecimals />
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Fee</span>
                  <PriceFormatter amount={order.deliveryFee || 0} showDecimals />
                </div>
                
                {order.discountAmount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-<PriceFormatter amount={order.discountAmount} showDecimals /></span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-semibold text-gray-900">
                    <span>Total</span>
                    <PriceFormatter amount={order.total || 0} showDecimals />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Method
                </h4>
                <p className="text-gray-600 capitalize">
                  {order.paymentMethod?.replace('_', ' ') || 'Not specified'}
                </p>
                {order.paymentReference && (
                  <p className="text-sm text-gray-500 mt-1">
                    Ref: {order.paymentReference}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {order.paymentMethod === 'bank_transfer' && order.paymentStatus === 'pending' && (
                  <Link href={`/invoice/${order.id}`}>
                    <button className="w-full bg-orange-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                      Complete Payment
                    </button>
                  </Link>
                )}
                
                <Link href="/orders">
                  <button className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 transition-colors">
                    View All Orders
                  </button>
                </Link>
                
                <Link href="/">
                  <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                    Continue Shopping
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default OrderPage;