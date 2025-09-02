"use client";

import { Search, Filter } from "lucide-react";
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Handler for date range selection
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range && range.from && range.to) {
      setDatePopoverOpen(false);
      onFilterChange("dateRange", JSON.stringify(range));
    }
  };

  return (
    <div className="pt-4 space-y-4 overflow-hidden">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products by name, SKU, or description..."
            className="pl-8 focus:border-blue-500 focus:ring-blue-500 focus:ring-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="gap-1 bg-transparent cursor-pointer"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {Object.values(filters).some(
                (val) =>
                  val !== "all" &&
                  (typeof val === "object" ? val.minPrice || val.maxPrice : true)
              ) && (
                <Badge variant="secondary" className="ml-1 px-1 py-0 h-5">
                  {
                    Object.values(filters).filter(
                      (val) =>
                        val !== "all" &&
                        (typeof val === "object" ? val.minPrice || val.maxPrice : true)
                    ).length
                  }
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-white border-none shadow-lg -ml-0 md:-ml-50">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none text-gray-900">
                  Filters
                </h4>
                <p className="text-sm text-gray-600">
                  Filter products by various criteria
                </p>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label
                    htmlFor="filter-status"
                    className="text-sm font-medium text-gray-700"
                  >
                    Status
                  </Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => onFilterChange("status", value)}
                  >
                    <SelectTrigger
                      id="filter-status"
                      className="cursor-pointer border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="cursor-pointer bg-white">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label
                    htmlFor="filter-category"
                    className="text-sm font-medium text-gray-700"
                  >
                    Category
                  </Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => onFilterChange("category", value)}
                  >
                    <SelectTrigger
                      id="filter-category"
                      className="cursor-pointer border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent className="cursor-pointer bg-white">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Type Filter */}
                <div className="grid gap-1">
                  <Label
                    htmlFor="filter-priceType"
                    className="text-sm font-medium text-gray-700"
                  >
                    Price Type
                  </Label>
                  <Select
                    value={filters.priceType || "all"}
                    onValueChange={(value) =>
                      onFilterChange("priceType", value)
                    }
                  >
                    <SelectTrigger
                      id="filter-priceType"
                      className="cursor-pointer border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <SelectValue placeholder="Filter by price type" />
                    </SelectTrigger>
                    <SelectContent className="cursor-pointer bg-white">
                      <SelectItem value="all">All Price Types</SelectItem>
                      <SelectItem value="fixed">Fixed Price</SelectItem>
                      <SelectItem value="variable">Variable Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label className="text-sm font-medium text-gray-700">
                    Price Range
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) =>
                        onPriceFilterChange("min", e.target.value)
                      }
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        onPriceFilterChange("max", e.target.value)
                      }
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Date Range Filter */}
                <div className="grid gap-1">
                  <Label className="text-sm font-medium text-gray-700">Date Range</Label>
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        {dateRange && dateRange.from && dateRange.to
                          ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                          : "Select date range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-none shadow-lg">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={handleDateRangeChange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={onResetFilters}
                className="mt-2 border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Reset Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
  <TabsList className="overflow-y-auto whitespace-nowrap scrollbar-hide w-full flex justify-start">
    <TabsTrigger value="all" className="cursor-pointer">
      All
      <Badge variant="secondary" className="ml-2">
        {products.length}
      </Badge>
    </TabsTrigger>
    <TabsTrigger value="active" className="cursor-pointer">
      Active
      <Badge variant="secondary" className="ml-2">
        {products.filter((p) => p.status === "ACTIVE").length}
      </Badge>
    </TabsTrigger>
    <TabsTrigger value="inactive" className="cursor-pointer">
      Inactive
      <Badge variant="secondary" className="ml-2">
        {products.filter((p) => p.status === "INACTIVE").length}
      </Badge>
    </TabsTrigger>
    <TabsTrigger value="featured" className="cursor-pointer"  >
      Featured
      <Badge variant="secondary" className="ml-2">
        {products.filter((p) => p.isFeatured).length}
      </Badge>
    </TabsTrigger>
  </TabsList>
</Tabs>

    </div>
  );
}