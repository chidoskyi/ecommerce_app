// components/checkout/ShippingStep.tsx
"use client";

import React from "react";
import { Check } from "lucide-react";
import { ShippingStepProps } from "@/types/checkout";

const ShippingStep: React.FC<ShippingStepProps> = ({
  hasExistingAddress,
  addressForm,
  onAddressInputChange,
  onChangeAddress,
  isLoading
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 ">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Shipping Information
        </h2>

        {hasExistingAddress ? (
          <div className="bg-gray-50 rounded-xl p-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-orange-600 text-sm mb-3">
                    1. CUSTOMER ADDRESS
                  </h3>
                  <div className="space-y-1">
                    <p className="font-semibold text-gray-900 text-lg">
                      {addressForm.firstName}
                    </p>
                    <p className="font-semibold text-gray-900 text-lg">
                      {addressForm.lastName}
                    </p>
                    <p className="text-gray-600">
                      {addressForm.address}, {addressForm.city} |{" "}
                      {addressForm.phone}
                    </p>
                    <p className="text-gray-600">{addressForm.state}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={onChangeAddress}
                className="text-orange-500 hover:text-orange-600 font-medium cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="font-bold text-orange-600 text-sm mb-6">
              ADD SHIPPING ADDRESS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={addressForm.firstName}
                  onChange={(e) =>
                    onAddressInputChange("firstName", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={addressForm.lastName}
                  onChange={(e) =>
                    onAddressInputChange("lastName", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter your last name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Street Address *
                </label>
                <input
                  type="text"
                  id="address"
                  value={addressForm.address}
                  onChange={(e) =>
                    onAddressInputChange("address", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter your street address"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  value={addressForm.city}
                  onChange={(e) => onAddressInputChange("city", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter city"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="state"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  State *
                </label>
                <input
                  type="text"
                  id="state"
                  value={addressForm.state}
                  onChange={(e) =>
                    onAddressInputChange("state", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter state"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="zip"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  ZIP Code *
                </label>
                <input
                  type="text"
                  id="zip"
                  value={addressForm.zip}
                  onChange={(e) => onAddressInputChange("zip", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter ZIP code"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Country *
                </label>
                <input
                  type="text"
                  id="country"
                  value={addressForm.country}
                  onChange={(e) =>
                    onAddressInputChange("country", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter country"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={addressForm.phone || ""}
                  onChange={(e) =>
                    onAddressInputChange("phone", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              {/* <div className="flex items-center mt-3">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault || false}
                  onChange={(e) =>
                    onAddressInputChange("isDefault", e.target.checked)
                  }
                  className="h-4 w-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <label
                  htmlFor="isDefault"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Set as default address
                </label>
              </div> */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShippingStep;
