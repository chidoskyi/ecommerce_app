// components/OrderDetailsDialog.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderDetailsDialogProps, OrderStatus } from '@/lib/types';


export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (order) {
      onStatusChange(order.id, newStatus);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-200">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>View complete order information</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6">
          {/* Order Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{order.id}</h3>
              <p className="text-sm text-muted-foreground">{formatDate(order.date)}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          {/* Customer and Shipping Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-2">Customer Information</h4>
              <div className="text-sm">
                <p className="font-medium">{order.customer.name}</p>
                <p>{order.customer.email}</p>
                <p>Customer ID: {order.customer.id}</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Shipping Information</h4>
              <div className="text-sm">
                <p>{order.shipping.address}</p>
                <p>Method: {order.shipping.method}</p>
                <p>Cost: {formatCurrency(order.shipping.cost)}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Order Items</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payment Info and Order Total */}
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-semibold mb-2">Payment Information</h4>
              <div className="text-sm">
                <p>Method: {order.payment.method}</p>
                {order.payment.cardLast4 && (
                  <p>Card: **** **** **** {order.payment.cardLast4}</p>
                )}
                {order.payment.email && <p>PayPal: {order.payment.email}</p>}
                <p>
                  Status: <span className="capitalize">{order.payment.status}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">
                <div className="flex justify-between gap-8 mb-1">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.total - order.shipping.cost)}</span>
                </div>
                <div className="flex justify-between gap-8 mb-1">
                  <span>Shipping:</span>
                  <span>{formatCurrency(order.shipping.cost)}</span>
                </div>
                <div className="flex justify-between gap-8 font-semibold text-base pt-2 border-t">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Select value={order.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[200px] cursor-pointer focus:">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent className="bg-white cursor-pointer">
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="pending">Pending</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="processing">Processing</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="shipped">Shipped</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="completed">Completed</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button className='cursor-pointer text-red-500 hover:bg-red-100' variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};