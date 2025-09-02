// components/OrderFilters.tsx - Redux Connected - Fixed
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Search,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  Truck,
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
import { OrderStatus, OrderFilters as filterOrders } from '@/types/orders';
import {
  selectOrdersFilters,
  setFilters,
  fetchOrders,
  bulkUpdateOrderStatus
} from '@/app/store/slices/adminOrderSlice';

interface OrderFiltersProps {
  selectedOrdersCount: number;
  selectedOrders: string[];
  onFiltersChange?: (filters: Partial<filterOrders>) => void;
  onBulkStatusChange?: (status: OrderStatus) => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  selectedOrdersCount,
  selectedOrders,
  onFiltersChange,
  onBulkStatusChange,
}) => {
  const dispatch = useDispatch();
  const filters = useSelector(selectOrdersFilters);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Convert stored ISO strings back to Date objects for the calendar UI
  const dateRangeForUI = {
    from: filters.dateRange?.from ? new Date(filters.dateRange.from) : null,
    to: filters.dateRange?.to ? new Date(filters.dateRange.to) : null,
  };

  const handleSearchChange = (searchQuery: string) => {
    const newFilters = { searchQuery, page: 1 };
    dispatch(setFilters(newFilters));
    
    // Also call the parent callback if provided
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleStatusFilterChange = (statusFilter: string) => {
    const newFilters = { statusFilter, page: 1 };
    dispatch(setFilters(newFilters));
    
    // Also call the parent callback if provided
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    // Store as ISO strings in Redux
    const serializedRange = {
      from: range.from ? range.from.toISOString() : null,
      to: range.to ? range.to.toISOString() : null,
    };
    
    const newFilters = {
      dateRange: serializedRange,
      page: 1,
    };
    
    dispatch(setFilters(newFilters));
    
    // Also call the parent callback if provided
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  };

  const handleBulkStatusChange = (status: OrderStatus) => {
    if (onBulkStatusChange) {
      onBulkStatusChange(status);
    } else {
      dispatch(bulkUpdateOrderStatus({ orderIds: selectedOrders, status }));
    }
  };

  const clearDateRange = () => {
    const newFilters = { 
      dateRange: { from: null, to: null },
      page: 1
    };
    
    dispatch(setFilters(newFilters));
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
    
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
                <DropdownMenuItem className='cursor-pointer' onClick={() => handleBulkStatusChange("PROCESSING")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Mark as Processing
                </DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer' onClick={() => handleBulkStatusChange("SHIPPED")}>
                  <Truck className="mr-2 h-4 w-4" />
                  Mark as Shipped
                </DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer' onClick={() => handleBulkStatusChange("CONFIRMED")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark as Completed
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='cursor-pointer' onClick={() => handleBulkStatusChange("CANCELLED")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Mark as Cancelled
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-1 cursor-pointer">
                <Calendar className="h-4 w-4" />
                {dateRangeForUI.from && dateRangeForUI.to ? (
                  <span>
                    {format(dateRangeForUI.from, "LLL dd, y")} - {format(dateRangeForUI.to, "LLL dd, y")}
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
                defaultMonth={dateRangeForUI.from ?? undefined}
                selected={{
                  from: dateRangeForUI.from ?? undefined,
                  to: dateRangeForUI.to ?? undefined
                }}
                onSelect={(range) => {
                  handleDateRangeChange({
                    from: range?.from ?? null,
                    to: range?.to ?? null,
                  });
                }}
                numberOfMonths={2}
                className='cursor-pointer'
              />
              {dateRangeForUI.from && dateRangeForUI.to && (
                <div className="flex items-center justify-end gap-2 p-3 border-t">
                  <Button className='cursor-pointer' variant="outline" size="sm" onClick={clearDateRange}>
                    Clear
                  </Button>
                  <Button 
                    size="sm" 
                    className='cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600' 
                    onClick={() => setIsCalendarOpen(false)}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Select value={filters.statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[180px] cursor-pointer">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className='bg-white'>
              <SelectItem className='cursor-pointer' value="all">All Statuses</SelectItem>
              <SelectItem className='cursor-pointer' value="PENDING">Pending</SelectItem>
              <SelectItem className='cursor-pointer' value="PROCESSING">Processing</SelectItem>
              <SelectItem className='cursor-pointer' value="SHIPPED">Shipped</SelectItem>
              <SelectItem className='cursor-pointer' value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem className='cursor-pointer' value="CANCELLED">Cancelled</SelectItem>
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
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
};