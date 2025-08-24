
import { OrdersList } from "@/components/dashboard/orders/OrdersList"

export default function OrdersPage() {
  return (
    <div className="container mx-auto py-6">
      <OrdersList />
    </div>
  )
}

// "use client"

// import { useState, useEffect } from "react"
// import {
//   Search,
//   MoreHorizontal,
//   Eye,
//   Download,
//   Calendar,
//   ArrowUpDown,
//   ChevronDown,
//   CheckCircle2,
//   Clock,
//   Truck,
//   Package,
//   XCircle,
// } from "lucide-react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
// import { Badge } from "@/components/ui/badge"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Checkbox } from "@/components/ui/checkbox"
// import { toast } from "react-toastify"
// import { format } from "date-fns"
// import { Calendar as CalendarComponent } from "@/components/ui/calendar"
// import { ordersData } from "@/data/orders"  

// export default function OrderListPage() {
//   const [orders, setOrders] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [searchQuery, setSearchQuery] = useState("")
//   const [statusFilter, setStatusFilter] = useState("all")
//   const [dateRange, setDateRange] = useState({ from: null, to: null })
//   const [isCalendarOpen, setIsCalendarOpen] = useState(false)
//   const [selectedOrder, setSelectedOrder] = useState(null)
//   const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false)
//   const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" })
//   const [selectedOrders, setSelectedOrders] = useState([])


//   // Fetch orders on component mount
//   useEffect(() => {
//     fetchOrders()
//   }, [])

//   const fetchOrders = async () => {
//     setLoading(true)
//     try {
//       // In a real app, you would fetch from your API
//       // const response = await api.getOrders()
//       // setOrders(response.data)

//       // Mock data for demonstration
//       setOrders(ordersData)
//     } catch (error) {
//       console.error("Error fetching orders:", error)
//       toast.error("Failed to load orders")
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleStatusChange = async (orderId, newStatus) => {
//     try {
//       // In a real app, you would call your API
//       // await api.updateOrderStatus(orderId, newStatus)

//       // Mock updating order status
//       const updatedOrders = orders.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))

//       setOrders(updatedOrders)
//       toast.success(`Order status updated to ${newStatus}`)
//     } catch (error) {
//       console.error("Error updating order status:", error)
//       toast.error("Failed to update order status")
//     }
//   }

//   const handleBulkStatusChange = async (newStatus) => {
//     if (selectedOrders.length === 0) {
//       toast.warning("No orders selected")
//       return
//     }

//     try {
//       // In a real app, you would call your API
//       // await Promise.all(selectedOrders.map(id => api.updateOrderStatus(id, newStatus)))

//       // Mock updating order status
//       const updatedOrders = orders.map((order) =>
//         selectedOrders.includes(order.id) ? { ...order, status: newStatus } : order,
//       )

//       setOrders(updatedOrders)
//       toast.success(`${selectedOrders.length} orders updated to ${newStatus}`)
//       setSelectedOrders([])
//     } catch (error) {
//       console.error("Error updating order status:", error)
//       toast.error("Failed to update order status")
//     }
//   }

//   const handleSort = (key) => {
//     let direction = "asc"
//     if (sortConfig.key === key && sortConfig.direction === "asc") {
//       direction = "desc"
//     }
//     setSortConfig({ key, direction })
//   }

//   const handleSelectAllOrders = (e) => {
//     if (e.target.checked) {
//       setSelectedOrders(filteredOrders.map((order) => order.id))
//     } else {
//       setSelectedOrders([])
//     }
//   }

//   const handleSelectOrder = (orderId) => {
//     if (selectedOrders.includes(orderId)) {
//       setSelectedOrders(selectedOrders.filter((id) => id !== orderId))
//     } else {
//       setSelectedOrders([...selectedOrders, orderId])
//     }
//   }

//   // Filter orders based on search query, status, and date range
//   const filteredOrders = orders.filter((order) => {
//     // Search filter
//     const searchMatch =
//       order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       order.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       order.customer.email.toLowerCase().includes(searchQuery.toLowerCase())

//     // Status filter
//     const statusMatch = statusFilter === "all" || order.status === statusFilter

//     // Date range filter
//     let dateMatch = true
//     if (dateRange.from && dateRange.to) {
//       const orderDate = new Date(order.date)
//       dateMatch = orderDate >= dateRange.from && orderDate <= dateRange.to
//     }

//     return searchMatch && statusMatch && dateMatch
//   })

//   // Sort orders
//   const sortedOrders = [...filteredOrders].sort((a, b) => {
//     if (sortConfig.key === "date") {
//       return sortConfig.direction === "asc" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
//     }

//     if (sortConfig.key === "total") {
//       return sortConfig.direction === "asc" ? a.total - b.total : b.total - a.total
//     }

//     if (sortConfig.key === "customer") {
//       return sortConfig.direction === "asc"
//         ? a.customer.name.localeCompare(b.customer.name)
//         : b.customer.name.localeCompare(a.customer.name)
//     }

//     return 0
//   })

//   const getStatusBadgeColor = (status) => {
//     switch (status) {
//       case "completed":
//         return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
//       case "processing":
//         return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
//       case "shipped":
//         return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
//       case "pending":
//         return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
//       case "cancelled":
//         return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
//       default:
//         return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
//     }
//   }

//   const getStatusIcon = (status) => {
//     switch (status) {
//       case "completed":
//         return <CheckCircle2 className="h-4 w-4" />
//       case "processing":
//         return <Clock className="h-4 w-4" />
//       case "shipped":
//         return <Truck className="h-4 w-4" />
//       case "pending":
//         return <Package className="h-4 w-4" />
//       case "cancelled":
//         return <XCircle className="h-4 w-4" />
//       default:
//         return null
//     }
//   }

//   const formatDate = (dateString) => {
//     const date = new Date(dateString)
//     return new Intl.DateTimeFormat("en-US", {
//       year: "numeric",
//       month: "short",
//       day: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     }).format(date)
//   }

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat("en-US", {
//       style: "currency",
//       currency: "USD",
//     }).format(amount)
//   }

//   return (
//     <div className="p-6">
//       <div className="flex flex-col space-y-6">
//         <div className="flex flex-col space-y-2">
//           <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
//           <p className="text-muted-foreground">View and manage customer orders</p>
//         </div>

//         <div className="flex flex-col space-y-4">
//           <Card>
//             <CardHeader className="pb-3">
//               <div className="flex items-center justify-between">
//                 <CardTitle>Orders</CardTitle>
//                 <div className="flex items-center gap-2">
//                   {selectedOrders.length > 0 && (
//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button variant="outline">
//                           Bulk Actions
//                           <ChevronDown className="ml-2 h-4 w-4" />
//                         </Button>
//                       </DropdownMenuTrigger>
//                       <DropdownMenuContent>
//                         <DropdownMenuLabel>Change Status</DropdownMenuLabel>
//                         <DropdownMenuItem onClick={() => handleBulkStatusChange("processing")}>
//                           <Clock className="mr-2 h-4 w-4" />
//                           Mark as Processing
//                         </DropdownMenuItem>
//                         <DropdownMenuItem onClick={() => handleBulkStatusChange("shipped")}>
//                           <Truck className="mr-2 h-4 w-4" />
//                           Mark as Shipped
//                         </DropdownMenuItem>
//                         <DropdownMenuItem onClick={() => handleBulkStatusChange("completed")}>
//                           <CheckCircle2 className="mr-2 h-4 w-4" />
//                           Mark as Completed
//                         </DropdownMenuItem>
//                         <DropdownMenuSeparator />
//                         <DropdownMenuItem onClick={() => handleBulkStatusChange("cancelled")}>
//                           <XCircle className="mr-2 h-4 w-4" />
//                           Mark as Cancelled
//                         </DropdownMenuItem>
//                       </DropdownMenuContent>
//                     </DropdownMenu>
//                   )}
//                   <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
//                     <PopoverTrigger asChild>
//                       <Button variant="outline" className="gap-1">
//                         <Calendar className="h-4 w-4" />
//                         {dateRange.from && dateRange.to ? (
//                           <span>
//                             {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
//                           </span>
//                         ) : (
//                           <span>Date Range</span>
//                         )}
//                       </Button>
//                     </PopoverTrigger>
//                     <PopoverContent className="w-auto p-0" align="end">
//                       <CalendarComponent
//                         initialFocus
//                         mode="range"
//                         defaultMonth={dateRange.from}
//                         selected={{ from: dateRange.from, to: dateRange.to }}
//                         onSelect={(range) => {
//                           setDateRange(range)
//                           if (range.to) {
//                             setIsCalendarOpen(false)
//                           }
//                         }}
//                         numberOfMonths={2}
//                       />
//                       {dateRange.from && dateRange.to && (
//                         <div className="flex items-center justify-end gap-2 p-3 border-t">
//                           <Button
//                             variant="outline"
//                             size="sm"
//                             onClick={() => {
//                               setDateRange({ from: null, to: null })
//                               setIsCalendarOpen(false)
//                             }}
//                           >
//                             Clear
//                           </Button>
//                           <Button size="sm" onClick={() => setIsCalendarOpen(false)}>
//                             Apply
//                           </Button>
//                         </div>
//                       )}
//                     </PopoverContent>
//                   </Popover>
//                   <Select value={statusFilter} onValueChange={setStatusFilter}>
//                     <SelectTrigger className="w-[180px]">
//                       <SelectValue placeholder="Filter by status" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All Statuses</SelectItem>
//                       <SelectItem value="pending">Pending</SelectItem>
//                       <SelectItem value="processing">Processing</SelectItem>
//                       <SelectItem value="shipped">Shipped</SelectItem>
//                       <SelectItem value="completed">Completed</SelectItem>
//                       <SelectItem value="cancelled">Cancelled</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </div>
//               <CardDescription>View and manage all customer orders</CardDescription>
//               <div className="pt-4">
//                 <div className="relative">
//                   <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
//                   <Input
//                     type="search"
//                     placeholder="Search orders by ID, customer name, or email..."
//                     className="pl-8"
//                     value={searchQuery}
//                     onChange={(e) => setSearchQuery(e.target.value)}
//                   />
//                 </div>
//               </div>
//             </CardHeader>
//             <CardContent>
//               <div className="rounded-md border">
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead className="w-[40px]">
//                         <Checkbox
//                           checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
//                           onCheckedChange={handleSelectAllOrders}
//                         />
//                       </TableHead>
//                       <TableHead>Order ID</TableHead>
//                       <TableHead className="cursor-pointer" onClick={() => handleSort("customer")}>
//                         <div className="flex items-center gap-1">
//                           Customer
//                           <ArrowUpDown className="h-4 w-4" />
//                         </div>
//                       </TableHead>
//                       <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
//                         <div className="flex items-center gap-1">
//                           Date
//                           <ArrowUpDown className="h-4 w-4" />
//                         </div>
//                       </TableHead>
//                       <TableHead>Status</TableHead>
//                       <TableHead className="cursor-pointer" onClick={() => handleSort("total")}>
//                         <div className="flex items-center gap-1">
//                           Total
//                           <ArrowUpDown className="h-4 w-4" />
//                         </div>
//                       </TableHead>
//                       <TableHead className="text-right">Actions</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {loading ? (
//                       <TableRow>
//                         <TableCell colSpan={7} className="text-center py-10">
//                           <div className="flex justify-center">
//                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
//                           </div>
//                         </TableCell>
//                       </TableRow>
//                     ) : sortedOrders.length === 0 ? (
//                       <TableRow>
//                         <TableCell colSpan={7} className="text-center py-10">
//                           No orders found
//                         </TableCell>
//                       </TableRow>
//                     ) : (
//                       sortedOrders.map((order) => (
//                         <TableRow key={order.id}>
//                           <TableCell>
//                             <Checkbox
//                               checked={selectedOrders.includes(order.id)}
//                               onCheckedChange={() => handleSelectOrder(order.id)}
//                             />
//                           </TableCell>
//                           <TableCell className="font-medium">{order.id}</TableCell>
//                           <TableCell>
//                             <div>
//                               <div className="font-medium">{order.customer.name}</div>
//                               <div className="text-sm text-muted-foreground">{order.customer.email}</div>
//                             </div>
//                           </TableCell>
//                           <TableCell>{formatDate(order.date)}</TableCell>
//                           <TableCell>
//                             <div className="flex items-center gap-2">
//                               <Badge className={getStatusBadgeColor(order.status)} variant="outline">
//                                 <div className="flex items-center gap-1">
//                                   {getStatusIcon(order.status)}
//                                   <span className="capitalize">{order.status}</span>
//                                 </div>
//                               </Badge>
//                             </div>
//                           </TableCell>
//                           <TableCell>{formatCurrency(order.total)}</TableCell>
//                           <TableCell className="text-right">
//                             <DropdownMenu>
//                               <DropdownMenuTrigger asChild>
//                                 <Button variant="ghost" size="icon">
//                                   <MoreHorizontal className="h-4 w-4" />
//                                   <span className="sr-only">Open menu</span>
//                                 </Button>
//                               </DropdownMenuTrigger>
//                               <DropdownMenuContent align="end">
//                                 <DropdownMenuLabel>Actions</DropdownMenuLabel>
//                                 <DropdownMenuItem
//                                   onClick={() => {
//                                     setSelectedOrder(order)
//                                     setIsOrderDetailsOpen(true)
//                                   }}
//                                 >
//                                   <Eye className="mr-2 h-4 w-4" />
//                                   View Details
//                                 </DropdownMenuItem>
//                                 <DropdownMenuSeparator />
//                                 <DropdownMenuLabel>Change Status</DropdownMenuLabel>
//                                 <DropdownMenuItem
//                                   onClick={() => handleStatusChange(order.id, "pending")}
//                                   disabled={order.status === "pending"}
//                                 >
//                                   <Package className="mr-2 h-4 w-4" />
//                                   Mark as Pending
//                                 </DropdownMenuItem>
//                                 <DropdownMenuItem
//                                   onClick={() => handleStatusChange(order.id, "processing")}
//                                   disabled={order.status === "processing"}
//                                 >
//                                   <Clock className="mr-2 h-4 w-4" />
//                                   Mark as Processing
//                                 </DropdownMenuItem>
//                                 <DropdownMenuItem
//                                   onClick={() => handleStatusChange(order.id, "shipped")}
//                                   disabled={order.status === "shipped"}
//                                 >
//                                   <Truck className="mr-2 h-4 w-4" />
//                                   Mark as Shipped
//                                 </DropdownMenuItem>
//                                 <DropdownMenuItem
//                                   onClick={() => handleStatusChange(order.id, "completed")}
//                                   disabled={order.status === "completed"}
//                                 >
//                                   <CheckCircle2 className="mr-2 h-4 w-4" />
//                                   Mark as Completed
//                                 </DropdownMenuItem>
//                                 <DropdownMenuItem
//                                   onClick={() => handleStatusChange(order.id, "cancelled")}
//                                   disabled={order.status === "cancelled"}
//                                 >
//                                   <XCircle className="mr-2 h-4 w-4" />
//                                   Mark as Cancelled
//                                 </DropdownMenuItem>
//                                 <DropdownMenuSeparator />
//                                 <DropdownMenuItem>
//                                   <Download className="mr-2 h-4 w-4" />
//                                   Download Invoice
//                                 </DropdownMenuItem>
//                               </DropdownMenuContent>
//                             </DropdownMenu>
//                           </TableCell>
//                         </TableRow>
//                       ))
//                     )}
//                   </TableBody>
//                 </Table>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       </div>

//       {/* Order Details Dialog */}
//       <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
//         <DialogContent className="max-w-3xl">
//           <DialogHeader>
//             <DialogTitle>Order Details</DialogTitle>
//             <DialogDescription>View complete order information</DialogDescription>
//           </DialogHeader>
//           {selectedOrder && (
//             <div className="grid gap-6">
//               <div className="flex justify-between items-start">
//                 <div>
//                   <h3 className="text-lg font-semibold">{selectedOrder.id}</h3>
//                   <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.date)}</p>
//                 </div>
//                 <Badge className={getStatusBadgeColor(selectedOrder.status)} variant="outline">
//                   <div className="flex items-center gap-1">
//                     {getStatusIcon(selectedOrder.status)}
//                     <span className="capitalize">{selectedOrder.status}</span>
//                   </div>
//                 </Badge>
//               </div>

//               <div className="grid md:grid-cols-2 gap-6">
//                 <div>
//                   <h4 className="text-sm font-semibold mb-2">Customer Information</h4>
//                   <div className="text-sm">
//                     <p className="font-medium">{selectedOrder.customer.name}</p>
//                     <p>{selectedOrder.customer.email}</p>
//                     <p>Customer ID: {selectedOrder.customer.id}</p>
//                   </div>
//                 </div>
//                 <div>
//                   <h4 className="text-sm font-semibold mb-2">Shipping Information</h4>
//                   <div className="text-sm">
//                     <p>{selectedOrder.shipping.address}</p>
//                     <p>Method: {selectedOrder.shipping.method}</p>
//                     <p>Cost: {formatCurrency(selectedOrder.shipping.cost)}</p>
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 <h4 className="text-sm font-semibold mb-2">Order Items</h4>
//                 <div className="rounded-md border">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Product</TableHead>
//                         <TableHead className="text-right">Price</TableHead>
//                         <TableHead className="text-right">Quantity</TableHead>
//                         <TableHead className="text-right">Total</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {selectedOrder.items.map((item) => (
//                         <TableRow key={item.id}>
//                           <TableCell>{item.name}</TableCell>
//                           <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
//                           <TableCell className="text-right">{item.quantity}</TableCell>
//                           <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>

//               <div className="flex justify-between items-start">
//                 <div>
//                   <h4 className="text-sm font-semibold mb-2">Payment Information</h4>
//                   <div className="text-sm">
//                     <p>Method: {selectedOrder.payment.method}</p>
//                     {selectedOrder.payment.cardLast4 && <p>Card: **** **** **** {selectedOrder.payment.cardLast4}</p>}
//                     {selectedOrder.payment.email && <p>PayPal: {selectedOrder.payment.email}</p>}
//                     <p>
//                       Status: <span className="capitalize">{selectedOrder.payment.status}</span>
//                     </p>
//                   </div>
//                 </div>
//                 <div className="text-right">
//                   <div className="text-sm">
//                     <div className="flex justify-between gap-8 mb-1">
//                       <span>Subtotal:</span>
//                       <span>{formatCurrency(selectedOrder.total - selectedOrder.shipping.cost)}</span>
//                     </div>
//                     <div className="flex justify-between gap-8 mb-1">
//                       <span>Shipping:</span>
//                       <span>{formatCurrency(selectedOrder.shipping.cost)}</span>
//                     </div>
//                     <div className="flex justify-between gap-8 font-semibold text-base pt-2 border-t">
//                       <span>Total:</span>
//                       <span>{formatCurrency(selectedOrder.total)}</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex justify-between items-center pt-4 border-t">
//                 <Select
//                   value={selectedOrder.status}
//                   onValueChange={(value) => {
//                     setSelectedOrder({ ...selectedOrder, status: value })
//                     handleStatusChange(selectedOrder.id, value)
//                   }}
//                 >
//                   <SelectTrigger className="w-[200px]">
//                     <SelectValue placeholder="Change status" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="pending">Pending</SelectItem>
//                     <SelectItem value="processing">Processing</SelectItem>
//                     <SelectItem value="shipped">Shipped</SelectItem>
//                     <SelectItem value="completed">Completed</SelectItem>
//                     <SelectItem value="cancelled">Cancelled</SelectItem>
//                   </SelectContent>
//                 </Select>
//                 <Button variant="outline" onClick={() => setIsOrderDetailsOpen(false)}>
//                   Close
//                 </Button>
//               </div>
//             </div>
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   )
// }
