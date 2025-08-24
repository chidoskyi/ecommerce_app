// hooks/useInvoiceSort.ts
import { UseInvoiceSortParams } from "@/lib/types";
import { useMemo } from "react";



export function useInvoiceSort({ invoices, sortConfig }: UseInvoiceSortParams) {
  return useMemo(() => {
    return [...invoices].sort((a, b) => {
      if (sortConfig.key === "date") {
        return sortConfig.direction === "asc" 
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      }

      if (sortConfig.key === "amount") {
        return sortConfig.direction === "asc" ? a.amount - b.amount : b.amount - a.amount;
      }

      if (sortConfig.key === "customer") {
        return sortConfig.direction === "asc"
          ? a.customer.name.localeCompare(b.customer.name)
          : b.customer.name.localeCompare(a.customer.name);
      }

      if (sortConfig.key === "dueDate") {
        return sortConfig.direction === "asc"
          ? new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
          : new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }

      return 0;
    });
  }, [invoices, sortConfig]);
}