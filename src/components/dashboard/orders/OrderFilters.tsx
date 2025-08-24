// components/OrderFilters.tsx
import React, { useState } from 'react';
import {
  Search,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  Truck,
  Package,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { OrderFiltersProps } from '@/lib/types';
import type { DateRange } from "react-day-picker";

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  filters,
  onSearchChange,
  onStatusFilterChange,
  onDateRangeChange,
  selectedOrdersCount,
  onBulkStatusChange,
}) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateRangeSelect = (range: { from: Date | null; to: Date | null }) => {
    onDateRangeChange(range);
    if (range?.to) {
      setIsCalendarOpen(false);
    }
  };

  const clearDateRange = () => {
    onDateRangeChange({ from: null, to: null });
    setIsCalendarOpen(false);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {selectedOrdersCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Bulk Actions ({selectedOrdersCount})
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='bg-white'>
                <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                <DropdownMenuItem className='cursor-pointer' onClick={() => onBulkStatusChange("processing")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Mark as Processing
                </DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer' onClick={() => onBulkStatusChange("shipped")}>
                  <Truck className="mr-2 h-4 w-4" />
                  Mark as Shipped
                </DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer' onClick={() => onBulkStatusChange("completed")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='cursor-pointer' onClick={() => onBulkStatusChange("cancelled")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Mark as Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild >
              <Button variant="outline" className="gap-1 cursor-pointer">
                <Calendar className="h-4 w-4" />
                {filters.dateRange.from && filters.dateRange.to ? (
                  <span>
                    {format(filters.dateRange.from, "LLL dd, y")} - {format(filters.dateRange.to, "LLL dd, y")}
                  </span>
                ) : (
                  <span>Date Range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white cursor-pointer ml-3" align="end">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange.from ?? undefined}
                selected={{
                  from: filters.dateRange.from ?? undefined,
                  to: filters.dateRange.to ?? undefined
                }}
                onSelect={(range) => {
                  // Accepts DateRange | undefined, but we want to always pass {from, to} with null fallback
                  handleDateRangeSelect({
                    from: range?.from ?? null,
                    to: range?.to ?? null,
                  });
                }}
                numberOfMonths={2}
                className='cursor-pointer'
              />
              {filters.dateRange.from && filters.dateRange.to && (
                <div className="flex items-center justify-end gap-2 p-3 border-t">
                  <Button className='cursor-pointer' variant="outline" size="sm" onClick={clearDateRange}>
                    Clear
                  </Button>
                  <Button size="sm" className='cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600' onClick={() => setIsCalendarOpen(false)} >
                    Apply
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Select  value={filters.statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[180px] cursor-pointer">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className='bg-white'>
              <SelectItem className='cursor-pointer' value="all">All Statuses</SelectItem>
              <SelectItem className='cursor-pointer' value="pending">Pending</SelectItem>
              <SelectItem className='cursor-pointer' value="processing">Processing</SelectItem>
              <SelectItem className='cursor-pointer' value="shipped">Shipped</SelectItem>
              <SelectItem className='cursor-pointer' value="completed">Completed</SelectItem>
              <SelectItem className='cursor-pointer' value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search orders by ID, customer name, or email..."
          className="pl-8 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
};