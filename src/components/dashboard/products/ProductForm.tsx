"use client";

import type React from "react";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { X, Upload, Eye, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import * as Selection from "@radix-ui/react-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useRouter } from "next/navigation";
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
  CreateProductData,
  formStateToApiData,
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
  deleteProductImage,
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

interface LocalImage {
  previewUrl?: string;
  file?: File;
  url?: string;
  id?: string;
  image?: string;
  isNew?: boolean;
  name?: string;
  size?: number;
  type?: string;
}

interface CloudImage {
  id: string;
  url: string;
  // other cloud image properties
}

type ProductImage = CloudImage | LocalImage;

// interface ImagePreview extends CloudImage, LocalImage {}

export function ProductForm({
  mode,
  product,
  onSuccess,
  onError,
  onCancel,
  onProductChange,
  // onEditProduct, // Add this new prop
  existingSkus = [],
}: ProductFormPropsExtended) {
  const dispatch = useAppDispatch();
  const categories = useAppSelector(selectCategories);

  // Add this state at the top of your component
  // const [mobileTabOpen, setMobileTabOpen] = useState(false);

  const tabs = [
    { value: "basic", label: "Basic Info" },
    { value: "pricing", label: "Pricing & Inventory" },
    { value: "metadata", label: "Metadata" },
    { value: "media", label: "Media" },
  ];

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
      newImageFiles: [],
      imagesToDelete: [],
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

  const getImageUrl = useCallback((image: string | ProductImage): string => {
    if (typeof image === "string") return image;
    if (image && typeof image === "object") {
      if ("previewUrl" in image && image.previewUrl) return image.previewUrl;
      if ("url" in image && image.url) return image.url;
    }
    return "/placeholder.svg";
  }, []);

  const handleRemoveImage = useCallback(
    async (index: number) => {
      const imageToRemove = formData.images[index];

      // If we're in edit mode and this is a cloud-stored image (has a URL but no file)
      if (
        mode === "edit" &&
        imageToRemove &&
        typeof imageToRemove === "object" &&
        "url" in imageToRemove &&
        imageToRemove.url &&
        !("file" in imageToRemove)
      ) {
        try {
          setLoading(true);
          await dispatch(
            deleteProductImage({
              productId: product?.id || "",
              imageUrl: imageToRemove.url, // Use imageUrl instead of imageId
            })
          ).unwrap();

          toast.success("Image removed from cloud successfully");
        } catch (error) {
          console.error("Error deleting image from cloud:", error);
          toast.error("Failed to delete image from cloud");
          return; // Don't remove from local state if cloud deletion fails
        } finally {
          setLoading(false);
        }
      }

      // Remove from local state (for both cloud images and local previews)
      setFormData((prevData) => {
        const updatedImages = [...prevData.images];
        const removedImage = updatedImages.splice(index, 1)[0];

        // Revoke object URL if it was a preview to prevent memory leaks
        if (
          removedImage &&
          typeof removedImage === "object" &&
          "previewUrl" in removedImage &&
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
    [mode, product?.id, dispatch, formData.images, imagePreview, getImageUrl]
  );

  const handlePreviewImage = useCallback(
    (image: ProductImage) => {
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

            // Create product without images first using destructuring
            const { newImageFiles, ...productDataWithoutFiles } = apiData;

            // Ensure description is never null - convert null to empty string
            const productDataForApi: CreateProductData = {
              ...productDataWithoutFiles,
              description: productDataWithoutFiles.description || "",
              weight: productDataWithoutFiles.weight || "", // Provide empty string as defaul
            } as CreateProductData;

            const result = await dispatch(
              createProduct(productDataForApi)
            ).unwrap();
            console.log("✅ Product created, now uploading images...");

            // Upload images to the created product
            if (newImageFiles.length > 0) {
              if (!result.id) {
                console.error("❌ No product ID available for image upload");
                throw new Error("Product ID is required for image upload");
              }
              
              await dispatch(
                uploadProductImages({
                  productId: result.id, // Now TypeScript knows it's a string
                  files: newImageFiles,
                })
              ).unwrap();
              console.log("✅ Images uploaded successfully");
            }
          } else {
            // No file uploads, create normally with description fix
            const productDataForApi = {
              ...apiData,
              description: apiData.description || "",
            };
            const result = await dispatch(
              createProduct(productDataForApi)
            ).unwrap();
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
            router.push("/admin/products");
          }, 100);
        } else if (mode === "edit" && product) {
          // For updates, handle images separately
          console.log("📝 Updating existing product...");

          // Update product data (without new files) using destructuring
          const { newImageFiles, ...productDataWithoutFiles } = apiData;

          // Ensure description is never null
          const productDataForApi = {
            ...productDataWithoutFiles,
            description: productDataWithoutFiles.description || "",
          };

          if (!product.id) {
            throw new Error("Product ID is required for update");
          }
          
          const result = await dispatch(
            updateProduct({
              id: product.id, // Now TypeScript knows it's a string
              productData: productDataForApi,
            })
          ).unwrap();

          // Upload any new images
          if (newImageFiles && newImageFiles.length > 0) {
            console.log(`📤 Uploading ${newImageFiles.length} new images...`);
            await dispatch(
              uploadProductImages({
                productId: product.id,
                files: newImageFiles,
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
      } catch (error: unknown) {
        console.error("❌ Error in form submission:", error);

        let errorMessage = "Failed to save product";

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        }

        toast.error(errorMessage);

        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      mode,
      formData,
      product,
      dispatch,
      onSuccess,
      onError,
      existingSkus,
      router,
    ]
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
        {/* Mobile Dropdown - Integrated with Radix Tabs */}
        <div className="md:hidden mb-4">
          <Selection.Root value={activeTab} onValueChange={setActiveTab}>
            <Selection.Trigger className="w-full flex items-center justify-between p-3 border border-gray-300 rounded-md bg-white">
              <Selection.Value>
                {tabs.find((tab) => tab.value === activeTab)?.label}
              </Selection.Value>
              <Selection.Icon>
                <ChevronDown className="h-4 w-4" />
              </Selection.Icon>
            </Selection.Trigger>

            <Selection.Portal>
              <Selection.Content className="bg-white border border-gray-300 rounded-md shadow-lg z-50">
                <Selection.Viewport className="p-1">
                  {tabs.map((tab) => (
                    <Selection.Item
                      key={tab.value}
                      value={tab.value}
                      className="p-3 text-sm rounded-md hover:bg-gray-50 cursor-pointer data-[highlighted]:bg-gray-50 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-600"
                    >
                      <Selection.ItemText>{tab.label}</Selection.ItemText>
                    </Selection.Item>
                  ))}
                </Selection.Viewport>
              </Selection.Content>
            </Selection.Portal>
          </Selection.Root>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tabs */}
          <TabsList className="hidden md:grid w-full grid-cols-4">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                className="cursor-pointer"
                value={tab.value}
              >
                {tab.label}
              </TabsTrigger>
            ))}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                  {/* Upload Button */}
                  <div
                    className="flex flex-col items-center justify-center h-28 sm:h-32 md:h-40 border-2 border-dashed rounded-md border-gray-300 p-2 sm:p-3 md:p-4 text-center hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={handleAddImageClick}
                  >
                    <Upload className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-gray-400 mb-1 sm:mb-2" />
                    <p className="text-xs sm:text-sm text-gray-500">
                      Click to upload
                    </p>
                    <p className="text-[10px] xs:text-xs text-gray-400 mt-0.5 sm:mt-1">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>

                  {/* Image Previews */}
                  {formData.images.map((image, index) => {
                    const imageUrl = getImageUrl(image);
                    // Convert string to LocalImage if needed, otherwise use as-is
                    const imageForPreview =
                      typeof image === "string"
                        ? { url: image, isNew: false }
                        : image;
                    return (
                      <div
                        key={index}
                        className="relative h-28 sm:h-32 md:h-40 rounded-md overflow-hidden group"
                      >
                        <Image
                          src={imageUrl}
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover"
                          width={150}
                          height={150}
                        />
                        <div className="absolute inset-0 bg-black/50 bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                          <div className="flex gap-1 sm:gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                handlePreviewImage(imageForPreview);
                              }}
                            >
                              <Eye className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4 text-white" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                handleRemoveImage(index);
                              }}
                            >
                              <X className="h-3 w-3 sm:h-3 sm:w-3 md:h-4 md:w-4 text-white cursor-pointer" />
                            </Button>
                          </div>
                        </div>
                        {/* Primary Badge */}
                        {index === 0 && (
                          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-blue-500 text-white text-[10px] xs:text-xs px-1 py-0.5 sm:px-2 sm:py-1 rounded">
                            Primary
                          </div>
                        )}
                        {/* New Image Badge */}
                        {typeof image === "object" && image?.isNew && (
                          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-green-500 text-white text-[10px] xs:text-xs px-1 py-0.5 sm:px-2 sm:py-1 rounded">
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
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
