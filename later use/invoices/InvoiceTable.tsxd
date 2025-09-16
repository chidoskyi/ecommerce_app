"use client"

import {
  ArrowUpDown,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Download,
  Printer,
  Bug,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { InvoiceStatusBadge } from "./InvoiceStatusBadge"
import { PriceFormatter } from "@/components/reuse/FormatCurrency"
import type { Invoice, InvoiceTableProps } from "@/types/invoice"
import { downloadInvoicePDF, printInvoice, debugInvoiceHTML, runDiagnostics } from "@/utils/invoice-utils"
import { toast } from "react-toastify"

export function InvoiceTable({
  invoices,
  loading,
  selectedInvoices,
  // sortConfig,
  onSort,
  onSelectAll,
  onSelectInvoice,
  onViewDetails,
  onStatusChange,
}: InvoiceTableProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const handleDownloadPDF = async (invoice: Invoice) => {
    console.log("🎯 Download PDF clicked for invoice:", invoice.id)

    try {
      toast.info("Generating PDF...")
      console.log("📊 Toast notification sent")

      await downloadInvoicePDF(invoice)

      console.log("✅ PDF download completed successfully")
      toast.success("PDF downloaded successfully!")
    } catch (error) {
      console.error("❌ PDF download failed:", error)
      const message = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to generate PDF: ${message}`)
    }
  }

  const handlePrintInvoice = async (invoice: Invoice) => {
    console.log("🖨️ Print invoice clicked for:", invoice.id)

    try {
      toast.info("Preparing invoice for printing...")
      await printInvoice(invoice)
      toast.success("Print dialog opened!")
      console.log("✅ Print process initiated successfully")
    } catch (error) {
      console.error("❌ Print failed:", error)
      const message = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to print invoice: ${message}`)
    }
  }

  const handleDebugInvoice = (invoice: Invoice) => {
    console.log("🐛 Debug invoice clicked for:", invoice.id)
    debugInvoiceHTML(invoice)
    toast.info("Debug PDF generation started - check downloads")
  }

  const handleRunDiagnostics = async () => {
    console.log("🔍 Running diagnostics...")
    await runDiagnostics()
    toast.info("Diagnostics completed - check console for results")
  }

  return (
    <div className="rounded-md border">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleRunDiagnostics} variant="outline" size="sm">
            <Bug className="mr-2 h-4 w-4" />
            Run Diagnostics
          </Button>
          <span className="text-sm text-gray-600">Check jsPDF environment</span>
        </div>
        <div className="text-sm text-gray-500">💡 Using jsPDF for reliable PDF generation</div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox
                checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                onCheckedChange={(checked) => onSelectAll(Boolean(checked))}
              />
            </TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("customer")}>
              <div className="flex items-center gap-1">
                Customer
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("date")}>
              <div className="flex items-center gap-1">
                Issue Date
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("dueDate")}>
              <div className="flex items-center gap-1">
                Due Date
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="cursor-pointer" onClick={() => onSort("amount")}>
              <div className="flex items-center gap-1">
                Amount
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              </TableCell>
            </TableRow>
          ) : invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-10">
                No invoices found
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedInvoices.includes(invoice.id)}
                    onCheckedChange={() => onSelectInvoice(invoice.id)}
                    className="cursor-pointer"
                  />
                </TableCell>
                <TableCell className="font-medium">{invoice.id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{invoice.customer.name}</div>
                    <div className="text-sm text-muted-foreground">{invoice.customer.email}</div>
                  </div>
                </TableCell>
                <TableCell>{formatDate(invoice.date)}</TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell>
                  <PriceFormatter amount={invoice.amount} showDecimals={true} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-white" align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => onViewDetails(invoice)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>PDF Options</DropdownMenuLabel>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => handleDownloadPDF(invoice)}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => handlePrintInvoice(invoice)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Invoice
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Debug Options</DropdownMenuLabel>
                      <DropdownMenuItem className="cursor-pointer" onClick={() => handleDebugInvoice(invoice)}>
                        <Bug className="mr-2 h-4 w-4" />
                        Test PDF Generation
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onStatusChange(invoice.id, "paid")}
                        disabled={invoice.status === "paid"}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark as Paid
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onStatusChange(invoice.id, "pending")}
                        disabled={invoice.status === "pending"}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Mark as Pending
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onStatusChange(invoice.id, "overdue")}
                        disabled={invoice.status === "overdue"}
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Mark as Overdue
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onClick={() => onStatusChange(invoice.id, "draft")}
                        disabled={invoice.status === "draft"}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Mark as Draft
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
