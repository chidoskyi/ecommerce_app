// components/invoice/FullPageInvoice.tsx - Fixed with URL parameter extraction

"use client";

import { useState, useRef, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/store/hooks";
import { Button } from "@/components/ui/button";
import {
  Download,
  Printer,
  ArrowLeft,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import   { Separator } from "@/components/ui/separator";
import { Order } from "@/types/orders";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import {
  fetchOrderById,
  selectCurrentOrder,
  selectLoading,
  selectError,
} from "@/app/store/slices/orderSlice";
import { useRouter, useParams, usePathname } from "next/navigation";
import { getItemPrice } from "@/utils/priceHelpers";

export interface InvoiceProps {
  orderId?: string;
  order?: Order;
  onBack?: () => void;
}

export default function FullPageInvoice({
  orderId: propOrderId,
  order: propOrder,
  onBack,
}: InvoiceProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // FIXED: Extract orderId from URL if not provided as prop
  const orderId =
    propOrderId ||
    (params?.orderId as string) ||
    (() => {
      // Fallback: extract from pathname if params doesn't work
      const pathMatch = pathname.match(/\/invoice\/([^\/]+)/);
      return pathMatch ? pathMatch[1] : undefined;
    })();

  console.log("🆔 OrderId resolution:", {
    propOrderId,
    paramsOrderId: params?.orderId,
    pathName: pathname,
    finalOrderId: orderId,
  });

  // Safe Redux state selectors
  const reduxOrder = useAppSelector(selectCurrentOrder);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);

  // Use prop order or Redux order
  const order = propOrder || reduxOrder;

  // FIXED: Prevent infinite loop with better logic
  useEffect(() => {
    console.log("🔍 Invoice useEffect:", {
      propOrder: !!propOrder,
      orderId,
      reduxOrder: !!reduxOrder,
      loading,
      error,
      hasAttemptedFetch,
    });

    // Only fetch if:
    // 1. We have an orderId
    // 2. No prop order was provided
    // 3. No order in Redux OR the Redux order ID doesn't match current orderId
    // 4. Not currently loading
    // 5. Haven't attempted fetch for this specific orderId
    const shouldFetch =
      orderId &&
      !propOrder &&
      (!reduxOrder || reduxOrder.id !== orderId) &&
      !loading &&
      !hasAttemptedFetch;

    if (shouldFetch) {
      console.log("🚀 Fetching order:", orderId);
      setLocalError(null);
      setHasAttemptedFetch(true);

      dispatch(fetchOrderById(orderId))
        .unwrap()
        .then((fetchedOrder) => {
          console.log("✅ Order fetched successfully:", fetchedOrder);
          if (!fetchedOrder) {
            setLocalError("Order not found");
          }
        })
        .catch((err) => {
          console.error("❌ Failed to fetch order:", err);
          setLocalError(err.toString() || "Failed to fetch order");
        });
    }
  }, [
    orderId,
    propOrder,
    reduxOrder?.id,
    loading,
    hasAttemptedFetch,
    dispatch,
  ]);

  // Reset fetch attempt when orderId changes
  useEffect(() => {
    setHasAttemptedFetch(false);
    setLocalError(null);
  }, [orderId]);

  // Bank account details from environment variables
  const bankAccounts = [
    {
      name: process.env.NEXT_PUBLIC_BANK_ONE_NAME || "First Bank PLC",
      accountName:
        process.env.NEXT_PUBLIC_BANK_ONE_ACCOUNT_NAME || "Shop Grocery Limited",
      accountNumber:
        process.env.NEXT_PUBLIC_BANK_ONE_ACCOUNT_NUMBER || "1234567890",
    },
    {
      name: process.env.NEXT_PUBLIC_BANK_TWO_NAME || "GTBank PLC",
      accountName:
        process.env.NEXT_PUBLIC_BANK_TWO_ACCOUNT_NAME || "Shop Grocery Limited",
      accountNumber:
        process.env.NEXT_PUBLIC_BANK_TWO_ACCOUNT_NUMBER || "0987654321",
    },
  ].filter((bank) => bank.name && bank.accountNumber);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    window.print();
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getPaymentStatusInfo = (
    paymentStatus: string,
    paymentMethod: string
  ) => {
    if (paymentMethod === "bank_transfer") {
      switch (paymentStatus) {
        case "PENDING":
          return {
            icon: <Clock className="w-5 h-5 text-orange-600" />,
            text: "Awaiting Payment",
            bgColor: "bg-orange-100",
            textColor: "text-orange-800",
            description: "Transfer the amount below to complete your order",
          };
        case "PAID":
          return {
            icon: <CheckCircle className="w-5 h-5 text-green-600" />,
            text: "Payment Received",
            bgColor: "bg-green-100",
            textColor: "text-green-800",
            description: "Payment confirmed. Your order is being processed.",
          };
        case "FAILED":
          return {
            icon: <AlertCircle className="w-5 h-5 text-red-600" />,
            text: "Payment Issues",
            bgColor: "bg-red-100",
            textColor: "text-red-800",
            description: "Please contact support for assistance",
          };
        default:
          return {
            icon: <Clock className="w-5 h-5 text-gray-600" />,
            text: "Pending Status",
            bgColor: "bg-gray-100",
            textColor: "text-gray-800",
            description: "",
          };
      }
    }

    return {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      text: "Completed",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      description: "",
    };
  };

 

  const handleOnBack = () => {
    // router.push('/checkout');
    // or
    router.back(); // if you want to go to the previous page
  };

  // IMPROVED: Loading state logic
  if (loading || (orderId && !order && !localError && hasAttemptedFetch)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
          {orderId && (
            <p className="text-xs text-gray-500">Order ID: {orderId}</p>
          )}
        </div>
      </div>
    );
  }

  // IMPROVED: Error state logic
  const displayError = error || localError;
  if (displayError && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Error loading invoice</p>
          <p className="text-sm text-gray-600 mb-4">{displayError}</p>
          <div className="space-y-2">
            {orderId && (
              <Button
                onClick={() => {
                  setLocalError(null);
                  setHasAttemptedFetch(false); // Reset to allow retry
                }}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            )}
            {onBack && (
              <Button onClick={onBack} variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              onClick={() => router.push("/checkout")}
              variant="outline"
              className="w-full"
            >
              Return to Checkout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // IMPROVED: No order found state
  if (!order && hasAttemptedFetch && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Invoice not found</p>
          {orderId && (
            <p className="text-sm text-gray-500 mb-4">
              We couldn&apos;t find an invoice for order: {orderId}
            </p>
          )}
          <div className="space-y-2">
            {orderId && (
              <Button
                onClick={() => {
                  setLocalError(null);
                  setHasAttemptedFetch(false);
                }}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            )}
            {onBack && (
              <Button onClick={onBack} variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button onClick={() => router.push("/checkout")} className="w-full">
              Return to Checkout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ADDED: Debug info for missing orderId (development only)
  if (!orderId && process.env.NODE_ENV === "development") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-yellow-600 mb-4">
            Development Debug: Missing Order ID
          </p>
          <div className="text-left bg-gray-100 p-4 rounded text-xs">
            <p>
              <strong>Current params:</strong> {JSON.stringify(params)}
            </p>
            <p>
              <strong>Pathname:</strong> {pathname}
            </p>
            <p>
              <strong>PropOrderId:</strong> {propOrderId || "undefined"}
            </p>
          </div>
          <Button
            onClick={() => router.push("/checkout")}
            className="w-full mt-4"
          >
            Return to Checkout
          </Button>
        </div>
      </div>
    );
  }

  // If we get here without an order, show loading
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  const paymentStatusInfo = getPaymentStatusInfo(
    order.paymentStatus || "PENDING",
    order.paymentMethod || "bank_transfer"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }

          .invoice-container {
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }

          .sticky {
            position: static !important;
          }
        }
      `}</style>

      {/* Action Bar - Hidden in print */}
      <div className="print:hidden bg-transparent px-3 sm:px-6 py-4 sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            {/* {onBack && ( */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOnBack}
                className="w-full sm:w-auto cursor-pointer"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            {/* )} */}
          </div>
          <div className="flex gap-2 justify-end order-1 sm:order-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-white/90 backdrop-blur-sm border-orange-200 hover:bg-orange-50 flex-1 sm:flex-initial cursor-pointer"
            >
              <Printer className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Print</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownload}
              className="bg-orange-600 hover:bg-orange-700 text-white shadow-lg flex-1 sm:flex-initial cursor-pointer"
            >
              <Download className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Download</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-5xl mx-auto p-3 sm:p-6 print:p-0">
        <div className="invoice-container bg-orange-50 rounded-lg shadow-md border border-gray-200 print:shadow-none print:border-none">
          <div ref={invoiceRef} className="p-4 sm:p-6 lg:p-8 print:p-6">
            {/* Payment Status Banner - Only for bank transfer, hidden in print */}
            {order.paymentMethod === "bank_transfer" && (
              <div
                className={`print:hidden mb-8 p-4 rounded-lg border ${paymentStatusInfo.bgColor} border-opacity-50`}
              >
                <div className="flex items-center gap-3">
                  {paymentStatusInfo.icon}
                  <div>
                    <h3
                      className={`font-semibold ${paymentStatusInfo.textColor}`}
                    >
                      {paymentStatusInfo.text}
                    </h3>
                    {paymentStatusInfo.description && (
                      <p
                        className={`text-sm ${paymentStatusInfo.textColor} opacity-80`}
                      >
                        {paymentStatusInfo.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Header */}
            <div className="mb-8 sm:mb-12">
              {/* Mobile Layout */}
              <div className="sm:hidden">
                <h2 className="text-2xl font-bold text-gray-800">INVOICE</h2>
                <p className="text-gray-600 text-base mt-2 mb-4">
                  # INV-{order.orderNumber || order.id}
                </p>
                <h3 className="font-bold text-gray-800 text-lg">
                  Shop Grocery
                </h3>
                <div className="text-sm text-gray-600 mt-2 space-y-1">
                  <p>
                    {process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
                      "123 Business Street, Business City, BC 12345"}
                  </p>
                  <p>
                    Phone:{" "}
                    {process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
                      "+1 (555) 123-4567"}
                  </p>
                  <p>
                    Email:{" "}
                    {process.env.NEXT_PUBLIC_COMPANY_EMAIL ||
                      "contact@shopgrocery.com"}
                  </p>
                  <p className="mb-3">
                    Reg:{" "}
                    {process.env.NEXT_PUBLIC_COMPANY_NUMBER || "08161235562"}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded font-bold text-xs inline-block ${
                    order.paymentStatus === "PAID"
                      ? "bg-green-500 text-white"
                      : "bg-orange-500 text-white"
                  }`}
                >
                  {order.paymentStatus === "PAID" ? "PAID" : "UNPAID"}
                </span>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex justify-between items-start">
                <div>
                  <h2 className="text-3xl lg:text-4xl font-bold text-gray-800">
                    INVOICE
                  </h2>
                  <p className="text-gray-600 text-lg mt-2">
                    # INV-{order.orderNumber || order.id}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-gray-800 text-lg sm:text-xl">
                    Shop Grocery
                  </h3>
                  <div className="text-sm text-gray-600 mt-2 space-y-1">
                    <p>
                      {process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
                        "123 Business Street, Business City, BC 12345"}
                    </p>
                    <p>
                      Phone:{" "}
                      {process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
                        "+1 (555) 123-4567"}
                    </p>
                    <p>
                      Email:{" "}
                      {process.env.NEXT_PUBLIC_COMPANY_EMAIL ||
                        "contact@shopgrocery.com"}
                    </p>
                    <p className="mb-3">
                      Reg:{" "}
                      {process.env.NEXT_PUBLIC_COMPANY_NUMBER || "08161235562"}
                    </p>
                  </div>
                  <span
                    className={`px-3 sm:px-4 py-1 sm:py-2 rounded font-bold text-xs sm:text-sm inline-block ${
                      order.paymentStatus === "PAID"
                        ? "bg-green-500 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {order.paymentStatus === "PAID" ? "PAID" : "UNPAID"}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoice Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
              <div>
                <h4 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-base sm:text-lg">
                  Bill To:
                </h4>
                <div className="bg-gray-100 p-3 sm:p-4 rounded-lg border print:bg-gray-50">
                  <p className="font-medium text-gray-900 text-sm sm:text-base">
                    {order.shippingAddress?.firstName}{" "}
                    {order.shippingAddress?.lastName}
                  </p>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {order.shippingAddress?.address}
                  </p>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {order.shippingAddress?.city},{" "}
                    {order.shippingAddress?.state} {order.shippingAddress?.zip}
                  </p>
                  <p className="text-gray-600 text-sm sm:text-base">
                    {order.shippingAddress?.country}
                  </p>
                  {order.shippingAddress?.phone && (
                    <p className="text-gray-600 text-sm sm:text-base">
                      Phone: {order.shippingAddress.phone}
                    </p>
                  )}
                  {order.email && (
                    <p className="text-gray-600 text-sm sm:text-base">
                      Email: {order.email}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-base sm:text-lg">
                  Invoice Details:
                </h4>
                <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Invoice Date:</span>
                    <span className="text-gray-900">
                      {formatDate(order.createdAt || new Date().toISOString())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Order ID:</span>
                    <span className="text-gray-900">#{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Payment Method:</span>
                    <span className="text-gray-900 capitalize">
                      {order.paymentMethod?.replace("_", " ") ||
                        "Bank Transfer"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Status:</span>
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        order.status === "CONFIRMED"
                          ? "bg-green-100 text-green-800"
                          : order.status === "PROCESSING"
                          ? "bg-blue-100 text-blue-800"
                          : order.status === "PENDING"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {order.status || "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Due Date:</span>
                    <span className="text-gray-900">
                      {formatDate(
                        new Date(
                          Date.now() + 7 * 24 * 60 * 60 * 1000
                        ).toISOString()
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Transfer Details - Only show for bank transfer and pending payment, hidden in print */}
            {order.paymentMethod === "bank_transfer" &&
              order.paymentStatus === "PENDING" &&
              bankAccounts.length > 0 && (
                <div className="print:hidden mb-8 sm:mb-12">
                  <h4 className="font-semibold text-gray-800 mb-4 text-base sm:text-lg text-red-600">
                    ⚡ Bank Transfer Details - Pay to Complete Order
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {bankAccounts.map((bank, index) => (
                      <div
                        key={index}
                        className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4"
                      >
                        <h5 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                          {bank.name}
                          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                            Option {index + 1}
                          </span>
                        </h5>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">
                              Account Name:
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900 font-semibold">
                                {bank.accountName}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  copyToClipboard(
                                    bank.accountName,
                                    `accountName-${index}`
                                  )
                                }
                                className="h-6 w-6 p-0 hover:bg-orange-200"
                              >
                                {copiedField === `accountName-${index}` ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">
                              Account Number:
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900 font-mono font-bold">
                                {bank.accountNumber}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  copyToClipboard(
                                    bank.accountNumber,
                                    `accountNumber-${index}`
                                  )
                                }
                                className="h-6 w-6 p-0 hover:bg-orange-200"
                              >
                                {copiedField === `accountNumber-${index}` ? (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Transfer Instructions */}
                  <div className="mt-4 bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <h5 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Important Transfer Instructions
                    </h5>
                    <div className="space-y-1 text-sm text-red-800">
                      <p>
                        • Transfer the exact amount:{" "}
                        <strong>
                          <PriceFormatter
                            amount={order.totalPrice || 0}
                            showDecimals
                          />
                        </strong>
                      </p>
                      <p>
                        • Use reference:{" "}
                        <strong>INV-{order.orderNumber || order.id}</strong>
                      </p>
                      <p>• Processing time: 1-2 business days after transfer</p>
                      <p>• Keep your transfer receipt for reference</p>
                    </div>
                    <div className="mt-3 p-2 bg-red-100 rounded border-l-4 border-red-500">
                      <p className="text-xs text-red-700">
                        <strong>Note:</strong> Your order will only be processed
                        after payment confirmation. Please ensure you transfer
                        to one of the accounts above.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Invoice Items */}
            <div className="mb-8 sm:mb-12">
              <h4 className="font-semibold text-gray-800 mb-3 sm:mb-4 text-base sm:text-lg">
                Items:
              </h4>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 print:bg-gray-50">
                      <tr>
                        <th className="text-left p-4 font-semibold text-gray-700">
                          Item
                        </th>
                        <th className="text-right p-4 font-semibold text-gray-700">
                          Price
                        </th>
                        <th className="text-right p-4 font-semibold text-gray-700">
                          Quantity
                        </th>
                        <th className="text-right p-4 font-semibold text-gray-700">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item, index) => {
                        const price = getItemPrice(item);
                        const itemTotal = price * (item.quantity || 1);

                        return (
                          <tr
                            key={index}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.title}
                                </p>
                                {item.selectedUnit && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Unit: {item.selectedUnit}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right text-gray-600">
                              <PriceFormatter amount={price} showDecimals />
                            </td>
                            <td className="p-4 text-right text-gray-600">
                              {item.quantity}
                            </td>
                            <td className="p-4 text-right font-medium text-gray-900">
                              <PriceFormatter amount={itemTotal} showDecimals />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {order.items?.map((item, index) => {
                  const itemPrice =
                    item.price || item.fixedPrice || item.unitPrice?.price || 0;
                  const itemTotal = itemPrice * (item.quantity || 1);

                  return (
                    <div
                      key={index}
                      className="bg-white p-4 rounded-lg border border-gray-200 print:border-gray-300"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-4">
                          <p className="font-medium text-gray-900 text-sm">
                            {item.title}
                          </p>
                          {item.sku && (
                            <p className="text-xs text-gray-500">
                              SKU: {item.sku}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900 text-sm">
                            <PriceFormatter amount={itemTotal} showDecimals />
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>
                          Price:{" "}
                          <PriceFormatter amount={itemPrice} showDecimals />
                        </span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="flex justify-end mb-8 sm:mb-12">
              <div className="w-full sm:w-80">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border print:bg-white print:border-gray-300">
                  <div className="space-y-2 sm:space-y-3 text-sm sm:text-base">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="text-gray-900">
                        <PriceFormatter
                          amount={order.subtotalPrice || 0}
                          showDecimals
                        />
                      </span>
                    </div>

                    {/* Discount if applicable */}
                    {/* {order.totalDiscount && order.totalDiscount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Discount:</span>
                        <span className="text-green-600">
                          -<PriceFormatter amount={order.totalDiscount} showDecimals />
                        </span>
                      </div>
                    )} */}

                    <Separator />
                    <div className="flex justify-between text-base sm:text-lg font-bold">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">
                        <PriceFormatter
                          amount={order.totalPrice || 0}
                          showDecimals
                        />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status for Completed Orders */}
            {order.paymentStatus === "PAID" && (
              <div className="mb-8 sm:mb-12">
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-800">
                        Payment Confirmed
                      </h4>
                      <p className="text-sm text-green-700">
                        Thank you for your payment. Your order is being
                        processed.
                      </p>
                      {order.processedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Payment received on {formatDate(order.processedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Order Notes if any */}
            {order.notes && (
              <div className="mb-8 sm:mb-12">
                <h4 className="font-semibold text-gray-800 mb-3 text-base sm:text-lg">
                  Order Notes:
                </h4>
                <div className="bg-gray-100 p-4 rounded-lg border print:bg-gray-50">
                  <p className="text-gray-700 text-sm sm:text-base">
                    {order.notes}
                  </p>
                </div>
              </div>
            )}

            {/* Invoice Footer */}
            <div className="border-t border-gray-200 pt-6 sm:pt-8">
              <div className="text-center text-gray-600">
                <p className="text-base sm:text-lg font-medium mb-2">
                  Thank you for your business!
                </p>
                <p className="text-sm sm:text-base px-4 mb-4">
                  If you have any questions about this invoice, please contact
                  us at{" "}
                  <a
                    href={`mailto:${
                      process.env.NEXT_PUBLIC_COMPANY_EMAIL ||
                      "contact@shopgrocery.com"
                    }`}
                    className="text-orange-600 hover:text-orange-700 underline"
                  >
                    {process.env.NEXT_PUBLIC_COMPANY_EMAIL ||
                      "contact@shopgrocery.com"}
                  </a>{" "}
                  or call{" "}
                  <a
                    href={`tel:${
                      process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+15551234567"
                    }`}
                    className="text-orange-600 hover:text-orange-700 underline"
                  >
                    {process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
                      "+1 (555) 123-4567"}
                  </a>
                </p>

                {/* Terms and Conditions */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h5 className="font-medium text-gray-700 mb-2 text-sm">
                    Terms & Conditions:
                  </h5>
                  <div className="text-xs text-gray-500 space-y-1 max-w-2xl mx-auto">
                    <p>
                      • Payment is due within 7 days of invoice date for bank
                      transfer orders
                    </p>
                    <p>
                      • Orders are processed only after payment confirmation
                    </p>
                    <p>
                      • Delivery times may vary based on product availability
                      and location
                    </p>
                    <p>
                      • For returns and refunds, please contact customer service
                      within 14 days
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs sm:text-sm text-gray-400">
                  This invoice was generated on{" "}
                  {formatDate(new Date().toISOString())}
                </p>

                {/* Invoice ID for reference */}
                <p className="mt-2 text-xs text-gray-400">
                  Invoice ID: INV-{order.orderNumber || order.id} | Order ID: #
                  {order.id}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
