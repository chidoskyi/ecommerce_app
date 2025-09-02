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

export interface ProductActionsProps {
  selectedProducts: string[]
  onBulkAction: (action: string) => void
  disabled?: boolean;
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
            <DropdownMenuItem onClick={() => onBulkAction("inactive")}>
              <Edit className="mr-2 h-4 w-4" />
              Mark as Inactive
            </DropdownMenuItem>
            {/* <DropdownMenuItem onClick={() => onBulkAction("out_of_stock")}>
              <X className="mr-2 h-4 w-4" />
              Mark as Out of Stock
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => onBulkAction("delete")}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Link href="/admin/add-products">
        <Button className="cursor-pointer flex items-center gap-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </Button>
      </Link>
    </div>
  )
}
