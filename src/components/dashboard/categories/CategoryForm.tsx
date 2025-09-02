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
  selectError,
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Category" : "Add New Category"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Update category information."
              : "Create a new product category."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="image">Category Image</Label>
            <div className="flex items-center gap-4 border border-gray-300 p-4 rounded-md">
              {imagePreview ? (
                <div className="relative w-20 h-20">
                  <Image
                    src={imagePreview}
                    alt="Category preview"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 cursor-pointer"
                    onClick={handleRemoveImage}
                    disabled={isLoading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  ref={fileInputRef}
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={errors.image ? "border-red-500" : "cursor-pointer"}
                  disabled={isLoading}
                />
                {errors.image && (
                  <p className="text-sm text-red-500 mt-1">{errors.image}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Upload an image for the category (max 5MB)
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. Summer Collection"
              className={errors.name ? "border-red-500" : ""}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Enter category description..."
              className="min-h-[80px]"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.status === CategoryStatus.ACTIVE}
              className="bg-gray-400"
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  status: checked ? CategoryStatus.ACTIVE : CategoryStatus.INACTIVE,
                }))
              }
              disabled={isLoading}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button 
            className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100" 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            className="flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25" 
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              mode === "edit" ? "Saving..." : "Adding..."
            ) : (
              mode === "edit" ? "Save Changes" : "Add Category"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};