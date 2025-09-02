"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, Upload, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import { toast } from "react-toastify";
import {
  formStateToApiData,
  Product,
  ProductFormProps,
  ProductFormState,
  productToFormState,
} from "@/types/products";
import { HybridSkuInput } from "@/components/reuse/SkuGenerator";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchCategories,
  selectCategories,
  createProduct,
  updateProduct,
  fetchProducts,
  uploadProductImages,
} from "@/app/store/slices/adminProductsSlice";

export interface ProductFormPropsExtended
  extends Omit<ProductFormProps, "onSave"> {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  onProductChange?: (formState: ProductFormState) => void;
  existingSkus?: string[];
  onEditProduct?: () => void; // Add this new prop
}

export function ProductForm({
  mode,
  product,
  onSuccess,
  onError,
  onCancel,
  onProductChange,
   onEditProduct, // Add this new prop
  existingSkus = [],
}: ProductFormPropsExtended) {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectCategories);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const router = useRouter();

  // Fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        await dispatch(fetchCategories()).unwrap();
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories");
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, [dispatch]);

  const initialFormData: ProductFormState = useMemo(
    () => ({
      id: "",
      name: "",
      description: "",
      hasFixedPrice: true,
      priceType: "FIXED",
      fixedPrice: "0",
      unitPrices: [],
      sku: "",
      quantity: "0",
      categoryId: "",
      status: "ACTIVE",
      isFeatured: false,
      isTrending: false,
      isFruit: false,
      isVegetable: false,
      isDealOfTheDay: false,
      isNewArrival: false,
      images: [],
      weight: "",
      dimensions: "", // FIXED: Added missing property
      createdAt: new Date().toISOString(),
    }),
    []
  );

  const [formData, setFormData] = useState<ProductFormState>(
    product ? productToFormState(product) : initialFormData
  );

  useEffect(() => {
    if (product) {
      setFormData(productToFormState(product));
    }
  }, [product]);

  const handleInputChange = useCallback(
    (field: keyof ProductFormState, value: unknown) => {
      setFormData((prevData) => {
        const updatedForm: ProductFormState = { ...prevData, [field]: value };
        if (onProductChange) {
          requestAnimationFrame(() => {
            onProductChange(updatedForm);
          });
        }
        return updatedForm;
      });
    },
    [onProductChange]
  );

  const handleSkuChange = useCallback(
    (newSku: string) => {
      handleInputChange("sku", newSku);
    },
    [handleInputChange]
  );

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      console.log(`📤 Frontend: Selected ${files.length} files for upload`);

      const fileArray = Array.from(files);

      // Validate file types and size
      const validFiles = fileArray.filter((file) => {
        const isValidType = file.type.startsWith("image/");
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit

        if (!isValidType) {
          toast.error(`${file.name} is not a valid image file`);
          return false;
        }

        if (!isValidSize) {
          toast.error(`${file.name} is too large (max 10MB)`);
          return false;
        }

        return true;
      });

      if (validFiles.length === 0) {
        console.log("❌ No valid image files selected");
        return;
      }

      console.log(`✅ Frontend: ${validFiles.length} valid files to process`);

      // Add files to form data with preview URLs
      setFormData((prevData) => {
        const newImages = validFiles.map((file) => ({
          file, // Store the actual File object
          previewUrl: URL.createObjectURL(file),
          isNew: true,
          name: file.name,
          size: file.size,
          type: file.type,
        }));

        console.log(
          "🖼️ Frontend: Created image objects:",
          newImages.map((img) => ({
            name: img.name,
            size: img.size,
            hasFile: !!img.file,
          }))
        );

        // Keep existing images and add new ones
        const existingImages = prevData.images || [];
        const updatedImages = [...existingImages, ...newImages];

        console.log(
          `🖼️ Frontend: Total images after upload: ${updatedImages.length}`
        );

        return { ...prevData, images: updatedImages };
      });

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success(`${validFiles.length} image(s) selected for upload`);
    },
    []
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      setFormData((prevData) => {
        const updatedImages = [...prevData.images];
        const removedImage = updatedImages.splice(index, 1)[0];

        // Revoke object URL if it was a preview to prevent memory leaks
        if (
          removedImage &&
          typeof removedImage === "object" &&
          removedImage.previewUrl
        ) {
          URL.revokeObjectURL(removedImage.previewUrl);
        }

        // Close preview if the removed image was being previewed
        const imageUrl = getImageUrl(removedImage);
        if (imagePreview === imageUrl) {
          setImagePreview(null);
          setIsPreviewOpen(false);
        }

        return { ...prevData, images: updatedImages };
      });
    },
    [imagePreview]
  );

  const getImageUrl = useCallback((image: any): string => {
    if (typeof image === "string") return image;
    if (image?.previewUrl) return image.previewUrl;
    if (image?.url) return image.url;
    return "/placeholder.svg";
  }, []);

  const handlePreviewImage = useCallback(
    (image: any) => {
      const url = getImageUrl(image);
      setImagePreview(url);
      setIsPreviewOpen(true);
    },
    [getImageUrl]
  );

  const handleAddImageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  }, []);

  // FIXED: Enhanced form validation
  const validateForm = (formData: ProductFormState): string[] => {
    const errors: string[] = [];

    if (!formData.name?.trim()) {
      errors.push("Product name is required");
    }

    if (!formData.description?.trim()) {
      errors.push("Product description is required");
    }

    if (!formData.sku?.trim()) {
      errors.push("SKU is required");
    }

    // Check for duplicate SKU
    if (existingSkus.includes(formData.sku) && mode === "add") {
      errors.push("SKU already exists");
    }

    if (
      formData.hasFixedPrice &&
      (!formData.fixedPrice || Number(formData.fixedPrice) <= 0)
    ) {
      errors.push("Fixed price must be greater than 0");
    }

    if (!formData.hasFixedPrice && formData.unitPrices.length === 0) {
      errors.push("At least one unit price is required for variable pricing");
    }

    // Validate unit prices
    if (!formData.hasFixedPrice) {
      for (const unitPrice of formData.unitPrices) {
        if (!unitPrice.unit?.trim()) {
          errors.push("All unit names are required");
          break;
        }
        if (!unitPrice.price || Number(unitPrice.price) <= 0) {
          errors.push("All unit prices must be greater than 0");
          break;
        }
      }
    }

    return errors;
  };


  const handleSubmit = useCallback(
    async (e?: React.MouseEvent) => {
      console.log("Submit triggered - mode:", mode);
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
  
      try {
        setLoading(true);
  
        // Validate form
        const validationErrors = validateForm(formData);
        if (validationErrors.length > 0) {
          toast.error(validationErrors[0]);
          return;
        }
  
        // Convert form data to API format
        const apiData = formStateToApiData(formData);
        console.log("API data prepared:", {
          ...apiData,
          images: `${apiData.images?.length || 0} existing images`,
          newImageFiles: `${apiData.newImageFiles?.length || 0} new files`,
        });
  
        if (mode === "add") {
          console.log("🆕 Starting product creation...");
          
          // For new products, handle file uploads differently
          if (apiData.newImageFiles && apiData.newImageFiles.length > 0) {
            // Create product first, then upload images separately
            console.log("🆕 Creating product with file uploads...");
  
            // Create product without images first
            const productDataWithoutFiles = { ...apiData };
            delete productDataWithoutFiles.newImageFiles;
  
            const result = await dispatch(
              createProduct(productDataWithoutFiles)
            ).unwrap();
            console.log("✅ Product created, now uploading images...");
  
            // Upload images to the created product
            if (apiData.newImageFiles.length > 0) {
              await dispatch(
                uploadProductImages({
                  productId: result.id,
                  files: apiData.newImageFiles,
                })
              ).unwrap();
              console.log("✅ Images uploaded successfully");
            }
          } else {
            // No file uploads, create normally
            const result = await dispatch(createProduct(apiData)).unwrap();
            console.log("✅ Product created successfully:", result);
          }
  
          // Refresh products list
          console.log("🔄 Refreshing products list...");
          await dispatch(fetchProducts({})).unwrap();
          console.log("✅ Products list refreshed");
  
          // Show success message
          toast.success("Product added successfully!");
  
          // Call onSuccess callback if provided
          if (onSuccess) {
            console.log("📞 Calling onSuccess callback...");
            onSuccess();
          }
  
          // REDIRECT TO ADMIN/PRODUCTS AFTER SUCCESSFUL ADD
          console.log("🔄 Redirecting to /admin/products...");
          
          // Use setTimeout to ensure the redirect happens after state updates
          setTimeout(() => {
            router.push('/admin/products');
          }, 100);
  
        } else if (mode === "edit" && product) {
          // For updates, handle images separately
          console.log("📝 Updating existing product...");
  
          // Update product data (without new files)
          const productDataWithoutFiles = { ...apiData };
          delete productDataWithoutFiles.newImageFiles;
  
          const result = await dispatch(
            updateProduct({
              id: product.id,
              productData: productDataWithoutFiles,
            })
          ).unwrap();
  
          // Upload any new images
          if (apiData.newImageFiles && apiData.newImageFiles.length > 0) {
            console.log(
              `📤 Uploading ${apiData.newImageFiles.length} new images...`
            );
            await dispatch(
              uploadProductImages({
                productId: product.id,
                files: apiData.newImageFiles,
              })
            ).unwrap();
            console.log("✅ New images uploaded successfully");
          }
  
          console.log("✅ Product updated successfully:", result);
          toast.success("Product updated successfully");
  
          // Refresh products list
          await dispatch(fetchProducts({})).unwrap();
  
          if (onSuccess) {
            onSuccess();
          }
        }
      } catch (error: any) {
        console.error("❌ Error in form submission:", error);
        const errorMessage =
          error?.message || error || "Failed to save product";
        toast.error(errorMessage);
  
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [mode, formData, product, dispatch, onSuccess, onError, existingSkus, router]
  );

  const handleCancel = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      // FIXED: Clean up any object URLs to prevent memory leaks
      formData.images?.forEach((image) => {
        if (typeof image === "object" && image?.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });

      if (onCancel) {
        onCancel();
      }
    },
    [onCancel, formData.images]
  );

  // Inside your ProductForm component
  useEffect(() => {
    const newPriceType = formData.hasFixedPrice ? "FIXED" : "VARIABLE";
    if (formData.priceType !== newPriceType) {
      handleInputChange("priceType", newPriceType);
    }
  }, [formData.hasFixedPrice, formData.priceType, handleInputChange]);

  const formContent = useMemo(() => {
    return (
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger className="cursor-pointer" value="basic">
              Basic Info
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="pricing">
              Pricing & Inventory
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="metadata">
              Metadata
            </TabsTrigger>
            <TabsTrigger className="cursor-pointer" value="media">
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="e.g. Premium T-Shirt"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Describe this product..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId ? String(formData.categoryId) : ""}
                  onValueChange={(value) => {
                    handleInputChange("categoryId", value === "0" ? "" : value);
                  }}
                  disabled={categoriesLoading}
                >
                  <SelectTrigger id="category">
                    <SelectValue
                      placeholder={
                        categoriesLoading
                          ? "Loading categories..."
                          : categories.length === 0
                          ? "No categories available"
                          : "Select category"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="0">Select category</SelectItem>
                    {categoriesLoading ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Loading categories...
                      </div>
                    ) : categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                          className="cursor-pointer"
                        >
                          {category.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No categories available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Pricing Type</Label>
                <Select
                  value={formData.priceType}
                  onValueChange={(value) => {
                    handleInputChange("priceType", value);
                    handleInputChange("hasFixedPrice", value === "FIXED");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem className="cursor-pointer" value="FIXED">
                      Fixed Price
                    </SelectItem>
                    <SelectItem className="cursor-pointer" value="VARIABLE">
                      Variable Price (by unit)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="hasFixedPrice"
                  checked={formData.hasFixedPrice}
                  onCheckedChange={(checked) => {
                    handleInputChange("hasFixedPrice", checked);
                    // FIXED: Update priceType when switch changes
                    handleInputChange(
                      "priceType",
                      checked ? "FIXED" : "VARIABLE"
                    );
                  }}
                  className="bg-gray-300"
                />
                <Label htmlFor="hasFixedPrice">Has Fixed Price</Label>
              </div>

              {formData.hasFixedPrice ? (
                <div className="grid gap-2">
                  <Label htmlFor="fixedPrice">Fixed Price</Label>
                  <Input
                    id="fixedPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.fixedPrice}
                    onChange={(e) =>
                      handleInputChange("fixedPrice", e.target.value)
                    }
                    placeholder="29.99"
                  />
                </div>
              ) : (
                <div className="grid gap-4">
                  <Label>Unit Prices</Label>
                  {formData.unitPrices.map((unitPrice, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-3 gap-2 items-end"
                    >
                      <div className="grid gap-1">
                        <Label>Unit</Label>
                        <Input
                          value={unitPrice.unit}
                          onChange={(e) => {
                            const updatedUnitPrices = [...formData.unitPrices];
                            updatedUnitPrices[index].unit = e.target.value;
                            handleInputChange("unitPrices", updatedUnitPrices);
                          }}
                          placeholder="1kg"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label>Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={unitPrice.price}
                          onChange={(e) => {
                            const updatedUnitPrices = [...formData.unitPrices];
                            updatedUnitPrices[index].price = e.target.value;
                            handleInputChange("unitPrices", updatedUnitPrices);
                          }}
                          placeholder="29.99"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          const updatedUnitPrices = formData.unitPrices.filter(
                            (_, i) => i !== index
                          );
                          handleInputChange("unitPrices", updatedUnitPrices);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      const updatedUnitPrices = [
                        ...formData.unitPrices,
                        { unit: "", price: "0" },
                      ];
                      handleInputChange("unitPrices", updatedUnitPrices);
                    }}
                  >
                    Add Unit Price
                  </Button>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Product SKU</Label>
                <HybridSkuInput
                  value={formData.sku}
                  onChange={handleSkuChange}
                  productName={formData.name}
                  categoryId={formData.categoryId}
                  existingSkus={existingSkus}
                  className="w-full"
                />
              </div>

              {/* <div className="grid gap-2">
                <Label htmlFor="quantity">Stock Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", e.target.value)
                  }
                  placeholder="100"
                />
              </div> */}
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="space-y-4">
                <h4 className="font-medium">Product Flags</h4>
                <div className="grid gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isFeatured"
                      checked={formData.isFeatured}
                      onCheckedChange={(checked) =>
                        handleInputChange("isFeatured", checked)
                      }
                      className="bg-gray-300"
                    />
                    <Label htmlFor="isFruit">Featured Product</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isVegetable"
                      checked={formData.isVegetable}
                      onCheckedChange={(checked) =>
                        handleInputChange("isVegetable", checked)
                      }
                      className="bg-gray-300"
                    />
                    <Label htmlFor="isVegetable">Vegetable Product</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isDealOfTheDay"
                      checked={formData.isDealOfTheDay}
                      onCheckedChange={(checked) =>
                        handleInputChange("isDealOfTheDay", checked)
                      }
                      className="bg-gray-300"
                    />
                    <Label htmlFor="isDealOfTheDay">Deal of the Day</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isFruit"
                      checked={formData.isFruit}
                      onCheckedChange={(checked) =>
                        handleInputChange("isFruit", checked)
                      }
                      className="bg-gray-300"
                    />
                    <Label htmlFor="isFruit">Fruit Product</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isNewArrival"
                      checked={formData.isNewArrival}
                      onCheckedChange={(checked) =>
                        handleInputChange("isNewArrival", checked)
                      }
                      className="bg-gray-300"
                    />
                    <Label htmlFor="isNewArrival">New Arrival</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isTrending"
                      checked={formData.isTrending}
                      onCheckedChange={(checked) =>
                        handleInputChange("isTrending", checked)
                      }
                      className="bg-gray-300"
                    />
                    <Label htmlFor="isTrending">Trending Product</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Additional Information</h4>
                <div className="grid gap-2">
                  <Label htmlFor="weight">Weight (grams)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    value={formData.weight || ""}
                    onChange={(e) =>
                      handleInputChange("weight", e.target.value)
                    }
                    placeholder="weight in kg"
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Product Images</Label>
                <div className="grid grid-cols-5 gap-4">
                  <div
                    className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-md border-gray-300 p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={handleAddImageClick}
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>

                  {formData.images.map((image, index) => {
                    const imageUrl = getImageUrl(image);
                    return (
                      <div
                        key={index}
                        className="relative h-40 rounded-md overflow-hidden group"
                      >
                        <Image
                          src={imageUrl}
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover"
                          width={150}
                          height={150}
                        />
                        <div className="absolute inset-0 bg-black/50 bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePreviewImage(image);
                              }}
                            >
                              <Eye className="h-4 w-4 text-white" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveImage(index);
                              }}
                            >
                              <X className="h-4 w-4 text-white cursor-pointer" />
                            </Button>
                          </div>
                        </div>
                        {index === 0 && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                        {/* FIXED: Show upload status for new images */}
                        {typeof image === "object" && image?.isNew && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                            New
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Upload product images. First image will be used as the product
                  thumbnail. You can upload multiple images at once.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Image Preview Dialog */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              {imagePreview && (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full max-h-[70vh] object-contain rounded-md"
                  width={800}
                  height={600}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }, [
    activeTab,
    formData,
    categories,
    categoriesLoading,
    existingSkus,
    handleInputChange,
    handleSkuChange,
    handleAddImageClick,
    handleImageUpload,
    handleRemoveImage,
    handlePreviewImage,
    getImageUrl,
    imagePreview,
    isPreviewOpen,
  ]);

  // FIXED: Cleanup effect for object URLs
  useEffect(() => {
    return () => {
      // Cleanup any object URLs when component unmounts
      formData.images?.forEach((image) => {
        if (typeof image === "object" && image?.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
    };
  }, []);

  if (mode === "add") {
    return (
      <Card className="mx-auto border border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle>Add New Product</CardTitle>
          <CardDescription>
            Fill in the details for your new product
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formContent}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="cursor-pointer flex items-center gap-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
            >
              {loading ? "Adding Product..." : "Add Product"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogDescription>Update product information.</DialogDescription>
      </DialogHeader>
      {formContent}
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="cursor-pointer flex items-center gap-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
