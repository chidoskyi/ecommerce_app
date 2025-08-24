"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Download, Package } from "lucide-react"

export default function OrdersPage() {
  // Mock orders data - replace with real data fetching
const orders = [
    {
      id: "ORD-5723",
      date: "Feb 23, 2025",
      total: "$129.99",
      status: "Delivered",
      items: [
        { name: "Wireless Earbuds", quantity: 1, price: "$89.99", image: "/images/wireless-earbuds.jpg" },
        { name: "Phone Case", quantity: 1, price: "$39.99", image: "/images/phone-case.jpg" },
      ],
    },
    {
      id: "ORD-5621",
      date: "Jan 15, 2025",
      total: "$249.99",
      status: "Processing",
      items: [{ name: "Smart Watch", quantity: 1, price: "$249.99", image: "/images/smart-watch.jpg" }],
    },
    {
      id: "ORD-5489",
      date: "Dec 10, 2024",
      total: "$1,299.99",
      status: "Delivered",
      items: [{ name: "Laptop", quantity: 1, price: "$1,299.99", image: "/images/laptop.jpg" }],
    },
  ]

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <CardTitle className="flex item-center justify-start gap-2 mb-5"><Package /><h1>Order History</h1></CardTitle>
        <CardDescription>View and manage your orders</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="border rounded-lg overflow-hidden">
              <div className="bg-muted p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">Order #{order.id}</h3>
                    <Badge
                      variant={
                        order.status === "Delivered"
                          ? "default"
                          : order.status === "Processing"
                            ? "secondary"
                            : "default"
                      }
                      className={
                        order.status === "Delivered"
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : order.status === "Processing"
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            : ""
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Placed on {order.date}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Invoice
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded bg-muted flex items-center justify-center overflow-hidden">
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between">
                  <p className="font-medium">Total</p>
                  <p className="font-bold">{order.total}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )}
