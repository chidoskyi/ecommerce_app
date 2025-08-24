"use client"

import { MoreHorizontal, ArrowUpDown, Eye, Edit, Copy, Check, X, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import Link from "next/link"
import { Category, Filters, Product } from "@/lib/types"
import { PriceFormatter } from "@/components/reuse/FormatCurrency"
import { getStatusBadgeColor, getStockStatus } from "./ProductBadge"

interface ProductTableProps {
  products: Product[]
  categories: Category[]
  loading: boolean
  selectedProducts: number[]
  sortConfig: { key: string; direction: string }
  currentPage: number
  totalPages: number
  searchQuery: string
  filters: Filters
  onSort: (key: string) => void
  onSelectAll: (checked: boolean, products: Product[]) => void
  onSelectProduct: (id: number) => void
  onEdit: (product: Product) => void
  onView: (product: Product) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: string) => void
  onPaginate: (page: number) => void
  onResetFilters: () => void
}

export function ProductTable({
  products,
  categories,
  loading,
  selectedProducts,
  sortConfig,
  currentPage,
  totalPages,
  searchQuery,
  filters,
  onSort,
  onSelectAll,
  onSelectProduct,
  onEdit,
  onView,
  onDelete,
  onStatusChange,
  // onDuplicate,
  onPaginate,
  onResetFilters,
}: ProductTableProps) {


  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "-"
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Get category name by ID
  const getCategoryName = (categoryId: number | string) => {
    const category = categories.find((cat) => cat.id === categoryId)
    return category ? category.name : "Uncategorized"
  }

  return (
    <>
      <div className="rounded-md border border-gray-400">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={products.length > 0 && selectedProducts.length === products.length}
                  onCheckedChange={(checked) => onSelectAll(Boolean(checked), products)}
                />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort("name")}>
                <div className="flex items-center gap-1">
                  Product
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort("price")}>
                <div className="flex items-center gap-1">
                  Price
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort("quantity")}>
                <div className="flex items-center gap-1">
                  Stock
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="cursor-pointer" onClick={() => onSort("updatedAt")}>
                <div className="flex items-center gap-1">
                  Updated
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10">
                  {searchQuery ||
                  Object.values(filters).some((val) => {
                    if (val === "all" || val == null) return false;
                    if (typeof val === "object" && val !== null) {
                      // Check for min/max only if they exist and are not null/undefined
                      const min = (val as { min?: number | null }).min;
                      const max = (val as { max?: number | null }).max;
                      return (min != null) || (max != null);
                    }
                    return true;
                  }) ? (
                    <div>
                      <p>No products found matching your criteria</p>
                      <Button variant="link" onClick={onResetFilters}>
                        Reset filters
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <p>No products found</p>
                      <Link href="/admin/add-products">
                      <Button variant="link"  className="mt-2">
                        Add your first product
                      </Button>
                      </Link>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const stockStatus = getStockStatus(product.quantity)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => onSelectProduct(product.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-sm">
                          <AvatarImage
                            src={product.images[0] || "/placeholder.svg?height=36&width=36"}
                            alt={product.name}
                          />
                          <AvatarFallback className="rounded-sm">
                            {product.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.isFeatured || product.isTrending || product.isDealOfTheDay || product.isNewArrival  && (
                            <Badge variant="outline" className="mt-1">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.sku}</TableCell>
                    
                    <TableCell>
                      {product.priceType === "fixed"
                        ? <PriceFormatter amount={product.fixedPrice  } showDecimals={true} />
                        : product.unitPrices && product.unitPrices.length > 0
                          ? product.unitPrices.map((unitPrice, idx) => (
                              <span key={unitPrice.unit}>
                                {unitPrice.unit}: <PriceFormatter amount={unitPrice.price} showDecimals={true} />
                                {idx < product.unitPrices.length - 1 ? ", " : ""}
                              </span>
                            ))
                          : "-"}
                    </TableCell>
                    <TableCell>{getCategoryName(product.categoryId ?? "")}</TableCell>
                    <TableCell>
                      <Badge className={stockStatus.color} variant="outline">
                        {product.quantity} in stock
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(product.status)} variant="outline">
                        {product.status === "active" ? "Active" : product.status === "draft" ? "Draft" : "Out of Stock"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(product.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="cursor-pointer">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => onView(product)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer" onClick={() => onEdit(product)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {/* <DropdownMenuItem onClick={() => onDuplicate(product)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem> */}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() => onStatusChange(product.id, "active")}
                            disabled={product.status === "active"}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Mark as Active
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() => onStatusChange(product.id, "draft")}
                            disabled={product.status === "draft"}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Mark as Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer"
                            onClick={() => onStatusChange(product.id, "out_of_stock")}
                            disabled={product.status === "out_of_stock"}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Mark as Out of Stock
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => onDelete(product.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPaginate(Math.max(1, currentPage - 1))}
                  aria-disabled={currentPage === totalPages}
                  tabIndex={currentPage === totalPages ? -1 : 0}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink isActive={page === currentPage} onClick={() => onPaginate(page)}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                }
                if ((page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2)) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                }
                return null
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => {
                    if (currentPage !== totalPages) {
                      onPaginate(Math.min(totalPages, currentPage + 1))
                    }
                  }}
                  aria-disabled={currentPage === totalPages}
                  tabIndex={currentPage === totalPages ? +1 : 0}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  )
}
