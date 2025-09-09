// components/checkout/OrderSummary.tsx
"use client";

import React from "react";
import { OrderItem } from "@/types/orders";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";

interface OrderSummaryProps {
  orderItems: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  voucherCode: string;
  onVoucherCodeChange: (code: string) => void;
  onApplyVoucher: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  // orderItems,
  subtotal,
  deliveryFee,
  total,
  voucherCode,
  onVoucherCodeChange,
  onApplyVoucher,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        Order Summary
      </h3>

      {/* Price Breakdown */}
      <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold">
            <PriceFormatter amount={subtotal} showDecimals />
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Delivery Fee</span>
          <span className="font-semibold">
            <PriceFormatter amount={deliveryFee} showDecimals />
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between text-xl font-bold mb-6">
        <span>Total</span>
        <span>
          <PriceFormatter amount={total} showDecimals />
        </span>
      </div>

      {/* Voucher Code Section */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">
          Voucher Code
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-4">
          <input
            type="text"
            placeholder="Enter code"
            value={voucherCode}
            onChange={(e) => onVoucherCodeChange(e.target.value)}
            className="w-full px-4 py-3 sm:py-2 text-base sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
          />
          <button
            onClick={onApplyVoucher}
            className="bg-orange-600 cursor-pointer text-white px-6 py-3 sm:py-2 text-base sm:text-sm rounded-lg font-semibold hover:bg-orange-700 transition-colors whitespace-nowrap"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="shrink-0 border h-[1px] border-gray-300 w-full my-6"></div>

      {/* Terms */}
      <p className="text-xs text-gray-500 text-center">
        By placing your order, you agree to our{" "}
        <a href="#" className="text-orange-600 hover:underline">
          Return Policy
        </a>
        .
      </p>
    </div>
  );
};

export default OrderSummary;