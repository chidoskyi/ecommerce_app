"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Edit, Trash2, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge"

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppSelector, useAppDispatch } from "@/app/store/hooks";
import { 
  fetchAddresses, 
  createAddress, 
  updateAddress, 
  deleteAddress, 
  setDefaultAddress, 
} from "@/app/store/slices/addressSlice";

import { Address } from "@/types";
import { toast } from "react-toastify";

export default function Addresses() {
  const dispatch = useAppDispatch();
  const { addresses, loading, } = useAppSelector((state) => state.address);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<{
    type: "SHIPPING" | "BILLING";
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone: string;
    isDefault: boolean;
  }>({
    type: "SHIPPING",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    phone: "",
    isDefault: false,
  });

  // Fetch addresses on component mount
  useEffect(() => {
    dispatch(fetchAddresses());
  }, [dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddAddress = async () => {
    try {
      await dispatch(createAddress(formData)).unwrap();
      toast.success("Address added successfully");
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to add address:", error);
      toast.error("Failed to add address");
    }
  };

  const handleEditAddress = async () => {
    if (!currentAddress) return;

    try {
      await dispatch(updateAddress({ 
        addressId: currentAddress.id,
        ...formData
      })).unwrap();
      toast.success("Address updated successfully");
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to update address:", error);
      toast.error("Failed to update address");
    }
  };

  const handleRemoveAddress = async (id: string) => {
    try {
      await dispatch(deleteAddress(id)).unwrap();
      toast.success("Address deleted successfully");
    } catch (error) {
      console.error("Failed to delete address:", error);
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // Find the address to get its type
      const address = addresses.find(addr => addr.id === id);
      if (!address) return;
      
      await dispatch(setDefaultAddress({ 
        addressId: id, 
        type: address.type 
      })).unwrap();
      toast.success("Default address updated");
    } catch (error) {
      console.error("Failed to set default address:", error);
      toast.error("Failed to set default address");
    }
  };

  const openEditDialog = (address: Address) => {
    setCurrentAddress(address);
    setFormData({
      type: address.type,
      firstName: address.firstName,
      lastName: address.lastName,
      address: address.address,
      city: address.city,
      state: address.state,
      zip: address.zip,
      country: address.country,
      phone: address.phone || "",
      isDefault: address.isDefault,
    });
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    setIsEditing(false);
    setCurrentAddress(null);
    setFormData({
      type: "SHIPPING",
      firstName: "",
      lastName: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      phone: "",
      isDefault: false,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: "SHIPPING",
      firstName: "",
      lastName: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      phone: "",
      isDefault: false,
    });
    setCurrentAddress(null);
    setIsEditing(false);
  };

  const isFormValid = () => {
    return (
      formData.firstName &&
      formData.lastName &&
      formData.address &&
      formData.city &&
      formData.state &&
      formData.country &&
      formData.zip
    );
  };

  return (
    <Card className="border-gray-200 border">
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <div>
          <CardTitle className="flex items-center justify-start gap-2 mb-5">
            <MapPin />
            <h1 className="">My Addresses</h1>
          </CardTitle>
          <CardDescription>
            Manage your shipping and billing addresses
          </CardDescription>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="bg-orange-600 text-white cursor-pointer hover:bg-orange-700"
              onClick={openAddDialog}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Address
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] z-[9999]">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Address" : "Add New Address"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Address Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleSelectChange("type", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select address type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SHIPPING">Shipping</SelectItem>
                    <SelectItem value="BILLING">Billing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">
                  First Name *
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Enter first name"
                  className="col-span-3"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">
                  Last Name *
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Enter last name"
                  className="col-span-3"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Street Address *
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Enter street address"
                  className="col-span-3"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="city" className="text-right">
                  City *
                </Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Enter city"
                  className="col-span-3"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="state" className="text-right">
                  State *
                </Label>
                <Input
                  id="state"
                  name="state"
                  placeholder="Enter state"
                  className="col-span-3"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zip" className="text-right">
                  ZIP Code *
                </Label>
                <Input
                  id="zip"
                  name="zip"
                  placeholder="Enter ZIP code"
                  className="col-span-3"
                  value={formData.zip}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="country" className="text-right">
                  Country *
                </Label>
                <Input
                  id="country"
                  name="country"
                  placeholder="Enter country"
                  className="col-span-3"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="Enter phone number"
                  className="col-span-3"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isDefault" className="text-right">
                  Set as Default
                </Label>
                <div className="col-span-3">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={formData.isDefault}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <Label htmlFor="isDefault" className="text-sm">
                    Make this my default {formData.type.toLowerCase()} address
                  </Label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                className=" cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                className="bg-orange-600 text-white hover:bg-orange-700  cursor-pointer"
                onClick={isEditing ? handleEditAddress : handleAddAddress}
                disabled={!isFormValid() || loading}
              >
                {loading
                  ? "Saving..."
                  : isEditing
                  ? "Update Address"
                  : "Save Address"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        {loading && addresses.length === 0 ? (
          <div className="text-center py-8">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No addresses found. Add your first address to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address: Address) => (
              <div
                key={address.id}
                className="border border-gray-200 rounded-lg p-4 relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="text-xs">
                    {address.type}
                  </Badge>
                  {address.isDefault && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      Default
                    </Badge>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <h3 className="font-medium text-lg">
                    {address.firstName} {address.lastName}
                  </h3>
                  <p>{address.address}</p>
                  <p>
                    {address.city}, {address.state} {address.zip}
                  </p>
                  <p>{address.country}</p>
                  {address.phone && <p>{address.phone}</p>}
                </div>
                <div className="mt-4 flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className=" cursor-pointer"
                    onClick={() => openEditDialog(address)}
                    disabled={loading}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  {!address.isDefault && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        disabled={loading}
                        className=" cursor-pointer"
                      >
                        Set as Default
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50  cursor-pointer"
                        onClick={() => handleRemoveAddress(address.id)}
                        disabled={loading}
                      >
                        <Trash2 className="mr-2 h-4 w-4 cursor-pointer" />
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}