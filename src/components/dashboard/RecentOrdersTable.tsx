"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"
import { OrdersTableProps } from "@/types/orders"
import { PriceFormatter } from "../reuse/FormatCurrency"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export function RecentProductsTable({ orders }: OrdersTableProps) {
  // Function to get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'UNPAID':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap">
        <h3 className="text-base font-medium">Top Selling Products</h3>
        <div className="flex items-center gap-2 mt-1 sm:mt-0 p-4">
          {/* <Button variant="outline" size="sm" className="h-8">
            <Filter className="h-3.5 w-3.5 mr-2" />
            Filter
          </Button> */}
          <Link href="/admin/orders">
          <Button variant="outline" size="sm" className="h-8 cursor-pointer">
            See All
          </Button>
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-300 bg-gray-50">
              <TableHead className="font-bold">ORDER ID</TableHead>
              <TableHead className="font-bold">CUSTOMER</TableHead>
              <TableHead className="font-bold">TOTAL PRICE</TableHead>
              <TableHead className="font-bold">STATUS</TableHead>
              <TableHead className="font-bold">PAYMENT</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="border-gray-300">
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {/* <div className="w-6 h-6 bg-gray-100 rounded mr-2">
                      <Image
                      src={order.items?.product.images[0]}
                      width={50 }
                        height={50}
                        alt={order.product.name}
                      />
                    </div> */}
                    {order.orderNumber || `ORDER-${order.id.slice(-8).toUpperCase()}`}
                  </div>
                </TableCell>
                <TableCell>
                  {order.user?.firstName && order.user?.lastName 
                    ? `${order.user.firstName} ${order.user.lastName}`
                    : order.customerName || 'Guest Customer'
                  }
                </TableCell>
                <TableCell>
                  <PriceFormatter 
                    amount={order.totalPrice || order.subtotalPrice} 
                    showDecimals 
                  />
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(order.status)} variant="secondary">
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(order.paymentStatus)} variant="secondary">
                    {order.paymentStatus}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}