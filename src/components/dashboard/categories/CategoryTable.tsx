"use client"

import React, { useState } from 'react';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowUpDown,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CategoryPagination } from "./CategoryPagination";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Category, CategoryStatus, CategoryTableProps } from '@/types/categories';
import { getStatusBadgeColor } from "./CategoryBadge";

// Updated interface to include pagination props
export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  loading,
  searchQuery,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  onStatusChange,
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const formatDate = (dateString: string | undefined | null): string => {
    console.log('🔍 Formatting date:', dateString, 'Type:', typeof dateString);
    
    if (!dateString) {
      console.warn('⚠️ Date string is empty or null');
      return "No date";
    }
    
    const date = new Date(dateString);
    console.log('📅 Parsed date:', date, 'Valid:', !isNaN(date.getTime()));
    
    if (isNaN(date.getTime())) {
      console.error('❌ Invalid date format:', dateString);
      return "Invalid date";
    }
    
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Since filtering and sorting are now handled by the backend,
  // we just use the categories as-is
  const safeCategories = Array.isArray(categories) ? categories : [];
  
  console.log('🔍 CategoryTable: Displaying categories:', safeCategories.length);

  const isActive = (category: Category): boolean => {
    return category.status === CategoryStatus.ACTIVE;
  };

  const getStatusBadge = (category: Category) => {
    const active = isActive(category);
    return (
      <Badge
        variant="outline"
        className={`${getStatusBadgeColor(category.status)} text-xs`}
      >
        {active ? "Active" : "Inactive"}
      </Badge>
    );
  };
  
  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (safeCategories.length === 0 && searchQuery) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                No categories found matching &quot;{searchQuery}&quot;
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  if (safeCategories.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-10">
                No categories found. Create your first category to get started.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <>
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer" 
              onClick={() => onSort("name")}
            >
              <div className="flex items-center gap-1">
                Category Name
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Slug</TableHead>
            <TableHead 
              className="cursor-pointer" 
              onClick={() => onSort("productsCount")}
            >
              <div className="flex items-center gap-1">
                Products
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead 
              className="cursor-pointer" 
              onClick={() => onSort("updatedAt")}
            >
              <div className="flex items-center gap-1">
                Last Updated
                <ArrowUpDown className="h-4 w-4" />
              </div>
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeCategories.map((category, index) => {
            console.log(`🔍 CategoryTable: Rendering category ${index}:`, category);
            console.log(`🔍 CategoryTable: Category ${index} updatedAt:`, category.updatedAt);
            console.log(`🔍 CategoryTable: Category ${index} properties:`, Object.keys(category));
            
            return (
              <TableRow key={category.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image 
                        src={category.image ?? "/placeholder.png"} 
                        alt={category.name} 
                        fill 
                        className="object-cover rounded-md border" 
                      />
                    </div>
                    <span className="truncate">{category.name}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{category.slug}</TableCell>
                <TableCell>
                  <span className="font-medium">{category.productsCount || 0}</span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(category)}
                </TableCell>
                <TableCell>{formatDate(category.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="cursor-pointer">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white shadow-md border-none">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(category)} className="cursor-pointer">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onStatusChange(category.id, !isActive(category))}
                        className='cursor-pointer'
                      >
                        {isActive(category) ? (
                          <>
                            <X className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600 cursor-pointer" 
                        onClick={() => onDelete(category.id)}
                        disabled={(category.productsCount || 0) > 0}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                        {(category.productsCount || 0) > 0 && (
                          <span className="ml-1 text-xs">(has products)</span>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    {/* Add pagination */}
    <CategoryPagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      className="mt-4"
    />
    </>
  );
};