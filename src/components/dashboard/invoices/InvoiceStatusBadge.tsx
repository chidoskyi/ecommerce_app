"use client"

import { CheckCircle2, Clock, AlertCircle, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InvoiceStatus } from "@prisma/client";

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const getStatusBadgeColor = (status: InvoiceStatus): string => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 p-2";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 p-2";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 p-2";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 p-2";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 p-2";
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "overdue":
        return <AlertCircle className="h-4 w-4" />;
      case "draft":
        return <FileText className="h-4 w-4" />;
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
}