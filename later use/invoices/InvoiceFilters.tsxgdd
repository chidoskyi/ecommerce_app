"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import type { DateRange } from "@/types"

interface InvoiceFiltersProps {
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
}

export function InvoiceFilters({
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
}: InvoiceFiltersProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1 bg-transparent">
            <Calendar className="h-4 w-4" />
            {dateRange.from && dateRange.to ? (
              <span>
                {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
              </span>
            ) : (
              <span>Date Range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white" align="end">
          <CalendarComponent
            className="cursor-pointer"
            initialFocus
            mode="range"
            defaultMonth={dateRange.from ?? undefined}
            selected={{ from: dateRange.from ?? undefined, to: dateRange.to ?? undefined }}
            onSelect={(range) => {
              // Convert undefined to null to match DateRange type
              onDateRangeChange({
                from: range?.from ?? null,
                to: range?.to ?? null,
              })
              if (range?.to) {
                setIsCalendarOpen(false)
              }
            }}
            numberOfMonths={2}
          />
          {dateRange.from && dateRange.to && (
            <div className="flex items-center justify-end gap-2 p-3 border-t">
              <Button
                variant="outline"
                size="sm"
                className="hover:bg-gray-200 cursor-pointer bg-transparent"
                onClick={() => {
                  onDateRangeChange({ from: null, to: null })
                  setIsCalendarOpen(false)
                }}
              >
                Clear
              </Button>
              <Button size="sm" className="cursor-pointer" onClick={() => setIsCalendarOpen(false)}>
                Apply
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
