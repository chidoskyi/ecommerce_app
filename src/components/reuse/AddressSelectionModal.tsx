// components/checkout/AddressSelectionModal.tsx
"use client";

import React from "react";
import { X, Edit, Trash2, Plus } from "lucide-react";
import { Address } from "@/types";

interface AddressSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedAddressId?: string;
  onSelectAddress: (address: Address) => void;
  onAddNewAddress: () => void;
  onEditAddress?: (address: Address) => void;
  onDeleteAddress?: (addressId: string) => void;
}

const AddressSelectionModal: React.FC<AddressSelectionModalProps> = ({
  isOpen,
  onClose,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddNewAddress,
  onEditAddress,
  onDeleteAddress,
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSelectAndContinue = () => {
    const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);
    if (selectedAddress) {
      onSelectAddress(selectedAddress);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Select Delivery Address</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-4">
            {/* Existing Addresses */}
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${
                  selectedAddressId === address.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => onSelectAddress(address)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Radio Button */}
                    <div className="mt-1">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedAddressId === address.id
                            ? "border-orange-500 bg-orange-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedAddressId === address.id && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </div>
                    </div>

                    {/* Address Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {address.firstName} {address.lastName}
                      </h3>
                      <p className="text-gray-600 mb-1">
                        {address.address}
                      </p>
                      <p className="text-gray-600 mb-1">
                        {address.city}, {address.state} {address.zip}
                      </p>
                      <p className="text-gray-600 mb-1">{address.country}</p>
                      <p className="text-gray-600">{address.phone}</p>
                      {address.isDefault && (
                        <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {onEditAddress && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditAddress(address);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit Address"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                    )}
                    {onDeleteAddress && !address.isDefault && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Are you sure you want to delete this address?")) {
                            onDeleteAddress(address.id!);
                          }
                        }}
                        className="p-2 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Address"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Address Button */}
            <button
              onClick={onAddNewAddress}
               className=" cursor-pointer w-full border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-orange-600"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add New Address</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectAndContinue}
            disabled={!selectedAddressId}
            className="px-8 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use Selected Address
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressSelectionModal;