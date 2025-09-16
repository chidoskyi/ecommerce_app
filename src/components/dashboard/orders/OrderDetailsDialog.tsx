// components/OrderDetailsDialog.tsx - Fixed Version
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderStatus, Order } from '@/types/orders';
import { PriceFormatter } from '@/components/reuse/FormatCurrency';
import {
  selectCurrentOrder,
  selectActionLoading,
  // updateOrderStatus,
  clearCurrentOrder
} from '@/app/store/slices/adminOrderSlice';
import { Address } from '@/types';

interface OrderDetailsDialogProps {
  order?: Order | null; // Keep for backward compatibility
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (orderId: string, status: OrderStatus) => void; // Keep for backward compatibility
}

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order: propOrder,
  isOpen,
  onClose,
  onStatusChange,
}) => {
  const dispatch = useDispatch();
  const reduxOrder = useSelector(selectCurrentOrder);
  const actionLoading = useSelector(selectActionLoading);

  // Use prop order if provided, otherwise use Redux order
  const order = propOrder || reduxOrder;

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


  const handleStatusChange = (newStatus: OrderStatus) => {
    if (order) {
      if (onStatusChange) {
        // Use prop callback if provided
        onStatusChange(order.id, newStatus);
      }
    }
  };

  const handleClose = () => {
    dispatch(clearCurrentOrder());
    onClose();
  };

  // Helper function to format address object based on your Address interface
  const formatAddress = (address: Address): string => {
    if (!address) return 'Address not available';
    
    const parts = [];
    if (address.address) parts.push(address.address);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.country) parts.push(address.country);
    if (address.zip) parts.push(address.zip);
    
    return parts.join(', ');
  };

  // Helper function to format customer name based on your Order interface
  const formatCustomerName = (order: Order): string => {
    if (order.customerName) {
      return order.customerName;
    }
    
    if (order.shippingAddress?.firstName && order.shippingAddress?.lastName) {
      return `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`;
    }
    
    return 'Customer';
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>View complete order information</DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6">
          {/* Order Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
              <p className="text-sm text-muted-foreground">{formatDate(order.createdAt.toString())}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          {/* Customer and Shipping Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-2">Customer Information</h4>
              <div className="text-sm space-y-1">
                <p className="font-medium">{formatCustomerName(order)}</p>
                <p>{order.email}</p>
                <p>Customer ID: {order.userId || 'Guest'}</p>
                {order.phone && <p>Phone: {order.phone}</p>}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Shipping Information</h4>
              <div className="text-sm space-y-1">
                <p>{formatAddress(order.shippingAddress)}</p>
                <p>Total Shipping: <PriceFormatter amount={order.totalShipping} showDecimals/></p>
                {order.shippingAddress?.phone && <p>Phone: {order.shippingAddress.phone}</p>}
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
                  {order.items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.title}</TableCell>
                      <TableCell className="text-right"><PriceFormatter amount={item.price} showDecimals/></TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right"><PriceFormatter amount={(item.price ?? 0 )* item.quantity} showDecimals/></TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No items found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payment Info and Order Total */}
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-semibold mb-2">Payment Information</h4>
              <div className="text-sm space-y-1">
                <p>Method: {order.paymentMethod || 'Not specified'}</p>
                {order.paymentId && <p>Payment ID: {order.paymentId}</p>}
                {order.transactionId && <p>Transaction ID: {order.transactionId}</p>}
                <p>
                  Status: <span className="capitalize">{order.paymentStatus.toLowerCase()}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">
                <div className="flex justify-between gap-8 mb-1">
                  <span>Subtotal:</span>
                  <span><PriceFormatter amount={order.subtotalPrice} showDecimals/></span>
                </div>
                <div className="flex justify-between gap-8 mb-1">
                  <span>Shipping:</span>
                  <span><PriceFormatter amount={order.totalShipping} showDecimals/></span>
                </div>
                <div className="flex justify-between gap-8 mb-1">
                  <span>Tax:</span>
                  <span><PriceFormatter amount={order.totalTax} showDecimals/></span>
                </div>
                {order.totalDiscount > 0 && (
                  <div className="flex justify-between gap-8 mb-1 text-green-600">
                    <span>Discount:</span>
                    <span>-<PriceFormatter amount={order.totalDiscount} showDecimals/></span>
                  </div>
                )}
                <div className="flex justify-between gap-8 font-semibold text-base pt-2 border-t">
                  <span>Total:</span>
                  <span><PriceFormatter amount={order.totalPrice} showDecimals/></span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Select 
              value={order.status} 
              onValueChange={handleStatusChange}
              disabled={actionLoading.updating === order.id}
            >
              <SelectTrigger className="w-[200px] cursor-pointer">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent className="bg-white cursor-pointer">
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="PENDING">Pending</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="PROCESSING">Processing</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="SHIPPED">Shipped</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="DELIVERED">Delivered</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="CANCELLED">Cancelled</SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className='cursor-pointer text-red-500 hover:bg-red-100' 
              variant="outline" 
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};