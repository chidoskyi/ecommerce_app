"use client"

import { Download, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { InvoiceStatusBadge } from "./InvoiceStatusBadge"
import type { InvoiceDetailsDialogProps } from "@/types/invoice"
import { PriceFormatter } from "@/components/reuse/FormatCurrency"
import { downloadInvoicePDF, printInvoice } from "@/utils/invoice-utils"
import { toast } from "react-toastify"



export function InvoiceDetailsDialog({ invoice, isOpen, onClose, onStatusChange }: InvoiceDetailsDialogProps) {
  if (!invoice) return null

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }



  const handleDownloadPDF = async () => {
    try {
      toast.info("Generating PDF...")
      await downloadInvoicePDF(invoice)
      toast.success("PDF downloaded successfully!")
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.error("Failed to download PDF")
    }
  }

  const handlePrintInvoice = () => {
    try {
      printInvoice(invoice)
      toast.success("Print dialog opened")
    } catch (error) {
      console.error("Error printing invoice:", error)
      toast.error("Failed to print invoice")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-200">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
          <DialogDescription>View complete invoice information</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold">{invoice.id}</h3>
              <p className="text-sm text-muted-foreground">Issued: {formatDate(invoice.date)}</p>
              <p className="text-sm text-muted-foreground">Due: {formatDate(invoice.dueDate)}</p>
            </div>
            <InvoiceStatusBadge status={invoice.status} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-2">Bill To</h4>
              <div className="text-sm">
                <p className="font-medium">{invoice.customer.name}</p>
                <p>{invoice.customer.email}</p>
                <p>Customer ID: {invoice.customer.id}</p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Payment Information</h4>
              <div className="text-sm">
                <p>Method: {invoice.paymentMethod}</p>
                <p>
                  Status: <span className="capitalize">{invoice.status}</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Invoice Items</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right"><PriceFormatter amount={item.price} showDecimals={true} /></TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right"><PriceFormatter amount={item.total} showDecimals={true} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-semibold mb-2">Notes</h4>
              <div className="text-sm">
                <p>{invoice.notes}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">
                <div className="flex justify-between gap-8 font-semibold text-base pt-2">
                  <span>Total:</span>
                  <span>
                    <PriceFormatter amount={invoice.amount} showDecimals={true} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Select value={invoice.status} onValueChange={(value: InvoiceStatus) => onStatusChange(invoice.id, value)}>
              <SelectTrigger className="w-[200px] cursor-pointer">
                <SelectValue placeholder="Change status" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="paid">
                  Paid
                </SelectItem>
                <SelectItem className="cursor-pointer hover:bg-gray-200" value="pending">
                  Pending
                </SelectItem>
                <SelectItem className="cursor-pointer  hover:bg-gray-200" value="overdue">
                  Overdue
                </SelectItem>
                <SelectItem className="cursor-pointer  hover:bg-gray-200" value="draft">
                  Draft
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-green-50 text-green-500 bg-transparent"
                onClick={handleDownloadPDF}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer hover:bg-blue-50 text-blue-500 bg-transparent"
                onClick={handlePrintInvoice}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="cursor-pointer hover:bg-red-50 text-red-500 bg-transparent"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
