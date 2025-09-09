import React, { useState, useEffect, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryFormProps, NewCategory, Category, CategoryStatus } from "@/types/categories";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/app/store";
import {
  uploadCategoryImages,
  deleteCategoryImage,
  selectLoading,
  selectCreating,
  selectUpdating,
} from "@/app/store/slices/adminCategorySlice";
import { toast } from "react-toastify";

export const CategoryForm: React.FC<CategoryFormProps & { loading?: boolean }> = ({
  category,
  isOpen,
  onClose,
  onSubmit,
  mode,
  loading: externalLoading = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const uploadLoading = useSelector(selectLoading);
  const creating = useSelector(selectCreating);
  const updating = useSelector(selectUpdating);
  
  const [formData, setFormData] = useState<NewCategory>({
    name: "",
    image: null,
    description: "",
    status: CategoryStatus.ACTIVE,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "edit" && category) {
      setFormData({
        name: category.name,
        image: category.image ?? "",
        description: category.description || "",
        status: category.status || CategoryStatus.ACTIVE,
      });
      setImagePreview(category.image);
    } else {
      setFormData({
        name: "",
        image: null,
        description: "",
        status: CategoryStatus.ACTIVE,
      });
      setImagePreview(null);
    }
    setErrors({});
    setSelectedFile(null);
  }, [category, mode, isOpen]);

  const handleSubmit = async () => {
    if (!validateForm()) return;
  
    try {
      let categoryToSubmit = formData;
  
      // If there's a selected file, upload it first (for both add and edit modes)
      if (selectedFile) {
        if (mode === "edit" && category) {
          // For edit mode, upload to existing category
          const uploadResult = await dispatch(uploadCategoryImages({
            categoryId: category.id.toString(),
            files: [selectedFile]
          })).unwrap();
          
          categoryToSubmit = {
            ...formData,
            image: uploadResult.url
          };
        } else if (mode === "add") {
          // For add mode, we'll pass the file directly to the onSubmit
          // The parent component should handle the image upload during category creation
          categoryToSubmit = {
            ...formData,
            image: selectedFile // Pass the file itself, not the preview URL
          };
        }
      }
  
      if (mode === "edit" && category) {
        const updatedCategory: Category = {
          ...category,
          ...categoryToSubmit,
          updatedAt: new Date().toISOString(),
        };
        onSubmit(updatedCategory);
      } else {
        onSubmit(categoryToSubmit);
      }
    } catch (error) {
      console.error("Error handling form submission:", error);
      toast.error("Failed to process category");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
    }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({
          ...prev,
          image: "Please select an image file",
        }));
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          image: "Image size should be less than 5MB",
        }));
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setImagePreview(imageUrl);
        setFormData((prev) => ({ ...prev, image: imageUrl }));
        if (errors.image) {
          setErrors((prev) => ({ ...prev, image: "" }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async () => {
    if (mode === "edit" && category && category.image) {
      try {
        await dispatch(deleteCategoryImage({
          categoryId: category.id.toString()
        })).unwrap();
        toast.success("Image removed successfully");
      } catch (error) {
        console.error("Error removing image:", error);
        toast.error("Failed to remove image");
        return;
      }
    }

    setImagePreview(null);
    setSelectedFile(null);
    setFormData((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isLoading = externalLoading || creating || updating || uploadLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-auto sm:w-full">
        {/* Header Section */}
        <DialogHeader className="space-y-2 pb-4 border-b border-gray-100">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-900">
            {mode === "edit" ? "Edit Category" : "Add New Category"}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-gray-600">
            {mode === "edit"
              ? "Update category information."
              : "Create a new product category."}
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <div className="space-y-6 py-4 sm:py-6">
          {/* Image Upload Section */}
          <div className="space-y-3">
            <Label htmlFor="image" className="text-sm font-semibold text-gray-700">
              Category Image
            </Label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 sm:p-6 bg-gray-50/50">
              {imagePreview ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Image Preview */}
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border-2 border-white shadow-md">
                      <Image
                        src={imagePreview}
                        alt="Category preview"
                        width={112}
                        height={112}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg hover:scale-105 transition-transform"
                      onClick={handleRemoveImage}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* File Input and Info */}
                  <div className="flex-1 w-full sm:w-auto space-y-3">
                    <Input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className={`cursor-pointer transition-colors ${
                        errors.image 
                          ? "border-red-500 focus:border-red-500" 
                          : "border-gray-300 focus:border-blue-500"
                      }`}
                      disabled={isLoading}
                    />
                    <p className="text-xs sm:text-sm text-gray-500">
                      Choose a different image (max 5MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  {/* Upload Icon */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                    <Upload className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                  </div>
                  
                  {/* File Input */}
                  <div className="space-y-2">
                    <Input
                      ref={fileInputRef}
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className={`cursor-pointer transition-colors ${
                        errors.image 
                          ? "border-red-500 focus:border-red-500" 
                          : "border-gray-300 focus:border-blue-500"
                      }`}
                      disabled={isLoading}
                    />
                    <p className="text-xs sm:text-sm text-gray-500">
                      Upload an image for the category (max 5MB)
                    </p>
                  </div>
                </div>
              )}
              
              {errors.image && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.image}</p>
                </div>
              )}
            </div>
          </div>

          {/* Category Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
              Category Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. Summer Collection"
              className={`text-sm sm:text-base py-2.5 sm:py-3 transition-colors ${
                errors.name 
                  ? "border-red-500 focus:border-red-500" 
                  : "border-gray-300 focus:border-blue-500"
              }`}
              disabled={isLoading}
            />
            {errors.name && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.name}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
              Description <span className="text-gray-400">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Enter category description..."
              className="min-h-[100px] sm:min-h-[120px] text-sm sm:text-base border-gray-300 focus:border-blue-500 resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="space-y-1">
              <Label htmlFor="active" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Category Status
              </Label>
              <p className="text-xs sm:text-sm text-gray-500">
                {formData.status === CategoryStatus.ACTIVE 
                  ? "Category is active and visible to customers" 
                  : "Category is inactive and hidden from customers"
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${
                formData.status === CategoryStatus.ACTIVE ? "text-green-600" : "text-gray-500"
              }`}>
                {formData.status === CategoryStatus.ACTIVE ? "Active" : "Inactive"}
              </span>
              <Switch
                id="active"
                checked={formData.status === CategoryStatus.ACTIVE}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: checked ? CategoryStatus.ACTIVE : CategoryStatus.INACTIVE,
                  }))
                }
                disabled={isLoading}
                className="data-[state=checked]:bg-green-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto order-2 sm:order-1 py-2.5 px-6 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full sm:w-auto order-1 sm:order-2 py-2.5 px-6 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30 transition-all duration-200 font-semibold"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {mode === "edit" ? "Saving..." : "Adding..."}
              </div>
            ) : (
              mode === "edit" ? "Save Changes" : "Add Category"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};