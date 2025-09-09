"use client";

import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Category } from "@/types/categories";
import {  Product, ProductFilters as ProductFiltersType } from "@/types/products";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

export interface ProductFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: ProductFiltersType & { priceType?: string };
  categories: Category[];
  products: Product[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onFilterChange: (key: string, value: string) => void;
  onPriceFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
}

export function ProductFilters({
  searchQuery,
  setSearchQuery,
  filters,
  categories,
  products,
  activeTab,
  setActiveTab,
  onFilterChange,
  onPriceFilterChange,
  onResetFilters,
}: ProductFiltersProps) {
  // Date range popover state
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Handler for date range selection
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range && range.from && range.to) {
      setDatePopoverOpen(false);
      onFilterChange("dateRange", JSON.stringify(range));
    }
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(
    (val) =>
      val !== "all" &&
      val !== "" &&
      (typeof val === "object" ? val.minPrice || val.maxPrice : true)
  ).length;

  // Handle filter popover close
  const handleFilterPopoverClose = () => {
    setFilterPopoverOpen(false);
  };

  return (
    <div className="space-y-3 sm:space-y-4 sm:px-0">
      {/* Search and Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 focus:ring-1 rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Button */}
        <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex-shrink-0 gap-2 px-4 py-2.5 sm:py-3 bg-white border-gray-300 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              <span className="sm:hidden">Filter</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 h-5 text-xs bg-blue-100 text-blue-700">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[calc(100vw-24px)] sm:w-80 bg-white border shadow-lg rounded-lg p-0 mx-3 sm:mx-0" 
            align="end"
            sideOffset={8}
          >
            {/* Filter Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h4 className="font-semibold text-gray-900">Filters</h4>
                <p className="text-sm text-gray-500">Refine your search</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFilterPopoverClose}
                className="h-8 w-8 hover:bg-gray-100 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-status" className="text-sm font-medium text-gray-700">
                  Status
                </Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => onFilterChange("status", value)}
                >
                  <SelectTrigger
                    id="filter-status"
                    className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md"
                  >
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg rounded-md">
                    <SelectItem value="all" className="cursor-pointer hover:bg-gray-50">All Statuses</SelectItem>
                    <SelectItem value="active" className="cursor-pointer hover:bg-gray-50">Active</SelectItem>
                    <SelectItem value="inactive" className="cursor-pointer hover:bg-gray-50">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-category" className="text-sm font-medium text-gray-700">
                  Category
                </Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => onFilterChange("category", value)}
                >
                  <SelectTrigger
                    id="filter-category"
                    className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md"
                  >
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg rounded-md max-h-48 overflow-y-auto">
                    <SelectItem value="all" className="cursor-pointer hover:bg-gray-50">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={String(category.id)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="filter-priceType" className="text-sm font-medium text-gray-700">
                  Price Type
                </Label>
                <Select
                  value={filters.priceType || "all"}
                  onValueChange={(value) => onFilterChange("priceType", value)}
                >
                  <SelectTrigger
                    id="filter-priceType"
                    className="w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md"
                  >
                    <SelectValue placeholder="All price types" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border shadow-lg rounded-md">
                    <SelectItem value="all" className="cursor-pointer hover:bg-gray-50">All Price Types</SelectItem>
                    <SelectItem value="fixed" className="cursor-pointer hover:bg-gray-50">Fixed Price</SelectItem>
                    <SelectItem value="variable" className="cursor-pointer hover:bg-gray-50">Variable Price</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Price Range</Label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Min price"
                    value={filters.minPrice}
                    onChange={(e) => onPriceFilterChange("min", e.target.value)}
                    className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md text-sm"
                  />
                  <span className="hidden sm:block text-gray-500 text-sm px-2">to</span>
                  <div className="block sm:hidden w-full text-center text-gray-500 text-xs py-1">to</div>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Max price"
                    value={filters.maxPrice}
                    onChange={(e) => onPriceFilterChange("max", e.target.value)}
                    className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md text-sm"
                  />
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Date Range</Label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-left font-normal border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-md py-2.5 px-3"
                    >
                      {dateRange && dateRange.from && dateRange.to
                        ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                        : "Select date range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0 bg-white border shadow-lg rounded-lg" 
                    align="center"
                    side="bottom"
                  >
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={handleDateRangeChange}
                      numberOfMonths={window.innerWidth >= 768 ? 2 : 1}
                      className="p-3"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Filter Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-lg">
              <Button
                variant="outline"
                onClick={() => {
                  onResetFilters();
                  setDateRange(undefined);
                }}
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors rounded-md"
              >
                Reset All Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabs Section */}
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="relative">
            <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide bg-gray-50 p-1 rounded-lg border border-gray-200">
              <div className="flex gap-1 min-w-max">
                <TabsTrigger 
                  value="all" 
                  className="flex-shrink-0 cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-all"
                >
                  <span>All</span>
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700">
                    {products.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="active" 
                  className="flex-shrink-0 cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-all"
                >
                  <span>Active</span>
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700">
                    {products.filter((p) => p.status === "ACTIVE").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="inactive" 
                  className="flex-shrink-0 cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-all"
                >
                  <span>Inactive</span>
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs bg-gray-200 text-gray-600">
                    {products.filter((p) => p.status === "INACTIVE").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger 
                  value="featured" 
                  className="flex-shrink-0 cursor-pointer data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-3 py-2 text-sm font-medium transition-all"
                >
                  <span>Featured</span>
                  <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700">
                    {products.filter((p) => p.isFeatured).length}
                  </Badge>
                </TabsTrigger>
              </div>
            </TabsList>
          </div>
        </Tabs>
      </div>

      {/* Active Filters Display (Mobile) */}
      {activeFilterCount > 0 && (
        <div className="sm:hidden">
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-800">
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onResetFilters();
                setDateRange(undefined);
              }}
              className="text-blue-600 hover:bg-blue-100 text-sm px-2 py-1 h-auto"
            >
              Clear all
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}