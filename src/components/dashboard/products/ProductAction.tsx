"use client"

import { Plus, ChevronDown, Check, Edit, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface ProductActionsProps {
  selectedProducts: number[]
  onBulkAction: (action: string) => void
}

export function ProductActions({ selectedProducts, onBulkAction }: ProductActionsProps) {
  return (
    <div className="flex items-center gap-2 bg-white">
      {selectedProducts.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Bulk Actions ({selectedProducts.length})
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white">
            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onBulkAction("active")}>
              <Check className="mr-2 h-4 w-4" />
              Mark as Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBulkAction("draft")}>
              <Edit className="mr-2 h-4 w-4" />
              Mark as Draft
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBulkAction("out_of_stock")}>
              <X className="mr-2 h-4 w-4" />
              Mark as Out of Stock
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => onBulkAction("delete")}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Link href="/admin/add-products">
        <Button className="cursor-pointer flex items-center gap-1">
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </Button>
      </Link>
    </div>
  )
}
