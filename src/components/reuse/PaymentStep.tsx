// components/checkout/PaymentStep.tsx (Enhanced for Bank Transfer with Invoice Redirect)
"use client";

import React, { useEffect } from "react";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import {
  CreditCard,
  Wallet,
  Building2,
  Smartphone,
  FileText,
  Info,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { PaymentStepProps } from "@/types/checkout";
import {
  fetchWalletBalance,
  selectIsLoading,
  selectTotalBalance,
} from "@/app/store/slices/walletSlice";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/app/store";

const PaymentStep: React.FC<PaymentStepProps> = ({
  selectedPayment,
  walletBalance: propWalletBalance, // Rename prop to avoid conflict
  onPaymentSelect,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const totalBalance = useSelector(selectTotalBalance);
  const isLoading = useSelector(selectIsLoading);

  // Use the Redux wallet balance if available, otherwise use the prop
  const walletBalance = totalBalance > 0 ? totalBalance : propWalletBalance;

  // Fetch wallet balance on component mount
  useEffect(() => {
    dispatch(fetchWalletBalance());
  }, [dispatch]);

  const paymentMethods = [
    {
      id: "paystack",
      name: "Paystack",
      description: "Pay securely with card, bank, or USSD",
      icon: <CreditCard className="w-6 h-6 text-blue-600" />,
      available: true,
      processingInfo:
        "You'll be redirected to Paystack's secure payment page to complete your payment",
      nextStep: "Complete payment → Order confirmed",
    },
    {
      id: "opay",
      name: "Opay",
      description: "Pay with your Opay wallet or card",
      icon: <Smartphone className="w-6 h-6 text-green-600" />,
      available: true,
      processingInfo:
        "You'll be redirected to Opay's secure payment platform to complete your payment",
      nextStep: "Complete payment → Order confirmed",
    },
    {
      id: "wallet",
      name: "Shop Wallet",
      description: "Use your Shop wallet balance",
      icon: <Wallet className="w-6 h-6 text-purple-600" />,
      available: walletBalance > 0,
      balance: walletBalance, // Fixed: use walletBalance instead of totalBalance
      processingInfo:
        "Payment will be deducted from your wallet balance instantly",
      nextStep: "Instant payment → Order confirmed",
    },
    {
      id: "bank_transfer",
      name: "Bank Transfer",
      description: "Pay via direct bank transfer",
      icon: <Building2 className="w-6 h-6 text-orange-600" />,
      available: true,
      processingInfo: "Generate invoice with bank details for manual transfer",
      nextStep: "Generate invoice → Transfer payment → Admin confirmation",
      isManual: true,
    },
  ];

  const selectedMethod = paymentMethods.find(
    (method) => method.id === selectedPayment
  );

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Payment Method
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 h-full relative ${
                  selectedPayment === method.id
                    ? "border-orange-500 bg-orange-50 ring-2 ring-orange-200"
                    : method.available
                    ? "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50"
                    : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                }`}
                onClick={() => method.available && onPaymentSelect(method.id)}
              >
                {/* Manual payment indicator */}
                {method.isManual && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Manual
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{method.icon}</div>

                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">
                      {method.name}
                    </h3>

                    <p className="text-sm text-gray-600 mb-2">
                      {method.description}
                    </p>

                    {/* Next steps indicator */}
                    {selectedPayment === method.id && (
                      <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        <span>{method.nextStep}</span>
                      </div>
                    )}

                    {/* Wallet-specific content */}
                    {method.id === "wallet" && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">
                            Balance:
                          </span>

                          {isLoading ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                              <span className="text-xs text-gray-500">
                                Loading...
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-gray-900">
                              <PriceFormatter
                                amount={method.balance || 0}
                                showDecimals
                              />
                            </span>
                          )}
                        </div>

                        {method.balance === 0 && !isLoading && (
                          <button
                            className="mt-2 w-full text-xs bg-orange-600 text-white px-3 py-2 rounded-md font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle fund wallet logic
                              console.log("Fund wallet clicked");
                            }}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Processing...
                              </>
                            ) : (
                              "Fund Wallet"
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Bank Transfer specific content */}
                    {method.id === "bank_transfer" &&
                      selectedPayment === method.id && (
                        <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-start gap-2">
                            <FileText className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-orange-800">
                              <p className="font-medium mb-2">
                                Bank Transfer Process:
                              </p>
                              <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                                    1
                                  </div>
                                  <span>
                                    Click &quot;Generate Invoice&quot; to create
                                    your order
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                                    2
                                  </div>
                                  <span>
                                    You&quot;ll be redirected to your invoice
                                    with bank details
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                                    3
                                  </div>
                                  <span>
                                    Transfer the exact amount to the provided
                                    account
                                  </span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 rounded-full bg-orange-600 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                                    4
                                  </div>
                                  <span>
                                    Admin will confirm payment and process your
                                    order
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 p-2 bg-orange-100 rounded border border-orange-300">
                            <div className="flex items-center gap-2">
                              <Info className="w-4 h-4 text-orange-700" />
                              <span className="text-xs text-orange-800 font-medium">
                                Processing time: 1-2 business days after
                                transfer
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* Selection indicator */}
                    {selectedPayment === method.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-medium text-green-600">
                          Selected
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Method Information */}
          {selectedMethod && (
            <div
              className={`rounded-lg p-4 mb-4 border ${
                selectedMethod.id === "bank_transfer"
                  ? "bg-orange-50 border-orange-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <Info
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    selectedMethod.id === "bank_transfer"
                      ? "text-orange-600"
                      : "text-blue-600"
                  }`}
                />
                <div>
                  <h4
                    className={`text-sm font-semibold mb-1 ${
                      selectedMethod.id === "bank_transfer"
                        ? "text-orange-900"
                        : "text-blue-900"
                    }`}
                  >
                    {selectedMethod.name} - What happens next?
                  </h4>
                  <p
                    className={`text-sm ${
                      selectedMethod.id === "bank_transfer"
                        ? "text-orange-700"
                        : "text-blue-700"
                    }`}
                  >
                    {selectedMethod.processingInfo}
                  </p>

                  {/* Additional info for bank transfer */}
                  {selectedMethod.id === "bank_transfer" && (
                    <div className="mt-2">
                      <div className="bg-white rounded p-2 border border-orange-200">
                        <p className="text-xs text-orange-800 font-medium">
                          ⚡ Quick tip: Include your order number in the
                          transfer description for faster processing
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Additional info for wallet with insufficient balance */}
                  {selectedMethod.id === "wallet" && walletBalance === 0 && (
                    <div className="mt-2 text-xs text-blue-600">
                      <p>
                        <strong>Note:</strong> You need to fund your wallet
                        before you can use this payment method.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Security notice */}
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-xs text-gray-600">
                All payments are secured with 256-bit SSL encryption. Your
                payment information is never stored on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentStep;
