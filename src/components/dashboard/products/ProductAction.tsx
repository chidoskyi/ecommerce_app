"use client"

import { Plus, ChevronDown, Check, Edit, Trash2 } from "lucide-react"
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white sm:p-0">
      {selectedProducts.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto justify-between sm:justify-center text-sm"
            >
              <span className="flex items-center gap-2">
                Bulk Actions
                <span className="hidden xs:inline">({selectedProducts.length})</span>
                <span className="inline xs:hidden">({selectedProducts.length})</span>
              </span>
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white w-56" align="start">
            <DropdownMenuLabel className="text-sm font-medium">Change Status</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => onBulkAction("active")}
              className="cursor-pointer"
            >
              <Check className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-sm">Mark as Active</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onBulkAction("inactive")}
              className="cursor-pointer"
            >
              <Edit className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-sm">Mark as Inactive</span>
            </DropdownMenuItem>
            {/* <DropdownMenuItem onClick={() => onBulkAction("out_of_stock")}>
              <X className="mr-2 h-4 w-4" />
              Mark as Out of Stock
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 hover:text-red-700 cursor-pointer" 
              onClick={() => onBulkAction("delete")}
            >
              <Trash2 className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="text-sm">Delete Selected</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Link href="/admin/add-products" className="w-full sm:w-auto p-0">
        <Button 
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 min-h-[40px] sm:min-h-[36px]"
        >
          <Plus className="h-4 w-4 flex-shrink-0" />
          <span className="whitespace-nowrap">Add Product</span>
        </Button>
      </Link>
    </div>
  )
}