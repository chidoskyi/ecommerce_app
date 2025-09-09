"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import { PriceFormatter } from "@/components/reuse/FormatCurrency"
import { Product, ProductViewDialogProps } from "@/types/products"
import { getStatusBadgeColor } from "./ProductBadge"

export function ProductViewDialog({ product, categories }: ProductViewDialogProps) {
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Get category name by ID
  const getCategoryName = (product: Product) => {
    // First check if product has embedded category data
    if (
      product.category &&
      typeof product.category === "object" &&
      product.category.name
    ) {
      return product.category.name;
    }

    // Fallback to looking up by ID if no embedded data
    if (!product.categoryId) return "Uncategorized";

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return "Loading...";
    }

    const category = categories.find(
      (cat) =>
        cat && cat.id && cat.id.toString() === product.categoryId?.toString()
    );

    return category ? category.name : "Uncategorized";
  };

  // Add this to see what's actually in priceType
  console.log('priceType value:', product.priceType);
  console.log('priceType type:', typeof product.priceType);
  console.log('hasFixedPrice:', product.hasFixedPrice);

  return (
    <>
      <DialogHeader className="px-4 sm:px-6">
        <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 rounded-sm flex-shrink-0">
            <AvatarImage src={product.images?.[0] || "/placeholder.svg?height=40&width=40"} alt={product.name} />
            <AvatarFallback className="rounded-sm text-xs sm:text-sm">{product.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="truncate">{product.name}</span>
        </DialogTitle>
        <DialogDescription className="text-sm">View detailed information about this product</DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mx-4 sm:mx-6 mb-4">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-1 sm:px-3">Overview</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs sm:text-sm px-1 sm:px-3">Pricing</TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs sm:text-sm px-1 sm:px-3">Metadata</TabsTrigger>
          <TabsTrigger value="media" className="text-xs sm:text-sm px-1 sm:px-3">Media</TabsTrigger>
        </TabsList>

        <div className="px-4 sm:px-6">
          <TabsContent value="overview" className="space-y-4 py-4 mt-0">
            <div className="grid gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Product Name</div>
                    <div className="text-sm sm:text-base break-words">{product.name}</div>
                  </div>

                  {product.description && (
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Description</div>
                      <div className="text-sm sm:text-base break-words">{product.description}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Category</div>
                      <div className="text-sm sm:text-base">{product.categoryId != null ? getCategoryName(product) : "—"}</div>
                    </div>

                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Status</div>
                      <Badge className={`${getStatusBadgeColor(product.status)} w-fit`} variant="outline">
                        {product.status === "ACTIVE" ? "Active" : product.status === "INACTIVE" ? "Inactive" : "Draft"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">SKU</div>
                    <div className="text-sm sm:text-base">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
                        {product.sku || '-'}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Inventory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Quantity in Stock</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-bold">{product.quantity}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Timestamps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Created</div>
                      <div className="text-sm break-words">{formatDate(product.createdAt.toString())}</div>
                    </div>

                    {product.updatedAt && (
                      <div className="grid gap-2">
                        <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                        <div className="text-sm break-words">{formatDate(product.updatedAt.toString())}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="pricing" className="space-y-4 py-4 mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Pricing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Pricing Type</div>
                  <Badge variant="outline" className="p-2 w-fit text-xs sm:text-sm">
                    {product.priceType?.toLowerCase() === "fixed" ? "Fixed Price" : "Variable Price"}
                  </Badge>
                </div>

                {product.hasFixedPrice === true ? (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Fixed Price</div>
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">
                      <PriceFormatter amount={product.fixedPrice} showDecimals />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Unit Prices</div>
                    <div className="space-y-2">
                      {product.unitPrices?.map((unitPrice, index) => (
                        <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 border rounded-lg gap-2">
                          <span className="font-medium text-sm sm:text-base">{unitPrice.unit}</span>
                          <span className="text-base sm:text-lg font-bold text-green-600">
                            <PriceFormatter amount={unitPrice.price} showDecimals/>
                          </span>
                        </div>
                      )) || <div className="text-muted-foreground text-sm">No unit prices defined</div>}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4 py-4 mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Product Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {product.isFeatured && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-yellow-100 text-yellow-800"
                    >
                      Featured
                    </Badge>
                  )}
                  {product.isTrending && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-800"
                    >
                      Trending
                    </Badge>
                  )}
                  {product.isDealOfTheDay && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-red-100 text-red-800"
                    >
                      Deal of the Day
                    </Badge>
                  )}
                  {product.isNewArrival && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-blue-100 text-blue-800"
                    >
                      New Arrival
                    </Badge>
                  )}
                  {!product.isFeatured && !product.isTrending && !product.isDealOfTheDay && !product.isNewArrival && (
                    <div className="text-muted-foreground text-sm">No special flags set</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {product.weight && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Weight</div>
                    <div className="text-sm sm:text-base">{product.weight}kg</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="media" className="space-y-4 py-4 mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Product Images</CardTitle>
              </CardHeader>
              <CardContent>
                {product.images && product.images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {product.images.map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                        <Image
                          src={image || "/placeholder.svg"}
                          alt={`${product.name} - Image ${index + 1}`}
                          className="w-full h-full object-cover"
                          width={200}
                          height={200}
                        />
                        {index === 0 && (
                          <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
                            Primary
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 sm:h-40 border-2 border-dashed rounded-lg">
                    <div className="text-muted-foreground text-sm text-center px-4">No images uploaded</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </>
  )
}