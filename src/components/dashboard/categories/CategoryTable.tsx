// components/CategoryTable.tsx
import React from 'react';
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
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryTableProps, Category } from '@/lib/types';

export const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  loading,
  searchQuery,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const filterCategories = (categories: Category[]): Category[] => {
    if (!searchQuery) return categories;

    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const sortCategories = (categories: Category[]): Category[] => {
    return [...categories].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (sortConfig.key === "name" || sortConfig.key === "slug") {
        const aStr = String(aValue);
        const bStr = String(bValue);
        return sortConfig.direction === "asc" 
          ? aStr.localeCompare(bStr) 
          : bStr.localeCompare(aStr);
      }

      if (sortConfig.key === "productsCount") {
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        return sortConfig.direction === "asc" 
          ? aNum - bNum 
          : bNum - aNum;
      }

      if (sortConfig.key === "updatedAt" || sortConfig.key === "createdAt") {
        const aDate = new Date(String(aValue)).getTime();
        const bDate = new Date(String(bValue)).getTime();
        return sortConfig.direction === "asc" 
          ? aDate - bDate 
          : bDate - aDate;
      }

      return 0;
    });
  };

  const filteredAndSortedCategories = sortCategories(filterCategories(categories));

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

  if (filteredAndSortedCategories.length === 0 && searchQuery) {
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

  if (filteredAndSortedCategories.length === 0) {
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
          {filteredAndSortedCategories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium flex items-center gap-1">
                <div className="relative w-20 h-20">
                  <Image src={category.image ?? "/placeholder.png"} alt={category.name} fill className="object-contain rounded-md" />
                </div>
                <span>{category.name}</span>
              </TableCell>
              <TableCell>{category.slug}</TableCell>
              <TableCell>{category.productsCount}</TableCell>
              <TableCell>
                <Badge variant={category.isActive ? "outline" : "secondary"}>
                  {category.isActive ? "Active" : "Inactive"}
                </Badge>
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
                      onClick={() => onStatusChange(category.id, !category.isActive)}
                      className='cursor-pointer'
                    >
                      {category.isActive ? (
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
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};