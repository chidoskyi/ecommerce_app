// pages/CategoriesPage.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { CategoryForm } from "@/components/dashboard/categories/CategoryForm";
import { CategoryTable } from "@/components/dashboard/categories/CategoryTable";
import { Category, NewCategory, SortConfig } from "@/types/categories";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "@/app/store";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  updateCategoryStatus,
  selectCategories,
  selectCurrentCategory,
  selectLoading,
  selectCreating,
  selectUpdating,
  selectDeleting,
  selectError,
  selectPagination,
  selectFilters,
  setCurrentCategory,
  clearCurrentCategory,
  clearError,
  uploadCategoryImages,
} from "@/app/store/slices/adminCategorySlice";

export default function CategoriesPage() {
  const dispatch = useDispatch<AppDispatch>();

  // Redux selectors
  const categories = useSelector(selectCategories);
  const currentCategory = useSelector(selectCurrentCategory);
  const loading = useSelector(selectLoading);
  const creating = useSelector(selectCreating);
  const updating = useSelector(selectUpdating);
  const deleting = useSelector(selectDeleting);
  const error = useSelector(selectError);
  const pagination = useSelector(selectPagination);
  const filters = useSelector(selectFilters);

  // Add logging for Redux state
  console.log("🔍 CategoriesPage: Redux state:", {
    categories,
    categoriesLength: categories?.length,
    categoriesType: typeof categories,
    categoriesIsArray: Array.isArray(categories),
    currentCategory,
    loading,
    creating,
    updating,
    deleting,
    error,
    pagination,
    filters,
  });

  // Local state for UI
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isAddCategoryOpen, setIsAddCategoryOpen] = React.useState<boolean>(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = React.useState<boolean>(false);
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    key: "name",
    direction: "asc",
  });

  // Debounced search function
  // const debouncedSearch = useCallback(
  //   (() => {
  //     let timeoutId: NodeJS.Timeout;
  //     return (query: string) => {
  //       clearTimeout(timeoutId);
  //       timeoutId = setTimeout(() => {
  //         console.log('🔍 CategoriesPage: Searching with query:', query);
  //         dispatch(fetchCategories({
  //           search: query || undefined,
  //           sortBy: sortConfig.key,
  //           sortOrder: sortConfig.direction,
  //           page: 1, // Reset to first page on search
  //           limit: 10
  //         }));
  //       }, 300); // 300ms debounce
  //     };
  //   })(),
  //   [dispatch] // Remove sortConfig and pagination from dependencies
  // );

  // Fetch categories on component mount only
  useEffect(() => {
    console.log("🚀 CategoriesPage: Initial fetchCategories");
    dispatch(
      fetchCategories({
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        limit: 10,
      })
    );
  }, [dispatch]); // Only depend on dispatch

  // Handle sort changes separately
  useEffect(() => {
    if (sortConfig.key !== "name" || sortConfig.direction !== "asc") {
      console.log("🚀 CategoriesPage: Sort changed, fetching with new sort");
      dispatch(
        fetchCategories({
          search: searchQuery || undefined,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
          page: 1,
          limit: 10,
        })
      );
    }
  }, [sortConfig.key, sortConfig.direction, dispatch]);

  // Handle search query changes with ref to avoid dependency issues
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      console.log("🔍 CategoriesPage: Searching with query:", searchQuery);
      dispatch(
        fetchCategories({
          search: searchQuery || undefined,
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction,
          page: 1,
          limit: 10,
        })
      );
    }, 300);

    // Cleanup on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, dispatch]); // Only depend on searchQuery and dispatch

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error("❌ CategoriesPage: Error occurred:", error);
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleAddCategory = async (
    category: Category | NewCategory
  ): Promise<void> => {
    try {
      console.log("🚀 CategoriesPage: Adding category:", category);

      const categoryData = category;

      // If there's an image file, we need to create category first, then upload image
      if (category.image instanceof File) {
        // First create category without image
        const categoryWithoutImage = {
          ...category,
          image: null,
        };

        const createdCategory = await dispatch(
          createCategory(categoryWithoutImage)
        ).unwrap();

        // Then upload image to the created category
        const uploadResult = await dispatch(
          uploadCategoryImages({
            categoryId: createdCategory.id.toString(),
            files: [category.image],
          })
        ).unwrap();

        // Finally update the category with the image URL
        await dispatch(
          updateCategory({
            id: createdCategory.id.toString(),
            ...createdCategory,
            image: uploadResult.url,
          })
        ).unwrap();
      } else {
        // No image file, just create the category
        await dispatch(createCategory(categoryData)).unwrap();
      }

      setIsAddCategoryOpen(false);
      toast.success("Category added successfully");
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleEditCategory = async (
    updatedCategory: Category
  ): Promise<void> => {
    try {
      console.log("🚀 CategoriesPage: Updating category:", updatedCategory);
      await dispatch(
        updateCategory({
          id: updatedCategory.id.toString(),
          ...updatedCategory,
        })
      ).unwrap();
      setIsEditCategoryOpen(false);
      dispatch(clearCurrentCategory());
      toast.success("Category updated successfully");
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleDeleteCategory = async (categoryId: string): Promise<void> => {
    try {
      const categoryToDelete = categories.find((cat) => cat.id === categoryId);

      if (categoryToDelete && categoryToDelete.productsCount > 0) {
        toast.error(
          "Cannot delete a category with products. Please remove or reassign products first."
        );
        return;
      }

      console.log("🚀 CategoriesPage: Deleting category:", categoryId);
      await dispatch(deleteCategory(categoryId.toString())).unwrap();
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const handleStatusChange = async (
    categoryId: string,
    newStatus: boolean
  ): Promise<void> => {
    try {
      console.log("🚀 CategoriesPage: Updating category status:", {
        categoryId,
        newStatus,
      });
      await dispatch(
        updateCategoryStatus({
          id: categoryId.toString(),
          status: newStatus ? "ACTIVE" : "INACTIVE",
        })
      ).unwrap();
      toast.success(
        `Category ${newStatus ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error("Error updating category status:", error);
    }
  };

  const handleSort = (key: keyof Category): void => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleEditClick = (category: Category): void => {
    console.log("🚀 CategoriesPage: Editing category:", category);
    dispatch(setCurrentCategory(category));
    setIsEditCategoryOpen(true);
  };

  const handleCloseEditDialog = (): void => {
    setIsEditCategoryOpen(false);
    dispatch(clearCurrentCategory());
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">Manage product categories</p>
      </div>

      <div className="flex flex-col space-y-4">
        <Card className="shadow-md border-gray-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg md:text-2xl">
                Product Categories
              </CardTitle>
              <Dialog
                open={isAddCategoryOpen}
                onOpenChange={setIsAddCategoryOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                    disabled={creating}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{creating ? "Adding..." : "Add Category"}</span>
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
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CategoryTable
              categories={categories}
              loading={loading || deleting}
              searchQuery={searchQuery}
              sortConfig={sortConfig}
              onSort={handleSort}
              onEdit={handleEditClick}
              onDelete={handleDeleteCategory}
              onStatusChange={handleStatusChange}
              // Fix the pagination props to match your API response format
              currentPage={pagination?.page || 1} // Use 'page' instead of 'currentPage'
              totalPages={pagination?.pages || 1} // Use 'pages' instead of 'totalPages'
              onPageChange={(page) => {
                dispatch(
                  fetchCategories({
                    search: searchQuery || undefined,
                    sortBy: sortConfig.key,
                    sortOrder: sortConfig.direction,
                    page: page,
                    limit: 10,
                  })
                );
              }}
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
        loading={creating}
      />

      {/* Edit Category Form */}
      <CategoryForm
        category={currentCategory || undefined}
        isOpen={isEditCategoryOpen}
        onClose={handleCloseEditDialog}
        onSubmit={(category) => {
          // Only proceed if category is a full Category (not NewCategory)
          if ("id" in category) {
            handleEditCategory(category);
          }
        }}
        mode="edit"
        loading={updating}
      />
    </div>
  );
}
