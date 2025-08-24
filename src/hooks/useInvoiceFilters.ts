// hooks/useInvoiceFilters.ts
import { UseInvoiceFiltersParams } from "@/lib/types";
import { useMemo } from "react";

export function useInvoiceFilters({
  invoices,
  searchQuery,
  statusFilter,
  dateRange,
}: UseInvoiceFiltersParams) {
  return useMemo(() => {
    return invoices.filter((invoice) => {
      // Search filter
      const searchMatch =
        invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.customer.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === "all" || invoice.status === statusFilter;

      // Date range filter
      let dateMatch = true;
      if (dateRange.from && dateRange.to) {
        const invoiceDate = new Date(invoice.date);
        dateMatch = invoiceDate >= dateRange.from && invoiceDate <= dateRange.to;
      }

      return searchMatch && statusMatch && dateMatch;
    });
  }, [invoices, searchQuery, statusFilter, dateRange]);
}

