"use client"

import { ChevronDown, CheckCircle2, Clock, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Invoice } from "@/types/invoice"
import { downloadBulkInvoices } from "@/utils/invoice-utils"
import { toast } from "react-toastify"
import { InvoiceStatus } from "@prisma/client"

export interface BulkActionsProps {
  selectedCount: number
  selectedInvoices: string[]
  invoices: Invoice[]
  onBulkStatusChange: (status: InvoiceStatus) => void
}

export function BulkActions({ selectedCount, selectedInvoices, invoices, onBulkStatusChange }: BulkActionsProps) {
  if (selectedCount === 0) return null

  const handleBulkDownload = async () => {
    try {
      const selectedInvoiceData = invoices.filter((invoice) => selectedInvoices.includes(invoice.id))

      if (selectedInvoiceData.length === 0) {
        toast.warning("No invoices selected")
        return
      }

      toast.info(`Opening ${selectedInvoiceData.length} invoice windows...`)
      await downloadBulkInvoices(selectedInvoiceData)
      toast.success("Bulk download initiated! Check your browser windows.")
    } catch (error) {
      console.error("Error downloading bulk invoices:", error)
      toast.error("Failed to download invoices")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Bulk Actions ({selectedCount})
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-white">
        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
        <DropdownMenuItem className="cursor-pointer" onClick={() => onBulkStatusChange("paid")}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Mark as Paid
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => onBulkStatusChange("pending")}>
          <Clock className="mr-2 h-4 w-4" />
          Mark as Pending
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={handleBulkDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download Selected
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
