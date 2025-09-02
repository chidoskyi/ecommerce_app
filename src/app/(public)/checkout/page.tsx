// components/checkout/CheckoutComponent.tsx (Updated with Bank Transfer Redirect)
"use client";

import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation"; // Add this import
import Container from "@/components/reuse/Container";
import Link from "next/link";
import { CheckoutComponentProps, CheckoutProps } from "@/types/checkout";
import { AppDispatch } from "@/app/store";
import {
  createCheckout,
  fetchCheckouts,
  verifyPayment,
  setPaymentMethod,
  clearErrors,
  selectCurrentCheckout,
  selectCurrentOrder,
  selectCurrentInvoice,
  selectIsCreatingCheckout,
  selectPaymentUrl,
  selectPaymentReference,
  selectDeliveryInfo,
  selectShowInvoice,
  selectCheckoutError,
  selectPaymentMethod,
  fetchOrderById,
} from "@/app/store/slices/checkoutSlice";
import {
  fetchAddresses,
  createAddress,
  updateAddress,
  selectAddresses,
  selectAddressLoading,
  selectDefaultShippingAddress,
} from "@/app/store/slices/addressSlice";
import { Address } from "@/types";
import ShippingStep from "@/components/reuse/ShippingSteps";
import PaymentStep from "@/components/reuse/PaymentStep";
import ReviewStep from "@/components/reuse/ReviewStep";
import OrderSummary from "@/components/reuse/OrderSummary";
import CheckoutStepper from "@/components/reuse/CheckoutStepper";
import { Truck, Loader2, ShoppingCart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import AddressSelectionModal from "@/components/reuse/AddressSelectionModal";
import { AddNewAddressModal } from "@/components/reuse/AddNewAddressModal";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import { setCurrentOrder } from "@/app/store/slices/orderSlice";
import Image from "next/image";
import { CartItem } from "@/types/carts";
import { getItemPrice } from "@/utils/priceHelpers";


const CheckoutComponent: React.FC<CheckoutComponentProps> = ({
  deliveryFee = 4500, 
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter(); // Add this
  // Get cart data from Redux
  const cart = useSelector((state: any) => state.cart);
  const cartItems = cart.items || [];
  const cartSubtotal = cart.subtotal || 0;
  const totalCartItems = cart.itemCount || 0;
  // Local state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [voucherCode, setVoucherCode] = useState<string>("");
  const [walletBalance] = useState<number>(0);
  const [initialLoadComplete, setInitialLoadComplete] =
    useState<boolean>(false);
  // Modal states
  const [showAddressSelectionModal, setShowAddressSelectionModal] =
    useState<boolean>(false);
  const [showAddNewAddressModal, setShowAddNewAddressModal] =
    useState<boolean>(false);
  // Address form state
  const [hasExistingAddress, setHasExistingAddress] = useState<boolean>(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState<Omit<Address, "id">>({
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
    isDefault: true,
    type: "SHIPPING",
  });
  const [hasRedirected, setHasRedirected] = useState(false);

  const paths = ["checkout"];
  const stepTitles = ["Shipping Information", "Payment Method", "Review Order"];

  // Transform cart items to order items format
  const orderItems = cartItems.map((item: CartItem) => {
    // Determine the correct price based on pricing model
    const price = getItemPrice(item);

    return {
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      title: item.product.name,
      price, // This will be the resolved price (either fixed or unit price)
      quantity: item.quantity,
      image: item.product.images?.[0] || null,
      unit: item.selectedUnit || null, // Use selectedUnit from cart item
      weight: item.product.weight || null,
      category: item.product.category?.name || null,
      // Include both pricing fields for reference
      fixedPrice: item.fixedPrice ?? item.product.fixedPrice ?? null,
      unitPrice: item.unitPrice?.price ?? null, // Extract just the price value
      selectedUnit: item.selectedUnit || null,
      totalPrice: price * item.quantity,
    };
  });

  // Calculate totals using cart data
  const subtotal = cartSubtotal;
  const total = subtotal + deliveryFee;

  // Auth state using your custom auth context
  const {
    isAuthenticated,
    isLoading: authLoading,
    userId,
    token,
    error: authError,
  } = useAuth();

  // Redux state
  const addresses = useSelector(selectAddresses);
  const defaultShippingAddress = useSelector(selectDefaultShippingAddress);
  const addressLoading = useSelector(selectAddressLoading);
  const selectedPaymentMethod = useSelector(selectPaymentMethod);
  const checkoutError = useSelector(selectCheckoutError);
  const isCreatingCheckout = useSelector(selectIsCreatingCheckout);
  const paymentUrl = useSelector(selectPaymentUrl);
  const currentOrder = useSelector(selectCurrentOrder);

  // Effects
  useEffect(() => {
    // Only fetch addresses if user is authenticated and we have a token
    if (isAuthenticated && userId && token && !authLoading) {
      console.log("🛒 Fetching addresses for user:", userId);
      dispatch(fetchAddresses()).finally(() => {
        setInitialLoadComplete(true);
      });
    } else if (!authLoading && !isAuthenticated) {
      // User is not authenticated, mark as complete
      setInitialLoadComplete(true);
      console.log("🚫 User not authenticated");
    }
  }, [dispatch, isAuthenticated, authLoading, userId, token]);

  useEffect(() => {
    // Only set address form if we have completed initial load and have a default address
    if (initialLoadComplete && defaultShippingAddress) {
      console.log(
        "📍 Setting default shipping address:",
        defaultShippingAddress
      );
      setHasExistingAddress(true);
      setSelectedAddress(defaultShippingAddress);
      setAddressForm({
        firstName: defaultShippingAddress.firstName,
        lastName: defaultShippingAddress.lastName,
        address: defaultShippingAddress.address,
        city: defaultShippingAddress.city,
        state: defaultShippingAddress.state,
        zip: defaultShippingAddress.zip,
        country: defaultShippingAddress.country,
        phone: defaultShippingAddress.phone,
        isDefault: defaultShippingAddress.isDefault,
        type: defaultShippingAddress.type,
      });
    }
  }, [defaultShippingAddress, initialLoadComplete]);

  // Updated effect to handle different payment methods after checkout creation
  useEffect(() => {
    if (!currentOrder || !selectedPaymentMethod || hasRedirected) {
      console.log('Skipping redirect - conditions not met:', {
        hasCurrentOrder: !!currentOrder,
        hasPaymentMethod: !!selectedPaymentMethod,
        hasRedirected
      });
      return;
    }
    
    // Check if we're already on a success/invoice page
    const currentPath = window.location.pathname;
    const isOnSuccessPage = currentPath.includes('/invoice') ||
                            currentPath.includes('/orders') ||
                            currentPath.includes('/payment-success') ||
                            window.location.search.includes('payment=success');
    
    if (isOnSuccessPage) {
      console.log('Already on success page, skipping redirect');
      setHasRedirected(true);
      return;
    }
  
    console.log('🎯 Order created, initiating redirect:', {
      orderId: currentOrder.id,
      paymentMethod: selectedPaymentMethod,
      paymentUrl: paymentUrl ? 'Available' : 'Not available'
    });
  
    const handleRedirect = async () => {
      try {
        setHasRedirected(true);
        
        // Store order ID for reference
        const orderId = currentOrder.id;
        
        // Clear the current order from state to prevent redirect loop
        // You'll need to import this action from your checkout slice
        dispatch(setCurrentOrder(null));
        
        switch (selectedPaymentMethod) {
          case "bank_transfer":
            console.log('Redirecting to invoice page');
            // Use push to maintain history
            router.push(`/invoice/${orderId}`);
            break;
          case "wallet":
            console.log('Redirecting to orders page');
            // Use push to maintain history
            router.push(`/orders/${orderId}`);
            break;
          case "opay":
          case "paystack":
          default:
            if (paymentUrl) {
              console.log('Redirecting to external payment gateway');
              // For external URLs, window.location.href is correct
              window.location.href = paymentUrl;
            } else {
              console.error('No payment URL, redirecting to orders');
              router.push(`/orders/${orderId}`);
            }
            break;
        }
      } catch (error) {
        console.error('Redirect error:', error);
        // Fallback to orders page
        router.push(`/orders/${currentOrder.id}`);
      }
    };
  
    handleRedirect();
  }, [currentOrder, selectedPaymentMethod, paymentUrl, hasRedirected, router, dispatch]);
  
  // Event handlers
  const handleContinueToPayment = () => {
    setCurrentStep(2);
  };
 
  const handleReviewOrder = () => {
    setCurrentStep(3);
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleApplyVoucher = () => {
    console.log("Applying voucher:", voucherCode);
    // Implement voucher logic here
  };

  const handlePlaceOrder = async () => {
    try {
      // Prepare checkout data using cart items
      const checkoutData = {
        items: orderItems,
        shippingAddress: selectedAddress || addressForm,
        paymentMethod: selectedPaymentMethod,
        subtotal,
        deliveryFee,
        total,
        voucherCode: voucherCode || undefined,
        cartItems: cartItems, // Include original cart items for reference
      };

      console.log("🛒 Placing order with cart data:", checkoutData);

      const result = await dispatch(createCheckout(checkoutData)).unwrap();

      console.log("✅ Order created successfully:", result);

      // The useEffect above will handle the redirect based on payment method
      // No need to handle redirects here as the useEffect will take care of it
    } catch (error) {
      console.error("❌ Order placement failed:", error);
      // Error handling is already done in the Redux slice
    }
  };

  const handleAddressFormSubmit = async () => {
    // Validate form fields
    const isValid = Object.entries(addressForm).every(([key, value]) => {
      if (key === "street") return true; // street is optional
      return typeof value === "string" ? value.trim() !== "" : value !== null;
    });
  
    if (isValid) {
      try {
        if (!hasExistingAddress) {
          // Ensure the address is set as default when created from checkout
          const addressToCreate = {
            ...addressForm,
            isDefault: true, // Force this to be true for addresses created during checkout
          };
          
          const newAddress = await dispatch(
            createAddress(addressToCreate)
          ).unwrap();
          setHasExistingAddress(true);
          setSelectedAddress(newAddress);
        }
        setCurrentStep(2);
      } catch (error) {
        console.error("Failed to save address:", error);
        alert("Failed to save address. Please try again.");
      }
    } else {
      alert("Please fill in all required fields");
    }
  };

  const handleAddressInputChange = (
    field: keyof Omit<Address, "id">,
    value: string
  ) => {
    setAddressForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Modal handlers
  const handleChangeAddress = () => {
    setShowAddressSelectionModal(true);
  };

  const handleCloseAddressSelectionModal = () => {
    setShowAddressSelectionModal(false);
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedAddress(address);
    setAddressForm({
      firstName: address.firstName,
      lastName: address.lastName,
      address: address.address,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      phone: address.phone,
      isDefault: address.isDefault,
      type: address.type,
    });
    setHasExistingAddress(true);
    setShowAddressSelectionModal(false);
  };

  const handleAddNewAddress = () => {
    setShowAddressSelectionModal(false);
    setShowAddNewAddressModal(true);
  };

  const handleCloseAddNewAddressModal = () => {
    setShowAddNewAddressModal(false);
  };

  const handleSaveNewAddress = async (newAddressData: Omit<Address, "id">) => {
    try {
      // Ensure the new address is set as default
      const addressToCreate = {
        ...newAddressData,
        isDefault: true, // Force this to be true for new addresses created during checkout
      };
      
      const newAddress = await dispatch(createAddress(addressToCreate)).unwrap();
      setSelectedAddress(newAddress);
      setAddressForm({
        ...newAddressData,
        isDefault: true, // Update local form state as well
      });
      setHasExistingAddress(true);
      setShowAddNewAddressModal(false);
      // Optionally refresh addresses
      dispatch(fetchAddresses());
    } catch (error) {
      console.error("Failed to save new address:", error);
      alert("Failed to save address. Please try again.");
    }
  };

  const handlePaymentSelect = (method: string) => {
    dispatch(setPaymentMethod(method));
  };

  const handleVoucherCodeChange = (code: string) => {
    setVoucherCode(code);
  };

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearErrors());
    };
  }, [dispatch]);

  // RenderBottomButtons function
  const renderBottomButtons = () => {
    switch (currentStep) {
      case 1:
        // Helper function to check if address form is valid
        const isAddressFormValid = () => {
          const requiredFields = ['firstName', 'lastName', 'address', 'city', 'state', 'zip', 'country', 'phone'];
          return requiredFields.every(field => {
            const value = addressForm[field as keyof typeof addressForm];
            return typeof value === 'string' ? value.trim() !== '' : value !== null && value !== undefined;
          });
        };
  
        // Determine button state and text
        const hasValidAddress = hasExistingAddress || selectedAddress;
        const canProceed = hasValidAddress || (!hasExistingAddress && isAddressFormValid());
        
        let buttonText = "Please Select Address";
        if (hasValidAddress) {
          buttonText = "Continue to Payment";
        } else if (!hasExistingAddress && isAddressFormValid()) {
          buttonText = "Save Address & Continue";
        }
  
        return (
          <div className="flex justify-end">
            <button
              onClick={
                hasValidAddress
                  ? handleContinueToPayment
                  : handleAddressFormSubmit
              }
              disabled={addressLoading || !canProceed}
              className="bg-orange-600 cursor-pointer text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addressLoading ? "Saving..." : buttonText}
            </button>
          </div>
        );
      case 2:
        return (
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              className="bg-gray-300 cursor-pointer text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-400 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleReviewOrder}
              disabled={!selectedPaymentMethod}
              className="bg-orange-600 cursor-pointer text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              Review Order
            </button>
          </div>
        );
      case 3:
        return (
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              className="bg-gray-300 cursor-pointer text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-400 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handlePlaceOrder}
              disabled={isCreatingCheckout}
              className="bg-orange-600 cursor-pointer text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Truck className="w-5 h-5" />
              {isCreatingCheckout ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : selectedPaymentMethod === "bank_transfer" ? (
                "Generate Invoice"
              ) : (
                "Place Order"
              )}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ShippingStep
            hasExistingAddress={hasExistingAddress}
            selectedAddress={selectedAddress}
            addressForm={addressForm}
            onAddressInputChange={handleAddressInputChange}
            onChangeAddress={handleChangeAddress}
            isLoading={
              addressLoading || (!initialLoadComplete && isAuthenticated)
            }
          />
        );
      case 2:
        return (
          <PaymentStep
            selectedPayment={selectedPaymentMethod || "paystack"}
            walletBalance={walletBalance}
            onPaymentSelect={handlePaymentSelect}
            onPrevious={handlePrevious}
            onReviewOrder={handleReviewOrder}
          />
        );
      case 3:
        return (
          <ReviewStep
            orderItems={orderItems}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            selectedPayment={selectedPaymentMethod || "paystack"}
            onPrevious={handlePrevious}
            onPlaceOrder={handlePlaceOrder}
          />
        );
      default:
        return null;
    }
  };

  // Check if cart is empty
  if (!authLoading && cartItems.length === 0) {
    return (
      <>
        {/* Breadcrumb */}
        <div className="w-full bg-white mx-auto sm:px-6 lg:px-8 py-5 mb-5">
          <Container className="text-lg text-gray-500 font-semibold">
            <Link href="/">
              <span className="hover:text-orange-600 cursor-pointer">Home</span>
            </Link>
            <span className="mx-2">›</span>
            <span className="text-gray-900 text-sm">checkout</span>
          </Container>
        </div>

        <Container className="bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Your Cart is Empty
                </h3>
                <p className="text-gray-600 mb-8">
                  You need to add items to your cart before you can checkout.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/">
                    <button className="bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                      Start Shopping
                    </button>
                  </Link>
                  <Link href="/cart">
                    <button className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors">
                      View Cart
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </>
    );
  }

  // Show loading while auth is being checked or addresses are being loaded
  if (authLoading || (!initialLoadComplete && isAuthenticated)) {
    return (
      <Container className="bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Loading Checkout...
              </h3>
              <p className="text-gray-600 text-center">
                {authLoading
                  ? "Verifying authentication..."
                  : "Loading your saved addresses..."}
              </p>
              {userId && (
                <p className="text-xs text-gray-500 mt-2">User ID: {userId}</p>
              )}
              {cartItems.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Cart: {totalCartItems} item{totalCartItems !== 1 ? "s" : ""} -{" "}
                  <PriceFormatter amount={cartSubtotal} showDecimals />
                </p>
              )}
            </div>
          </div>
        </div>
      </Container>
    );
  }

  // Show login prompt if user is not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <Container className="bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Login Required
              </h3>
              <p className="text-gray-600 mb-4">
                Please log in to your account to proceed with checkout.
              </p>
              {cartItems.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600">
                    Your cart: {totalCartItems} item
                    {totalCartItems !== 1 ? "s" : ""} -{" "}
                    <PriceFormatter amount={cartSubtotal} showDecimals />
                  </p>
                </div>
              )}
              {authError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  <p className="text-sm">{authError}</p>
                </div>
              )}
              <div className="flex gap-4 justify-center">
                <Link href="/sign-in?redirect_url=/checkout">
                  <button className="bg-orange-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-700 transition-colors">
                    Sign In
                  </button>
                </Link>
                <Link href="/sign-up?redirect_url=/checkout">
                  <button className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors">
                    Create Account
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <div className="w-full bg-white mx-auto sm:px-6 lg:px-8 py-5 mb-5">
        <Container className="text-lg text-gray-500 font-semibold">
          <Link href="/">
            <span className="hover:text-orange-600 cursor-pointer">Home</span>
          </Link>

          {paths.map((path, index) => {
            const href = `/${paths.slice(0, index + 1).join("/")}`;
            const isLast = index === paths.length - 1;
            const pathName = path.replace(/-/g, " ");

            return (
              <span key={path}>
                <span className="mx-2">›</span>
                {isLast ? (
                  <span className="text-gray-900 text-sm">{pathName}</span>
                ) : (
                  <Link href={href}>
                    <span className="hover:text-orange-600 cursor-pointer">
                      {pathName}
                    </span>
                  </Link>
                )}
              </span>
            );
          })}
        </Container>
      </div>

      <Container className="bg-gray-50 p-6">
        <div className="mx-auto grid lg:grid-cols-3 gap-8">
          {/* Left Section - Steps */}
          <div className="lg:col-span-2 space-y-8">
            {/* Cart Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Order ({totalCartItems} item
                {totalCartItems !== 1 ? "s" : ""})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-12 h-12 bg-red-500 rounded-lg flex-shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          width={50}
                          height={50}
                          alt={item.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-red-600 rounded-lg"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      <PriceFormatter
                        amount={item.price * item.quantity}
                        showDecimals
                      />
                    </p>
                  </div>
                ))}
                {orderItems.length > 4 && (
                  <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg text-gray-500">
                    +{orderItems.length - 4} more item
                    {orderItems.length - 4 !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>

            {/* Stepper Container with Steps */}
            <CheckoutStepper currentStep={currentStep} steps={stepTitles}>
              {renderCurrentStep()}
            </CheckoutStepper>

            {/* Bottom Button Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              {renderBottomButtons()}
            </div>

            {/* Show checkout error if any */}
            {checkoutError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p className="text-sm">{checkoutError}</p>
              </div>
            )}
          </div>

          {/* Right Section - Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              orderItems={orderItems}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              voucherCode={voucherCode}
              onVoucherCodeChange={handleVoucherCodeChange}
              onApplyVoucher={handleApplyVoucher}
            />
          </div>
        </div>
      </Container>

      {/* Address Selection Modal */}
      <AddressSelectionModal
        isOpen={showAddressSelectionModal}
        onClose={handleCloseAddressSelectionModal}
        addresses={addresses}
        selectedAddressId={selectedAddress?.id}
        onSelectAddress={handleSelectAddress}
        onAddNewAddress={handleAddNewAddress}
      />

      {/* Add New Address Modal */}
      <AddNewAddressModal
        isOpen={showAddNewAddressModal}
        onClose={handleCloseAddNewAddressModal}
        onSave={handleSaveNewAddress}
      />
    </>
  );
};

export default CheckoutComponent;
