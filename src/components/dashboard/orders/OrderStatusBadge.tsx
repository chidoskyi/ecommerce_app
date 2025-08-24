// components/OrderStatusBadge.tsx
import React from 'react';
import { CheckCircle2, Clock, Truck, Package, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrderStatus, OrderStatusBadgeProps } from '@/lib/types';

export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({ status }) => {
  const getStatusBadgeColor = (status: OrderStatus): string => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 p-2";
      case "processing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 p-2";
      case "shipped":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 p-2";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 p-2";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 p-2";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 p-2";
    }
  };

  const getStatusIcon = (status: OrderStatus): React.ReactNode => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "processing":
        return <Clock className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "pending":
        return <Package className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <Badge className={getStatusBadgeColor(status)} variant="outline">
      <div className="flex items-center gap-1">
        {getStatusIcon(status)}
        <span className="capitalize">{status}</span>
      </div>
    </Badge>
  );
};