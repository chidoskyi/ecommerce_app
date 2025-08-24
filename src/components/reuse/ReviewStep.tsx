// components/checkout/ReviewStep.tsx (Enhanced)
"use client";

import React from "react";
import { Truck, CreditCard, Wallet, Building2, Smartphone, Image as ImageIcon } from "lucide-react";
import { OrderItem } from "@/types/orders";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import Image from "next/image";

interface ReviewStepProps {
  orderItems: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  selectedPayment: string;
  onPrevious?: () => void;
  onPlaceOrder?: () => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({
  orderItems,
  subtotal,
  deliveryFee,
  total,
  selectedPayment,
}) => {
  const getPaymentMethodDisplay = (method: string) => {
    const methods = {
      paystack: {
        name: "Paystack",
        icon: <CreditCard className="w-5 h-5 text-blue-600" />,
        description: "Card/Bank/USSD Payment",
      },
      opay: {
        name: "Opay",
        icon: <Smartphone className="w-5 h-5 text-green-600" />,
        description: "Mobile Wallet Payment",
      },
      wallet: {
        name: "Shop Grocery Wallet",
        icon: <Wallet className="w-5 h-5 text-orange-600" />,
        description: "Wallet Balance Payment",
      },
      bank_transfer: {
        name: "Bank Transfer",
        icon: <Building2 className="w-5 h-5 text-purple-600" />,
        description: "Direct Bank Transfer",
      },
    };

    return (
      methods[method as keyof typeof methods] || {
        name: method,
        icon: <CreditCard className="w-5 h-5 text-gray-600" />,
        description: "Payment Method",
      }
    );
  };

  const paymentMethod = getPaymentMethodDisplay(selectedPayment);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Review Your Order
          </h2>
          <p className="text-gray-600 mb-8">
            Please review your order details before placing your order.
          </p>

          {/* Order Summary in Review */}
          <div className="bg-gray-50 rounded-xl p-2 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600" />
              Order Details
            </h3>

            <div className="space-y-4 mb-6">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0"
                >
                  {/* Product Info (Left Side) */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Image Container */}
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          width={56}
                          height={56}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Title and Quantity */}
                    <div className="min-w-0">
                      <p className="text-gray-900 font-medium truncate">
                        {item.title}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Qty: {item.quantity}
                      </p>
                    </div>
                  </div>

                  {/* Price (Right Side) */}
                  <div className="ml-4 flex-shrink-0">
                    <PriceFormatter
                      amount={item.price * item.quantity}
                      showDecimals
                      className="font-semibold text-gray-900"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Subtotal</span>
                <span>
                  <PriceFormatter amount={subtotal} showDecimals />
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Delivery Fee</span>
                <span>
                  <PriceFormatter amount={deliveryFee} showDecimals />
                </span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-300 pt-4">
                <span>Total Amount</span>
                <span className="text-orange-600">
                  <PriceFormatter amount={total} showDecimals />
                </span>
              </div>
            </div>
          </div>

          {/* Selected Payment Method */}
          <div className="bg-orange-50 rounded-xl p-2 mb-6">
            <h4 className="font-semibold text-orange-600 mb-3 flex items-center gap-2">
              {paymentMethod.icon}
              Payment Method
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold text-lg">
                  {paymentMethod.name}
                </p>
                <p className="text-gray-600 text-sm">
                  {paymentMethod.description}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ✓ Confirmed
                </span>
              </div>
            </div>

            {selectedPayment === "bank_transfer" && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h5 className="font-semibold text-purple-800 mb-2">
                  Bank Transfer Details:
                </h5>
                <div className="text-sm text-purple-700 space-y-1">
                  {process.env.NEXT_PUBLIC_BANK_ONE_NAME && (
                    <div className="mt-2 pt-2 border-t border-blue-100">
                      <p className="font-medium">
                        {process.env.NEXT_PUBLIC_BANK_ONE_NAME}
                      </p>
                      <p>
                        Account Name:{" "}
                        {process.env.NEXT_PUBLIC_BANK_ONE_ACCOUNT_NAME}
                      </p>
                      <p>
                        Account No:{" "}
                        {process.env.NEXT_PUBLIC_BANK_ONE_ACCOUNT_NUMBER}
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-sm text-purple-700 space-y-1">
                  {process.env.NEXT_PUBLIC_BANK_TWO_NAME && (
                    <div className="mt-2 pt-2 border-t border-blue-100">
                      <p className="font-medium">
                        {process.env.NEXT_PUBLIC_BANK_TWO_NAME}
                      </p>
                      <p>
                        Account Name:{" "}
                        {process.env.NEXT_PUBLIC_BANK_TWO_ACCOUNT_NAME}
                      </p>
                      <p>
                        Account No:{" "}
                        {process.env.NEXT_PUBLIC_BANK_TWO_ACCOUNT_NUMBER}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-3 p-2 bg-purple-100 rounded text-xs text-purple-600">
                  <strong>Important:</strong> After placing your order, you will
                  receive payment instructions via email. Please complete the
                  transfer within 24 hours to avoid cancellation.
                </div>
              </div>
            )}
          </div>

          {/* Important Notes */}
          <div className="bg-blue-50 rounded-xl p-2 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2">Order Notes:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • You will receive an order confirmation email after successful
                payment
              </li>
              <li>• Estimated delivery time: 30-45 minutes</li>
              <li>• Contact customer support for any issues with your order</li>
              {selectedPayment === "bank_transfer" && (
                <li>
                  • <strong>Bank Transfer:</strong> Order will be processed
                  after payment confirmation
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReviewStep;
