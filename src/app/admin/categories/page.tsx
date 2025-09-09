// pages/CategoriesPage.tsx
"use client";

import React, { useEffect } from "react";
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
import { Category, CategoryStatus, CreateCategoryData, NewCategory, SortConfig } from "@/types/categories";
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
  deleteCategoryImage,
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
  const [isAddCategoryOpen, setIsAddCategoryOpen] =
    React.useState<boolean>(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] =
    React.useState<boolean>(false);
  const [sortConfig, setSortConfig] = React.useState<SortConfig>({
    key: "name",
    direction: "asc",
  });

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
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig.key, sortConfig.direction, dispatch]);

  // Handle search query changes with ref to avoid dependency issues
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
     // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
      // Helper function to prepare category data for creation (API format)
      const prepareCategoryForCreate = (cat: Category | NewCategory): CreateCategoryData => ({
        name: cat.name,
        // slug: cat.slug,
        description: cat.description ?? undefined,
        image: null, // Always null initially for API
        status: cat.status || CategoryStatus.ACTIVE,
      });
  
      // Type-safe check for File objects
      const hasImageFile = category.image instanceof File;
  
      if (hasImageFile) {
        // Create category without image first
        const categoryForCreate = prepareCategoryForCreate(category);
  
        let createdCategory: Category | undefined;
        let uploadResult: { url: string; category: Category };
  
        try {
          // Step 1: Create category without image
          createdCategory = await dispatch(
            createCategory(categoryForCreate)
          ).unwrap();
  
          // Step 2: Upload image to the created category
          if (!createdCategory) {
            throw new Error("Failed to create category");
          }
  
          uploadResult = await dispatch(
            uploadCategoryImages({
              categoryId: createdCategory.id.toString(),
              files: [category.image as File], // Now TypeScript knows this is a File
            })
          ).unwrap();
  
          // Step 3: Update category with image URL
          await dispatch(
            updateCategory({
              id: createdCategory.id.toString(),
              name: createdCategory.name,
              description: createdCategory.description ?? undefined,
              image: uploadResult.url,
              status: createdCategory.status,
              createdAt: createdCategory.createdAt,
              updatedAt: createdCategory.updatedAt,
              productsCount: createdCategory.productsCount,
            })
          ).unwrap();
  
        } catch (uploadError) {
          // If image upload or update fails after category creation,
          // we could optionally clean up the created category
          console.error("Error during image upload process:", uploadError);
          
          // Option 1: Leave category without image
          if (createdCategory) {
            console.warn("Category created but image upload failed:", createdCategory.id);
          }
          
          // Option 2: Delete the created category (uncomment if needed)
          // if (createdCategory) {
          //   try {
          //     await dispatch(deleteCategory(createdCategory.id.toString())).unwrap();
          //     console.log("Cleaned up category after image upload failure");
          //   } catch (cleanupError) {
          //     console.error("Failed to cleanup category:", cleanupError);
          //   }
          // }
          
          throw new Error("Failed to upload category image");
        }
      } else {
        // No image file, create category directly
        // Handle string URLs or null values
        const categoryForCreate: CreateCategoryData = {
          ...prepareCategoryForCreate(category),
          image: typeof category.image === 'string' ? category.image : null,
        };
        await dispatch(createCategory(categoryForCreate)).unwrap();
      }
  
      // Success: Close modal and show success message
      setIsAddCategoryOpen(false);
      toast.success("Category added successfully");
      
    } catch (error) {
      console.error("Error adding category:", error);
      
      // More specific error messages based on error type
      if (error instanceof Error) {
        toast.error(error.message || "Failed to add category. Please try again.");
      } else {
        toast.error("Failed to add category. Please try again.");
      }
      
      // Don't close modal on error so user can retry
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
          name: updatedCategory.name,
          description: updatedCategory.description ?? undefined,
          image: updatedCategory.image ?? undefined,
          status: updatedCategory.status,
          createdAt: updatedCategory.createdAt,
          updatedAt: updatedCategory.updatedAt,
          productsCount: updatedCategory.productsCount,
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

      // Delete category image first (if it exists)
      try {
        await dispatch(
          deleteCategoryImage({
            categoryId: categoryId.toString(),
          })
        ).unwrap();
      } catch (imageError) {
        // Log but don't fail the entire operation if image deletion fails
        console.warn("Failed to delete category image:", imageError);
      }

      console.log("🚀 CategoriesPage: Deleting category:", categoryId);

      // Delete the category
      await dispatch(deleteCategory(categoryId.toString())).unwrap();
      toast.success("Category deleted successfully");
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category. Please try again.");
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
    <div className="min-h-screen bg-gray-50/50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Section - Mobile Optimized */}
        <div className="space-y-2 sm:space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900">
            Categories
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage product categories
          </p>
        </div>

        {/* Main Content Card */}
        <Card className="shadow-sm sm:shadow-md border-gray-200 bg-white">
          <CardHeader className="pb-3 sm:pb-4 px-3 sm:px-6">
            {/* Card Header - Mobile Stacked Layout */}
            <div className="space-y-3 sm:space-y-4">
              {/* Title and Add Button Row */}
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl text-gray-900">
                    Product Categories
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Organize your products with categories
                  </CardDescription>
                </div>
                
                {/* Add Category Button - Full width on mobile */}
                <Dialog
                  open={isAddCategoryOpen}
                  onOpenChange={setIsAddCategoryOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/30 transform hover:scale-[1.02]"
                      disabled={creating}
                    >
                      <Plus className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {creating ? "Adding..." : "Add Category"}
                      </span>
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>

              {/* Search Bar - Full width */}
              <div className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search categories..."
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          
          {/* Card Content - Responsive Padding */}
          <CardContent className="px-0 sm:px-6 pb-6">
            <div className="w-full overflow-hidden p-2 md:p-2">
              <CategoryTable
                categories={categories}
                loading={loading || deleting}
                searchQuery={searchQuery}
                sortConfig={sortConfig}
                onSort={handleSort}
                onEdit={handleEditClick}
                onDelete={handleDeleteCategory}
                onStatusChange={handleStatusChange}
                currentPage={pagination?.page || 1}
                totalPages={pagination?.pages || 1}
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
            </div>
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