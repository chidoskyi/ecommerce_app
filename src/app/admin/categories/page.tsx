// pages/CategoriesPage.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { CategoryForm } from "@/components/dashboard/categories/CategoryForm";
import { CategoryTable } from "@/components/dashboard/categories/CategoryTable";
import { Category, NewCategory, SortConfig } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState<boolean>(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState<boolean>(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ 
    key: "name", 
    direction: "asc" 
  });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (): Promise<void> => {
    setLoading(true);
    try {
      // In a real app, you would fetch from your API
      // const response = await api.getCategories()
      // setCategories(response.data)

      // Mock data for demonstration
      const mockCategories: Category[] = [
        {
          id: 1,
          name: "Clothing",
          slug: "clothing",
          image: "/lottuse.webp",
          isActive: true,
          productsCount: 120,
          createdAt: "2023-01-15T10:30:00",
          updatedAt: "2023-05-20T14:45:00",
        },
        {
          id: 2,
          name: "Electronics",
          slug: "electronics",
          image: "/lottuse.webp",          isActive: true,
          productsCount: 85,
          createdAt: "2023-01-19T10:15:00",
          updatedAt: "2023-05-25T13:20:00",
        },
        {
          id: 3,
          name: "Home & Kitchen",
          slug: "home-kitchen",
          image: "/lottuse.webp",          isActive: false,
          productsCount: 0,
          createdAt: "2023-01-22T13:40:00",
          updatedAt: "2023-05-28T10:30:00",
        },
        {
          id: 4,
          name: "Sports & Outdoors",
          slug: "sports-outdoors",
          image: "/lottuse.webp",          isActive: true,
          productsCount: 67,
          createdAt: "2023-02-01T09:20:00",
          updatedAt: "2023-05-30T11:15:00",
        },
        {
          id: 5,
          name: "Books",
          slug: "books",
          image: "/lottuse.webp",          isActive: true,
          productsCount: 234,
          createdAt: "2023-02-05T14:30:00",
          updatedAt: "2023-06-01T16:20:00",
        },
      ];

      setCategories(mockCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (newCategory: NewCategory): Promise<void> => {
    try {
      // In a real app, you would call your API
      // const response = await api.createCategory(newCategory)

      // Mock adding a category
      const mockCategory: Category = {
        id: categories.length + 1,
        ...newCategory,
        productsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setCategories(prev => [...prev, mockCategory]);
      setIsAddCategoryOpen(false);
      toast.success("Category added successfully");
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category");
    }
  };

  const handleEditCategory = async (updatedCategory: Category): Promise<void> => {
    try {
      // In a real app, you would call your API
      // await api.updateCategory(updatedCategory.id, updatedCategory)

      // Mock updating a category
      setCategories(prev =>
        prev.map(category =>
          category.id === updatedCategory.id ? updatedCategory : category
        )
      );
      setIsEditCategoryOpen(false);
      setCurrentCategory(null);
      toast.success("Category updated successfully");
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId: number): Promise<void> => {
    try {
      const categoryToDelete = categories.find(cat => cat.id === categoryId);
      
      if (categoryToDelete && categoryToDelete.productsCount > 0) {
        toast.error("Cannot delete a category with products. Please remove or reassign products first.");
        return;
      }

      // In a real app, you would call your API
      // await api.deleteCategory(categoryId)

      // Mock deleting a category
      setCategories(prev => prev.filter(category => category.id !== categoryId));
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const handleStatusChange = async (categoryId: number, newStatus: boolean): Promise<void> => {
    try {
      // In a real app, you would call your API
      // await api.updateCategoryStatus(categoryId, newStatus)

      // Mock updating category status
      setCategories(prev =>
        prev.map(category =>
          category.id === categoryId 
            ? { ...category, isActive: newStatus, updatedAt: new Date().toISOString() }
            : category
        )
      );
      toast.success(`Category ${newStatus ? "activated" : "deactivated"} successfully`);
    } catch (error) {
      console.error("Error updating category status:", error);
      toast.error("Failed to update category status");
    }
  };

  const handleSort = (key: keyof Category): void => {
    let direction: 'asc' | 'desc' = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleEditClick = (category: Category): void => {
    setCurrentCategory(category);
    setIsEditCategoryOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">Manage product categories</p>
      </div>

      <div className="flex flex-col space-y-4">
        <Card className="shadow-md  border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg md:text-2xl ">Product Categories</CardTitle>
              <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                <DialogTrigger asChild>
                  <Button className='flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25'>
                    <Plus className="h-4 w-4" />
                    <span>Add Category</span>
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
            <CardDescription>
              Organize your products with categories
            </CardDescription>
            <div className="pt-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search categories..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryTable
              categories={categories}
              loading={loading}
              searchQuery={searchQuery}
              sortConfig={sortConfig}
              onSort={handleSort}
              onEdit={handleEditClick}
              onDelete={handleDeleteCategory}
              onStatusChange={handleStatusChange}
            />
          </CardContent>
        </Card>
      </div>

      {/* Add Category Form */}
      <CategoryForm
        isOpen={isAddCategoryOpen}
        onClose={() => setIsAddCategoryOpen(false)}
        onSubmit={handleAddCategory}
        mode="add"
      />

      {/* Edit Category Form */}
      <CategoryForm
        category={currentCategory || undefined}
        isOpen={isEditCategoryOpen}
        onClose={() => {
          setIsEditCategoryOpen(false);
          setCurrentCategory(null);
        }}
        onSubmit={(category) => {
          // Only proceed if category is a full Category (not NewCategory)
          if ("id" in category) {
            handleEditCategory(category);
          }
        }}
        mode="edit"
      />
    </div>
  );
};


