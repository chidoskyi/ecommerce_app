"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"

interface Product {
  name: string
  price: number
  category: string
  quantity: number
  amount: number
}

interface ProductsTableProps {
  products: Product[]
  onProductView?: (productName: string) => void
}

export function RecentProductsTable({ products }: ProductsTableProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap">
        <h3 className="text-base font-medium">Top Selling Products</h3>
        <div className="flex items-center gap-2 mt-1 sm:mt-0 p-4">
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="h-3.5 w-3.5 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            See All
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-300 bg-gray-50">
              {/* <TableHead className="w-[30px] font-semibold">
                <Checkbox />
              </TableHead> */}
              <TableHead className="font-bold" colSpan={2}>ORDER ID</TableHead>
              {/* <TableHead>PRICE</TableHead> */}
              <TableHead className="font-bold">USERS</TableHead>
              <TableHead className="hidden sm:table-cell font-bold">TOTAL PRICE</TableHead>
              <TableHead className="hidden md:table-cell font-bold">STATUS</TableHead>
              {/* <TableHead className="w-[50px]">Action</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={index} className="border-gray-300">
                {/* <TableCell>
                  <Checkbox />
                </TableCell> */}
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gray-100 rounded mr-2"></div>
                    {product.name}
                  </div>
                </TableCell>
                <TableCell></TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell className="hidden sm:table-cell">{product.quantity}</TableCell>
                <TableCell className="hidden md:table-cell">${product.amount.toFixed(2)}</TableCell>
                {/* <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onProductView && onProductView(product.name)}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </TableCell> */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

