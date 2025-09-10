// components/OrderFilters.tsx - Mobile Responsive Version
import React, { useState } from 'react';
import {
  Search,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Filter,
  X,
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
  // fetchOrders,
  bulkUpdateOrderStatus
} from '@/app/store/slices/adminOrderSlice';
import { useAppDispatch, useAppSelector } from '@/app/store/hooks';

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
  const dispatch = useAppDispatch();
  const filters = useAppSelector(selectOrdersFilters);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
    // Validate that the statusFilter is a valid OrderStatus or "all"
    const validStatuses: (OrderStatus | "all")[] = [
      "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "all"
    ];
  
    if (!validStatuses.includes(statusFilter as OrderStatus | "all")) {
      console.warn("Invalid status filter:", statusFilter);
      return; // Don't dispatch invalid values
    }
  
    const newFilters = { 
      statusFilter: statusFilter as OrderStatus | "all", // Type assertion
      page: 1 
    };
    
    dispatch(setFilters(newFilters));
    setShowMobileFilters(false); // Close mobile filters after selection
    
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

  const hasActiveFilters = filters.statusFilter !== "all" || dateRangeForUI.from || dateRangeForUI.to;

  return (
    <div className="flex flex-col space-y-3 sm:space-y-4">
      {/* Mobile Filter Toggle & Bulk Actions Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Bulk Actions - Always Visible When Items Selected */}
        {selectedOrdersCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                Actions ({selectedOrdersCount})
                <ChevronDown className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className='bg-white w-48'>
              <DropdownMenuLabel className="text-xs sm:text-sm">Change Status</DropdownMenuLabel>
              <DropdownMenuItem className='cursor-pointer text-xs sm:text-sm' onClick={() => handleBulkStatusChange("PROCESSING")}>
                <Clock className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Mark as Processing
              </DropdownMenuItem>
              <DropdownMenuItem className='cursor-pointer text-xs sm:text-sm' onClick={() => handleBulkStatusChange("SHIPPED")}>
                <Truck className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Mark as Shipped
              </DropdownMenuItem>
              <DropdownMenuItem className='cursor-pointer text-xs sm:text-sm' onClick={() => handleBulkStatusChange("CONFIRMED")}>
                <CheckCircle2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Mark as Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className='cursor-pointer text-xs sm:text-sm' onClick={() => handleBulkStatusChange("CANCELLED")}>
                <XCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Mark as Cancelled
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Mobile Filter Toggle Button */}
        <div className="flex items-center gap-2 sm:hidden ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-1" />
            <span className="text-xs">Filters</span>
            {hasActiveFilters && (
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-blue-600 rounded-full"></div>
            )}
          </Button>
        </div>

        {/* Desktop Filters - Always Visible */}
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          {/* Date Range Picker */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-1 cursor-pointer text-sm">
                <Calendar className="h-4 w-4" />
                {dateRangeForUI.from && dateRangeForUI.to ? (
                  <span className="hidden md:inline">
                    {format(dateRangeForUI.from, "LLL dd")} - {format(dateRangeForUI.to, "LLL dd")}
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

          {/* Status Filter */}
          <Select value={filters.statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[160px] lg:w-[180px] cursor-pointer">
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

      {/* Mobile Filters Dropdown */}
      {showMobileFilters && (
        <div className="sm:hidden bg-gray-50 rounded-lg p-4 border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Filters</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFilters(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <Select value={filters.statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full cursor-pointer">
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

          {/* Mobile Date Range */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2 cursor-pointer">
                  <Calendar className="h-4 w-4" />
                  {dateRangeForUI.from && dateRangeForUI.to ? (
                    <span className="text-sm">
                      {format(dateRangeForUI.from, "MMM dd")} - {format(dateRangeForUI.to, "MMM dd")}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">Select date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-screen max-w-sm bg-white cursor-pointer mx-4" align="center" side="bottom" sideOffset={5}>
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
                  numberOfMonths={1}
                  className='cursor-pointer w-full'
                />
                {dateRangeForUI.from && dateRangeForUI.to && (
                  <div className="flex items-center justify-end gap-2 p-3 border-t">
                    <Button className='cursor-pointer' variant="outline" size="sm" onClick={clearDateRange}>
                      Clear
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Clear All Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleStatusFilterChange("all");
                clearDateRange();
                setShowMobileFilters(false);
              }}
              className="w-full"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      )}

      {/* Search Input - Always Visible */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search orders by ID, customer name, or email..."
          className="pl-8 text-sm focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
          value={filters.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Active Filters Summary - Mobile */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 sm:hidden">
          {filters.statusFilter !== "all" && (
            <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              <span>Status: {filters.statusFilter}</span>
              <button
                onClick={() => handleStatusFilterChange("all")}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {dateRangeForUI.from && dateRangeForUI.to && (
            <div className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              <span>
                {format(dateRangeForUI.from, "MMM dd")} - {format(dateRangeForUI.to, "MMM dd")}
              </span>
              <button
                onClick={clearDateRange}
                className="hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};