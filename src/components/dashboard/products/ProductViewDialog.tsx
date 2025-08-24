"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import { Category, Product } from "@/lib/types"
import { PriceFormatter } from "@/components/reuse/FormatCurrency"

interface ProductViewDialogProps {
  product: Product;
  categories: Category[]
}

export function ProductViewDialog({ product, categories }: ProductViewDialogProps) {
  // Format currency
  // const formatCurrency = (amount) => {
  //   if (!amount) return "N/A"
  //   return new Intl.NumberFormat("en-US", {
  //     style: "currency",
  //     currency: "USD",
  //   }).format(amount)
  // }

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
  const getCategoryName = (categoryId: string | number) => {
    const category = categories.find((cat) => cat.id === categoryId)
    return category ? category.name : "Uncategorized"
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
      case "out_of_stock":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    }
  }

  // Get stock status
  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) {
      return { label: "Out of stock", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" }
    } else if (quantity <= 10) {
      return { label: "Low stock", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" }
    } else {
      return { label: "In stock", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" }
    }
  }

  const stockStatus = getStockStatus(product.quantity)

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-sm">
            <AvatarImage src={product.images?.[0] || "/placeholder.svg?height=40&width=40"} alt={product.name} />
            <AvatarFallback className="rounded-sm">{product.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          {product.name}
        </DialogTitle>
        <DialogDescription>View detailed information about this product</DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 py-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Product Name</div>
                  <div className="text-base">{product.name}</div>
                </div>

                {product.description && (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Description</div>
                    <div className="text-base">{product.description}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Category</div>
                    <div className="text-base">{product.categoryId != null ? getCategoryName(product.categoryId) : "—"}</div>
                  </div>

                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <Badge className={getStatusBadgeColor(product.status)} variant="outline">
                      {product.status === "active" ? "Active" : product.status === "draft" ? "Draft" : "Out of Stock"}
                    </Badge>
                  </div>
                </div>

                {/* <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">SKU</div>
                    <div className="text-base font-mono">{product.sku}</div>
                  </div>

                      {product.barcode && (
                        <div className="grid gap-2">
                          <div className="text-sm font-medium text-muted-foreground">Barcode</div>
                          <div className="text-base font-mono">{product.barcode}</div>
                        </div>
                      )}
                    </div> */}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inventory</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Quantity in Stock</div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{product.quantity}</span>
                      <Badge className={stockStatus.color} variant="outline">
                        {stockStatus.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Timestamps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Created</div>
                    <div className="text-base">{formatDate(product.createdAt)}</div>
                  </div>

                  {product.updatedAt && (
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Last Updated</div>
                      <div className="text-base">{formatDate(product.updatedAt)}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pricing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium text-muted-foreground">Pricing Type</div>
                <Badge variant="outline">{product.priceType === "fixed" ? "Fixed Price" : "Variable Price"}</Badge>
              </div>

              {product.priceType === "fixed" ? (
                <div className="grid gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Fixed Price</div>
                  <div className="text-3xl font-bold text-green-600">
                    <PriceFormatter amount={product.fixedPrice} showDecimals />
                  </div>
                </div>
              ) : (
                <div className="grid gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Unit Prices</div>
                  <div className="space-y-2">
                    {product.unitPrices?.map((unitPrice, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <span className="font-medium">{unitPrice.unit}</span>
                        <span className="text-lg font-bold text-green-600"><PriceFormatter amount={unitPrice.price} showDecimals/></span>
                      </div>
                    )) || <div className="text-muted-foreground">No unit prices defined</div>}
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                {product.compareAtPrice && (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Compare at Price</div>
                    <div className="text-lg line-through text-muted-foreground">
                    <PriceFormatter amount={product.compareAtPrice} showDecimals />
                    </div>
                  </div>
                )}

                {product.cost && (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Cost per Item</div>
                    <div className="text-lg"><PriceFormatter amount={product.cost} showDecimals /></div>
                  </div>
                )}
              </div>

              {/* {product.compareAtPrice && product.fixedPrice && (
                <div className="grid gap-2">
                  <div className="text-sm font-medium text-muted-foreground">Savings</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(product.compareAtPrice - (product.fixedPrice))}
                    <span className="text-sm font-normal ml-2">
                      (
                      {Math.round(
                        ((product.compareAtPrice - (product.fixedPrice )) / product.compareAtPrice) *
                          100,
                      )}
                      % off)
                    </span>
                  </div>
                </div>
              )} */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Flags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {product.isFeatured && <Badge variant="secondary">Featured</Badge>}
                {product.isTrending && <Badge variant="secondary">Trending</Badge>}
                {product.isDealOfTheDay && <Badge variant="secondary">Deal of the Day</Badge>}
                {product.isNewArrival && <Badge variant="secondary">New Arrival</Badge>}
                {!product.isFeatured && !product.isTrending && !product.isDealOfTheDay && !product.isNewArrival && (
                  <div className="text-muted-foreground">No special flags set</div>
                )}
              </div>
            </CardContent>
          </Card>

          {(product.weight || product.dimensions) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* {product.tags && (
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {product.tags.split(",").map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )} */}

                <div className="grid grid-cols-2 gap-4">
                  {product.weight && (
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Weight</div>
                      <div className="text-base">{product.weight}g</div>
                    </div>
                  )}

                  {product.dimensions && (
                    <div className="grid gap-2">
                      <div className="text-sm font-medium text-muted-foreground">Dimensions</div>
                      <div className="text-base">{product.dimensions} cm</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="media" className="space-y-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                        <Badge className="absolute top-2 left-2" variant="secondary">
                          Primary
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                  <div className="text-muted-foreground">No images uploaded</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
