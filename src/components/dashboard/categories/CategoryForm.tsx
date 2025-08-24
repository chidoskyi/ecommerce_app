import React, { useState, useEffect, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryFormProps, NewCategory, Category } from "@/lib/types";

export const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  isOpen,
  onClose,
  onSubmit,
  mode,
}) => {
  const [formData, setFormData] = useState<NewCategory>({
    name: "",
    slug: "",
    image: null,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "edit" && category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        image: category.image,
        isActive: category.isActive,
      });
      setImagePreview(category.image);
    } else {
      setFormData({
        name: "",
        slug: "",
        image: null,
        isActive: true,
      });
      setImagePreview(null);
    }
    setErrors({});
  }, [category, mode, isOpen]);

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    if (mode === "edit" && category) {
      const updatedCategory: Category = {
        ...category,
        ...formData,
        updatedAt: new Date().toISOString(),
      };
      onSubmit(updatedCategory);
    } else {
      onSubmit(formData);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Category name is required";
    }

    if (!formData.slug.trim()) {
      newErrors.slug = "Slug is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name,
      slug: mode === "add" ? generateSlug(name) : prev.slug,
    }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, slug: e.target.value }));
    if (errors.slug) {
      setErrors((prev) => ({ ...prev, slug: "" }));
    }
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

  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="">
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
        <div className="grid gap-4 py-4"  >
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
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={handleSlugChange}
              placeholder="summer-collection"
              className={errors.slug ? "border-red-500" : ""}
            />
            {errors.slug && (
              <p className="text-sm text-red-500">{errors.slug}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Used in URLs. Auto-generated from name, but you can customize it.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.isActive}
              className="bg-gray-400"
              onCheckedChange={(checked) =>
                setFormData((prev) => ({
                  ...prev,
                  isActive: checked,
                }))
              }
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25" onClick={handleSubmit}>
            {mode === "edit" ? "Save Changes" : "Add Category"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
