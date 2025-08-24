"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { X, Upload, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import Image from "next/image"
import { toast } from "react-toastify"
import { useRouter } from "next/navigation"
import { Category, Product } from "@/lib/types"

interface ProductFormProps {
  mode: "add" | "edit";
  product?: Product;
  categories?: Category[];
  onSave?: (product: Product) => void;
  onCancel?: () => void;
  onProductChange?: (product: ProductFormState) => void;
}

// 1. Define a type for your form state

export type ProductFormState = {
  name: string;
  description: string;
  hasFixedPrice: boolean;
  priceType: "fixed" | "variable";
  fixedPrice: string;
  unitPrices: { unit: string; price: string }[];
  compareAtPrice: string;
  cost: string;
  sku: string;
  quantity: string;
  categoryId: string;
  status: "active" | "draft" | "out_of_stock";
  isFeatured: boolean;
  isTrending: boolean;
  isDealOfTheDay: boolean;
  isNewArrival: boolean;
  images: string[];
  weight: string;
  dimensions: string;
  createdAt: string;
};

export function ProductForm({ mode, product, categories = [], onSave, onCancel, onProductChange }: ProductFormProps) {
  console.log("🔄 ProductForm RENDER START - mode:", mode, "product ID:", product?.id, "timestamp:", Date.now())

  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState("basic")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // 2. Use this type for your form state
  const initialFormData: ProductFormState = useMemo(() => ({
    name: "",
    description: "",
    hasFixedPrice: true,
    priceType: "fixed",
    fixedPrice: "0",
    unitPrices: [],
    compareAtPrice: "0",
    cost: "0",
    sku: "",
    quantity: "0",
    categoryId: "",
    status: "active",
    isFeatured: false,
    isTrending: false,
    isDealOfTheDay: false,
    isNewArrival: false,
    images: [],
    weight: "",
    dimensions: "",
    createdAt: new Date().toISOString(),
  }), []);

  // In the form initialization and useEffect, ensure unitPrices always have price as string
  const [formData, setFormData] = useState<ProductFormState>(
    product
      ? {
          ...initialFormData,
          ...product,
          fixedPrice: String(product.fixedPrice ?? "0"),
          compareAtPrice: String(product.compareAtPrice ?? "0"),
          cost: String(product.cost ?? "0"),
          quantity: String(product.quantity ?? "0"),
          categoryId: product.categoryId ? String(product.categoryId) : "",
          unitPrices: product.unitPrices
            ? product.unitPrices.map((u) => ({ unit: u.unit, price: String(u.price) }))
            : [],
        }
      : initialFormData
  );

  // In useEffect, ensure unitPrices always have price as string
  useEffect(() => {
    if (product) {
      setFormData({
        ...initialFormData,
        ...product,
        fixedPrice: String(product.fixedPrice ?? "0"),
        compareAtPrice: String(product.compareAtPrice ?? "0"),
        cost: String(product.cost ?? "0"),
        quantity: String(product.quantity ?? "0"),
        categoryId: product.categoryId ? String(product.categoryId) : "",
        unitPrices: product.unitPrices
          ? product.unitPrices.map((u) => ({ unit: u.unit, price: String(u.price) }))
          : [],
      });
    }
  }, [product, initialFormData]);

  // Stable input change handler
  const handleInputChange = useCallback(
    (field: keyof ProductFormState, value: unknown) => {
      console.log(
        "📝 Input change - field:",
        field,
        "value:",
        typeof value === "string" ? value.substring(0, 50) : value,
      )

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
  )

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📷 Image upload triggered")
    const files = event.target.files
    if (!files) return

    const fileArray = Array.from(files)
    const imagePromises: Promise<string>[] = []

    fileArray.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const promise = new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            const imageUrl = e.target?.result as string
            resolve(imageUrl)
          }
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        imagePromises.push(promise)
      } else {
        toast.error(`${file.name} is not an image file`)
      }
    })

    Promise.all(imagePromises)
      .then((imageUrls) => {
        console.log("📷 Images processed:", imageUrls.length)
        setFormData((prevData) => {
          const updatedImages = [...prevData.images, ...imageUrls]
          return { ...prevData, images: updatedImages }
        })
        toast.success(`${imageUrls.length} image(s) uploaded successfully`)
      })
      .catch((error) => {
        console.error("❌ Error uploading images:", error)
        toast.error("Failed to upload some images")
      })

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const handleRemoveImage = useCallback(
    (index: number) => {
      console.log("🗑️ Removing image at index:", index)
      setFormData((prevData) => {
        const updatedImages = [...prevData.images]
        const removedImage = updatedImages.splice(index, 1)[0]

        // Close preview if the previewed image is being removed
        if (imagePreview === removedImage) {
          setImagePreview(null)
          setIsPreviewOpen(false)
        }

        return { ...prevData, images: updatedImages }
      })
    },
    [imagePreview],
  )

  const handlePreviewImage = useCallback((imageUrl: string) => {
    console.log("👁️ Preview image:", imageUrl.substring(0, 50) + "...")
    setImagePreview(imageUrl)
    setIsPreviewOpen(true)
  }, [])

  const handleAddImageClick = useCallback((e: React.MouseEvent) => {
    console.log("📷 Add image click")
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }, [])

  const handleSubmit = useCallback(
    async (e?: React.MouseEvent) => {
      console.log("💾 Submit triggered - mode:", mode)
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      try {
        // Validate form
        if (!formData.name || (!formData.fixedPrice && formData.priceType === "fixed") || !formData.sku) {
          console.log("❌ Validation failed:", {
            name: formData.name,
            price: formData.fixedPrice,
            sku: formData.sku,
          })
          toast.error("Name, price, and SKU are required fields")
          return
        }

        if (mode === "add") {
          const mockProduct: Product = {
            id: Date.now(),
            name: formData.name,
            description: formData.description,
            hasFixedPrice: formData.hasFixedPrice,
            priceType: formData.priceType,
            fixedPrice: parseFloat(formData.fixedPrice) || 0,
            unitPrices: formData.unitPrices.map((u) => ({ unit: u.unit, price: parseFloat(u.price) || 0 })),
            inStock: parseInt(formData.quantity) > 0,
            compareAtPrice: parseFloat(formData.compareAtPrice) || 0,
            cost: parseFloat(formData.cost) || 0,
            sku: formData.sku,
            quantity: parseInt(formData.quantity) || 0,
            categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
            status: formData.status,
            isFeatured: formData.isFeatured,
            isTrending: formData.isTrending,
            isDealOfTheDay: formData.isDealOfTheDay,
            isNewArrival: formData.isNewArrival,
            rating: null,
            images: formData.images,
            weight: formData.weight,
            dimensions: formData.dimensions,
            createdAt: formData.createdAt,
            updatedAt: new Date().toISOString(),
          };
          console.log("✅ Product added:", mockProduct.name)
          toast.success("Product added successfully")
          router.push("/admin/products")
          if (onSave) {
            onSave(mockProduct);
          }
        } else if (onSave) {
          console.log("✅ Product saved")
          onSave()
        }
      } catch (error) {
        console.error("❌ Error saving product:", error)
        toast.error("Failed to save product")
      }
    },
    [mode, formData, onSave, router],
  )

  const handleCancel = useCallback(
    (e?: React.MouseEvent) => {
      console.log("❌ Cancel triggered")
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (onCancel) {
        onCancel()
      } else {
        router.push("/admin/products")
      }
    },
    [onCancel, router],
  )

  // Memoize the form JSX to prevent unnecessary re-renders
  const formContent = useMemo(() => {
    console.log("🎨 Form content render - activeTab:", activeTab, "formData.name:", formData.name)

    return (
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    console.log("📝 Name input onChange:", e.target.value)
                    handleInputChange("name", e.target.value)
                  }}
                  placeholder="e.g. Premium T-Shirt"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    console.log("📝 Description input onChange:", e.target.value.substring(0, 50) + "...")
                    handleInputChange("description", e.target.value)
                  }}
                  placeholder="Describe this product..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.categoryId ? String(formData.categoryId) : ""}
                  onValueChange={(value) => {
                    console.log("📝 Category onChange:", value)
                    handleInputChange("categoryId", value ? Number.parseInt(value) : null)
                  }}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Uncategorized</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => {
                    console.log("📝 Status onChange:", value)
                    handleInputChange("status", value)
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
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
                    console.log("📝 Price type onChange:", value)
                    handleInputChange("priceType", value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="variable">Variable Price (by unit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.priceType === "fixed" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="fixedPrice">Fixed Price</Label>
                    <Input
                      id="fixedPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.fixedPrice}
                      onChange={(e) => {
                        console.log("📝 Fixed price onChange:", e.target.value)
                        handleInputChange("fixedPrice", e.target.value)
                      }}
                      placeholder="29.99"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <Label>Unit Prices</Label>
                  {formData.unitPrices.map((unitPrice, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 items-end">
                      <div className="grid gap-1">
                        <Label>Unit</Label>
                        <Input
                          value={unitPrice.unit}
                          onChange={(e) => {
                            console.log("📝 Unit price unit onChange:", index, e.target.value)
                            const updatedUnitPrices = [...formData.unitPrices]
                            updatedUnitPrices[index].unit = e.target.value
                            handleInputChange("unitPrices", updatedUnitPrices)
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
                            console.log("📝 Unit price value onChange:", index, e.target.value)
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
                          e.preventDefault()
                          e.stopPropagation()
                          console.log("🗑️ Remove unit price:", index)
                          const updatedUnitPrices = formData.unitPrices.filter((_, i) => i !== index)
                          handleInputChange("unitPrices", updatedUnitPrices)
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
                      e.stopPropagation();
                      const updatedUnitPrices = [...formData.unitPrices, { unit: "", price: "0" }];
                      handleInputChange("unitPrices", updatedUnitPrices);
                    }}
                  >
                    Add Unit Price
                  </Button>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="compareAtPrice">Compare at Price</Label>
                  <Input
                    id="compareAtPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.compareAtPrice}
                    onChange={(e) => {
                      console.log("📝 Compare price onChange:", e.target.value)
                      handleInputChange("compareAtPrice", e.target.value)
                    }}
                    placeholder="39.99"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cost">Cost per Item</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => {
                      console.log("📝 Cost onChange:", e.target.value)
                      handleInputChange("cost", e.target.value)
                    }}
                    placeholder="15.00"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => {
                      console.log("📝 Quantity onChange:", e.target.value)
                      handleInputChange("quantity", e.target.value)
                    }}
                    placeholder="100"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sku">SKU (Stock Keeping Unit)</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => {
                      console.log("📝 SKU onChange:", e.target.value)
                      handleInputChange("sku", e.target.value)
                    }}
                    placeholder="TS-001"
                  />
                </div>

                {/* <div className="grid gap-2">
                  <Label htmlFor="barcode">Barcode (ISBN, UPC, GTIN, etc.)</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => {
                      console.log("📝 Barcode onChange:", e.target.value)
                      handleInputChange("barcode", e.target.value)
                    }}
                    placeholder="123456789012"
                  />
                </div> */}
              </div>
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
                      onCheckedChange={(checked) => {
                        console.log("📝 Featured onChange:", checked)
                        handleInputChange("isFeatured", checked)
                      }}
                    />
                    <Label htmlFor="isFeatured">Featured Product</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isTrending"
                      checked={formData.isTrending}
                      onCheckedChange={(checked) => {
                        console.log("📝 Trending onChange:", checked)
                        handleInputChange("isTrending", checked)
                      }}
                    />
                    <Label htmlFor="isTrending">Trending Product</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isDealOfTheDay"
                      checked={formData.isDealOfTheDay}
                      onCheckedChange={(checked) => {
                        console.log("📝 Deal of day onChange:", checked)
                        handleInputChange("isDealOfTheDay", checked)
                      }}
                    />
                    <Label htmlFor="isDealOfTheDay">Deal of the Day</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isNewArrival"
                      checked={formData.isNewArrival}
                      onCheckedChange={(checked) => {
                        console.log("📝 New arrival onChange:", checked)
                        handleInputChange("isNewArrival", checked)
                      }}
                    />
                    <Label htmlFor="isNewArrival">New Arrival</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Additional Information</h4>
                {/* <div className="grid gap-2">
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags || ""}
                    onChange={(e) => {
                      console.log("📝 Tags onChange:", e.target.value)
                      handleInputChange("tags", e.target.value)
                    }}
                    placeholder="summer, cotton, casual"
                  />
                </div> */}

                {/* <div className="grid gap-2">
                  <Label htmlFor="weight">Weight (grams)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    value={formData.weight || ""}
                    onChange={(e) => {
                      console.log("📝 Weight onChange:", e.target.value)
                      handleInputChange("weight", e.target.value)
                    }}
                    placeholder="250"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dimensions">Dimensions (L x W x H cm)</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions || ""}
                    onChange={(e) => {
                      console.log("📝 Dimensions onChange:", e.target.value)
                      handleInputChange("dimensions", e.target.value)
                    }}
                    placeholder="30 x 20 x 5"
                  />
                </div> */}
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
                    <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
                  </div>

                  {formData.images.map((image, index) => (
                    <div key={index} className="relative h-40 rounded-md overflow-hidden group">
                      <Image
                        src={image || "/placeholder.svg"}
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
                              e.preventDefault()
                              e.stopPropagation()
                              handlePreviewImage(image)
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
                              e.preventDefault()
                              e.stopPropagation()
                              handleRemoveImage(index)
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
                    </div>
                  ))}
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
                  Upload product images. First image will be used as the product thumbnail. You can upload multiple
                  images at once. Click the eye icon to preview images in full size.
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
                  src={imagePreview || "/placeholder.svg"}
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
    )
  }, [
    activeTab,
    formData,
    categories,
    handleInputChange,
    handleAddImageClick,
    handleImageUpload,
    handleRemoveImage,
    handlePreviewImage,
    imagePreview,
    isPreviewOpen,
  ])

  console.log("🔄 ProductForm RENDER END - returning JSX")

  if (mode === "add") {
    return (
      <Card className="mx-auto border border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>Fill in the details for your new product</CardDescription>
        </CardHeader>
        <CardContent>
          {formContent}
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit}>
              Add Product
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Product</DialogTitle>
        <DialogDescription>Update product information.</DialogDescription>
      </DialogHeader>
      {formContent}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit}>
          Save Changes
        </Button>
      </DialogFooter>
    </>
  )
}
