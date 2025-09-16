"use client";

import {
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Edit,
  Check,
  X,
  Trash2,
  Loader2,
  ChevronDown,
  Package,
  Clock,
  DollarSign,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import Link from "next/link";
import { Product, ProductTableProps } from "@/types/products";
import { PriceFormatter } from "@/components/reuse/FormatCurrency";
import { getStatusBadgeColor } from "./ProductBadge";

export interface ExtendedProductTableProps
  extends Omit<ProductTableProps, "onDuplicate"> {
  bulkActionLoading?: boolean;
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
  onPaginate,
  onResetFilters,
  bulkActionLoading = false,
}: ExtendedProductTableProps) {
  // Format date
  const formatDate = (dateString: string | Date) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Mobile format date (shorter)
  const formatDateMobile = (dateString: string | Date | undefined | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

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

  // Get sort indicator
  const getSortIcon = (column: string) => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    return (
      <ArrowUpDown
        className={`h-4 w-4 ${
          sortConfig.direction === "asc" ? "rotate-180" : ""
        } transition-transform`}
      />
    );
  };

  // Check if filters are active
  const hasActiveFilters =
    searchQuery ||
    Object.values(filters).some((val) => {
      if (val === "all" || val == null || val === "") return false;
      if (typeof val === "object" && val !== null) {
        const min = (val as { min?: string | null }).min;
        const max = (val as { max?: string | null }).max;
        return (min && min !== "") || (max && max !== "");
      }
      return true;
    });

  // Handle pagination bounds
  const renderPaginationItems = () => {
    const items = [];
    const showEllipsis = totalPages > 5;

    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink
          isActive={currentPage === 1}
          onClick={() => !loading && onPaginate(1)}
          className={
            loading ? "pointer-events-none opacity-50" : "cursor-pointer"
          }
        >
          1
        </PaginationLink>
      </PaginationItem>
    );

    if (showEllipsis) {
      // Show ellipsis if current page is far from start
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="start-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let page = start; page <= end; page++) {
        if (page !== 1 && page !== totalPages) {
          items.push(
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                onClick={() => !loading && onPaginate(page)}
                className={
                  loading ? "pointer-events-none opacity-50" : "cursor-pointer"
                }
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        }
      }

      // Show ellipsis if current page is far from end
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="end-ellipsis">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    } else {
      // Show all pages if total is small
      for (let page = 2; page < totalPages; page++) {
        items.push(
          <PaginationItem key={page}>
            <PaginationLink
              isActive={page === currentPage}
              onClick={() => !loading && onPaginate(page)}
              className={
                loading ? "pointer-events-none opacity-50" : "cursor-pointer"
              }
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }

    // Always show last page if it's not the first page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            isActive={currentPage === totalPages}
            onClick={() => !loading && onPaginate(totalPages)}
            className={
              loading ? "pointer-events-none opacity-50" : "cursor-pointer"
            }
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  // Mobile Product Card Component
  const MobileProductCard = ({ product }: { product: Product }) => {
    const isSelected = selectedProducts.includes(product.id!);

    return (
      <div
        className={`bg-white border border-gray-300 rounded-lg p-4 mb-3 shadow-sm transition-colors ${
          isSelected ? "bg-blue-50 border-blue-200" : ""
        } ${bulkActionLoading && isSelected ? "opacity-60" : ""}`}
      >
        {/* Header with checkbox, image, name, and actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelectProduct(product.id!)}
              disabled={loading || bulkActionLoading}
              className="flex-shrink-0"
            />
            <Avatar className="h-10 w-10 rounded-sm flex-shrink-0">
              <AvatarImage
                src={
                  product.images?.[0] || "/placeholder.svg?height=40&width=40"
                }
                alt={product.name}
                className="object-cover"
              />
              <AvatarFallback className="rounded-sm bg-purple-100 text-purple-700 text-sm">
                {product.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div
                className="font-medium text-sm truncate"
                title={product.name}
              >
                {product.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {getCategoryName(product)}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer flex-shrink-0"
                disabled={bulkActionLoading}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onView(product)}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(product)}
                className="cursor-pointer"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => onStatusChange(product.id!, "ACTIVE")}
                disabled={product.status === "ACTIVE"}
                className="cursor-pointer"
              >
                <Check className="mr-2 h-4 w-4" />
                Mark as Active
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange(product.id!, "INACTIVE")}
                disabled={product.status === "INACTIVE"}
                className="cursor-pointer"
              >
                <X className="mr-2 h-4 w-4" />
                Mark as Inactive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => onDelete(product.id!)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        {(product.isFeatured ||
          product.isTrending ||
          product.isDealOfTheDay ||
          product.isNewArrival) && (
          <div className="flex flex-wrap gap-1 mb-3">
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
                Deal
              </Badge>
            )}
            {product.isNewArrival && (
              <Badge
                variant="secondary"
                className="text-xs bg-blue-100 text-blue-800"
              >
                New
              </Badge>
            )}
          </div>
        )}

        {/* Price and Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              {product.hasFixedPrice ? (
                <PriceFormatter
                  amount={product.fixedPrice}
                  showDecimals={true}
                />
              ) : product.unitPrices && product.unitPrices.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">
                      {product.unitPrices[0].unit}:
                    </span>{" "}
                    <PriceFormatter
                      amount={product.unitPrices[0].price}
                      showDecimals={true}
                    />
                  </div>
                  {product.unitPrices.length > 1 && (
                    <div className="text-xs text-gray-500">
                      +{product.unitPrices.length - 1} more prices
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-400">-</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge
              className={`${getStatusBadgeColor(product.status)} text-xs`}
              variant="outline"
            >
              {product.status === "ACTIVE"
                ? "Active"
                : product.status === "INACTIVE"
                ? "Inactive"
                : "Draft"}
            </Badge>
          </div>
        </div>

        {/* Footer with updated date */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-xs text-gray-500">
            Updated: {formatDateMobile(product.updatedAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block rounded-md border border-gray-400">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={
                    products.length > 0 &&
                    selectedProducts.length === products.length
                  }
                  indeterminate={
                    selectedProducts.length > 0 &&
                    selectedProducts.length < products.length
                  }
                  onCheckedChange={(checked) =>
                    onSelectAll(Boolean(checked), products)
                  }
                  disabled={loading || bulkActionLoading}
                />
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => !loading && onSort("name")}
              >
                <div className="flex items-center gap-1">
                  Product
                  {getSortIcon("name")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => !loading && onSort("fixedPrice")}
              >
                <div className="flex items-center gap-1">
                  Price
                  {getSortIcon("fixedPrice")}
                </div>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => !loading && onSort("status")}
              >
                <div className="flex items-center gap-1">
                  Status
                  {getSortIcon("status")}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => !loading && onSort("updatedAt")}
              >
                <div className="flex items-center gap-1">
                  Updated
                  {getSortIcon("updatedAt")}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                    <span className="text-gray-600">Loading products...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  {hasActiveFilters ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-600 font-medium">
                          No products found
                        </p>
                        <p className="text-sm text-gray-500">
                          No products match your current filters
                        </p>
                      </div>
                      <Button variant="outline" onClick={onResetFilters}>
                        Clear all filters
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-600 font-medium">
                          No products yet
                        </p>
                        <p className="text-sm text-gray-500">
                          Get started by adding your first product
                        </p>
                      </div>
                      <Link href="/admin/add-products">
                        <Button className="mt-2">Add Product</Button>
                      </Link>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const isSelected = selectedProducts.includes(product.id!);

                return (
                  <TableRow
                    key={product.id}
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${isSelected ? "bg-blue-50 border-blue-200" : ""}
                      ${bulkActionLoading && isSelected ? "opacity-60" : ""}
                    `}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onSelectProduct(product.id!)}
                        disabled={loading || bulkActionLoading}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-sm">
                          <AvatarImage
                            src={
                              product.images?.[0] ||
                              "/placeholder.svg?height=36&width=36"
                            }
                            alt={product.name}
                            className="object-cover"
                          />
                          <AvatarFallback className="rounded-sm bg-purple-100 text-purple-700">
                            {product.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-medium truncate"
                            title={product.name}
                          >
                            {product.name}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
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
                                Deal
                              </Badge>
                            )}
                            {product.isNewArrival && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-800"
                              >
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {product.hasFixedPrice ? (
                        <PriceFormatter
                          amount={product.fixedPrice}
                          showDecimals={true}
                        />
                      ) : product.unitPrices &&
                        product.unitPrices.length > 0 ? (
                        <div className="space-y-1">
                          {product.unitPrices.slice(0, 2).map((unitPrice) => (
                            <div key={unitPrice.unit} className="text-sm">
                              <span className="font-medium">
                                {unitPrice.unit}:
                              </span>{" "}
                              <PriceFormatter
                                amount={unitPrice.price}
                                showDecimals={true}
                              />
                            </div>
                          ))}
                          {product.unitPrices.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{product.unitPrices.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {getCategoryName(product)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${getStatusBadgeColor(
                          product.status
                        )} text-xs`}
                        variant="outline"
                      >
                        {product.status === "ACTIVE"
                          ? "Active"
                          : product.status === "INACTIVE"
                          ? "Inactive"
                          : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {product.updatedAt
                          ? formatDate(product.updatedAt)
                          : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            disabled={bulkActionLoading}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-white"
                        >
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onView(product)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onEdit(product)}
                            className="cursor-pointer"
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => onStatusChange(product.id!, "ACTIVE")}
                            disabled={product.status === "ACTIVE"}
                            className="cursor-pointer"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Mark as Active
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              onStatusChange(product.id!, "INACTIVE")
                            }
                            disabled={product.status === "INACTIVE"}
                            className="cursor-pointer"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Mark as Inactive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 cursor-pointer"
                            onClick={() => onDelete(product.id!)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View - Hidden on desktop */}
      <div className="md:hidden">
        {/* Mobile Header with Select All */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-t-lg border-gray-200 border-b-0">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={
                products.length > 0 &&
                selectedProducts.length === products.length
              }
              indeterminate={
                selectedProducts.length > 0 &&
                selectedProducts.length < products.length
              }
              onCheckedChange={(checked) =>
                onSelectAll(Boolean(checked), products)
              }
              disabled={loading || bulkActionLoading}
              className="cursor-pointer"
            />
            <span className="text-sm font-medium">
              {selectedProducts.length > 0
                ? `${selectedProducts.length} selected`
                : "Select all"}
            </span>
          </div>

          {/* Mobile Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Sort <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem
                onClick={() => onSort("name")}
                className="cursor-pointer"
              >
                <Package className="mr-2 h-4 w-4" />
                Sort by Name
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSort("fixedPrice")}
                className="cursor-pointer"
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Sort by Price
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSort("status")}
                className="cursor-pointer"
              >
                <Check className="mr-2 h-4 w-4" />
                Sort by Status
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSort("updatedAt")}
                className="cursor-pointer"
              >
                <Clock className="mr-2 h-4 w-4" />
                Sort by Updated
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Cards Container */}
        <div className="border-gray-200  border-t-0 rounded-b-lg p-2 bg-gray-50">
          {loading ? (
            <div className="text-center py-10">
              <div className="flex justify-center items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                <span className="text-gray-600">Loading products...</span>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              {hasActiveFilters ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-600 font-medium">
                      No products found
                    </p>
                    <p className="text-sm text-gray-500">
                      No products match your current filters
                    </p>
                  </div>
                  <Button variant="outline" onClick={onResetFilters}>
                    Clear all filters
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-600 font-medium">No products yet</p>
                    <p className="text-sm text-gray-500">
                      Get started by adding your first product
                    </p>
                  </div>
                  <Link href="/admin/add-products">
                    <Button className="mt-2">Add Product</Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => (
                <MobileProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pagination - Responsive */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="text-sm text-gray-700 text-center sm:text-left">
            Showing {(currentPage - 1) * 10 + 1} to{" "}
            {Math.min(currentPage * 10, products.length)} of {products.length}{" "}
            results
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPaginate(Math.max(1, currentPage - 1))}
                  aria-disabled={currentPage === 1 || loading}
                  className={`
                    ${
                      currentPage === 1 || loading
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  `}
                />
              </PaginationItem>
              {renderPaginationItems()}
              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPaginate(Math.min(totalPages, currentPage + 1))
                  }
                  aria-disabled={currentPage === totalPages || loading}
                  className={`
                    ${
                      currentPage === totalPages || loading
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  `}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Loading overlay for bulk actions */}
      {bulkActionLoading && selectedProducts.length > 0 && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <span className="text-sm md:text-base">
              Processing {selectedProducts.length} selected products...
            </span>
          </div>
        </div>
      )}
    </>
  );
}
