"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductTable } from "./ProductTable";
import { ProductFilters } from "@/components/dashboard/products/ProductFilters";
import { ProductActions } from "@/components/dashboard/products/ProductAction";
import { ProductForm } from "@/components/dashboard/products/ProductForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "react-toastify";
import { ProductViewDialog } from "@/components/dashboard/products/ProductViewDialog";
import {
  formStateToApiData,
  Product,
  ProductFilters as ProductFiltersType,
  ProductFormState,
} from "@/types/products";

import {
  fetchProducts,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  updateFilters,
  clearFilters,
  setSelectedProduct,
  clearSelectedProduct,
  clearError,
  selectProducts,
  selectPagination,
  selectFilters,
  selectLoading,
  selectError,
  selectSelectedProduct,
  selectUpdateLoading,
  selectDeleteLoading,
  selectProductStats,
  removeProductOptimistic,
  updateProductOptimistic,
  selectCategories,
  fetchCategories,
  deleteProductImage,
  uploadProductImages,
  addProductOptimistic,
} from "@/app/store/slices/adminProductsSlice";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";

export function ProductList() {
  const dispatch = useAppDispatch();

  // Redux selectors
  // Redux selectors
  const products = useAppSelector(selectProducts);
  const pagination = useAppSelector(selectPagination);
  const filters = useAppSelector(selectFilters);
  const loading = useAppSelector(selectLoading);
  const error = useAppSelector(selectError);
  const selectedProduct = useAppSelector(selectSelectedProduct);
  const updateLoading = useAppSelector(selectUpdateLoading);
  const deleteLoading = useAppSelector(selectDeleteLoading);
  const productStats = useAppSelector(selectProductStats);
  const categories = useAppSelector(selectCategories);

  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isViewProductOpen, setIsViewProductOpen] = useState(false);
  const [productFormState, setProductFormState] =
    useState<ProductFormState | null>(null);
  const [sortConfig, setSortConfig] = useState({
    key: filters.sortBy || "name",
    direction: filters.sortOrder || "asc",
  });
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch products and categories on component mount
  useEffect(() => {
    dispatch(fetchProducts(filters));
    dispatch(fetchCategories());
  }, [dispatch]);

  // Refetch products when filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(fetchProducts(filters));
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [
    dispatch,
    filters.search,
    filters.category,
    filters.status,
    filters.minPrice,
    filters.maxPrice,
  ]);

  // Immediate refetch for pagination and sorting
  useEffect(() => {
    dispatch(fetchProducts(filters));
  }, [
    dispatch,
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortOrder,
  ]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleEditProduct = async () => {
    try {
      if (!selectedProduct || !productFormState) return;

      // Use the formStateToApiData function to convert the form data
      const apiData = formStateToApiData(productFormState);

      console.log("📤 Sending update data:", {
        ...apiData,
        images: `${apiData.images?.length || 0} existing URLs`,
        newImageFiles: `${
          apiData.newImageFiles?.length || 0
        } new files to upload`,
      });

      // First update the product with existing image URLs
      const productDataWithoutFiles = { ...apiData };
      delete productDataWithoutFiles.newImageFiles;

      const result = await dispatch(
        updateProduct({
          id: selectedProduct.id,
          productData: productDataWithoutFiles,
        })
      ).unwrap();

      console.log("✅ Product updated, now handling new images");

      // Handle new image uploads if there are any new files
      if (apiData.newImageFiles && apiData.newImageFiles.length > 0) {
        console.log(
          `📤 Uploading ${apiData.newImageFiles.length} new images for product ${selectedProduct.id}`
        );
        await dispatch(
          uploadProductImages({
            productId: selectedProduct.id,
            files: apiData.newImageFiles,
          })
        ).unwrap();
        console.log("✅ New images uploaded successfully");
      }

      toast.success("Product updated successfully");
      setIsEditProductOpen(false);
      dispatch(clearSelectedProduct());
      setProductFormState(null); // Clear the form state

      // Refresh the products list to get the latest data
      dispatch(fetchProducts(filters));
    } catch (error) {
      // Revert optimistic update
      dispatch(fetchProducts(filters));
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const productToDelete = products.find((p) => p.id === productId);

      // First, delete all images using the separate endpoint
      if (productToDelete?.images && productToDelete.images.length > 0) {
        console.log(
          `🗑️ Deleting ${productToDelete.images.length} images before product deletion`
        );

        // Delete each image using the separate endpoint
        const imageDeletionPromises = productToDelete.images.map((imageUrl) =>
          dispatch(
            deleteProductImage({
              productId,
              imageUrl,
            })
          ).unwrap()
        );

        // Wait for all images to be deleted (or at least attempted)
        await Promise.allSettled(imageDeletionPromises);
      }

      // Then delete the product itself
      dispatch(removeProductOptimistic(productId)); // Optimistic update
      await dispatch(deleteProduct(productId)).unwrap();

      setSelectedProducts((prev) => prev.filter((id) => id !== productId));
      // Refresh products list
      await dispatch(fetchProducts({})).unwrap();
      toast.success("Product deleted successfully");
    } catch (error) {
      if (productToDelete) {
        dispatch(addProductOptimistic(productToDelete));
      }
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      const validStatus = newStatus.toUpperCase() as "ACTIVE" | "INACTIVE";

      const updatedProduct = { ...product, status: validStatus };
      dispatch(updateProductOptimistic(updatedProduct));

      await dispatch(
        updateProductStatus({
          id: productId,
          status: validStatus,
        })
      ).unwrap();

      toast.success(`Product status updated to ${newStatus}`);
    } catch (error) {
      dispatch(fetchProducts(filters));
      console.error("Error updating product status:", error);
      toast.error("Failed to update product status");
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedProducts.length === 0) {
      toast.warning("No products selected");
      return;
    }

    try {
      if (action === "delete") {
        selectedProducts.forEach((id) => {
          dispatch(removeProductOptimistic(id));
        });

        // First, delete all images using the separate endpoint
        if (selectedProducts?.images && selectedProducts.images.length > 0) {
          console.log(
            `🗑️ Deleting ${selectedProducts.images.length} images before product deletion`
          );

          // Delete each image using the separate endpoint
          const imageDeletionPromises = selectedProducts.images.map(
            (imageUrl) =>
              dispatch(
                deleteProductImage({
                  productId,
                  imageUrl,
                })
              ).unwrap()
          );

          // Wait for all images to be deleted (or at least attempted)
          await Promise.allSettled(imageDeletionPromises);
        }

        await Promise.all(
          selectedProducts.map((id) => dispatch(deleteProduct(id)).unwrap())
        );
                        // Refresh products list
                        await dispatch(fetchProducts({})).unwrap();
        toast.success(`${selectedProducts.length} products deleted`);
      } else {
        const validStatus = action.toUpperCase() as "ACTIVE" | "INACTIVE";

        selectedProducts.forEach((id) => {
          const product = products.find((p) => p.id === id);
          if (product) {
            const updatedProduct = { ...product, status: validStatus };
            dispatch(updateProductOptimistic(updatedProduct));
          }
        });

        await Promise.all(
          selectedProducts.map((id) =>
            dispatch(updateProductStatus({ id, status: validStatus })).unwrap()
          )
        );
        toast.success(
          `${selectedProducts.length} products updated to ${validStatus}`
        );
      }
      // Refresh products list
      await dispatch(fetchProducts({})).unwrap();
      setSelectedProducts([]);
    } catch (error) {
      dispatch(fetchProducts(filters));
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  const handleSort = (key: string) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    dispatch(
      updateFilters({
        sortBy: key as any,
        sortOrder: direction as "asc" | "desc",
      })
    );
  };

  const handleSelectAllProducts = (
    checked: boolean,
    currentProducts: Product[]
  ) => {
    if (checked) {
      setSelectedProducts(currentProducts.map((product) => product.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === "category") {
      dispatch(
        updateFilters({
          category: value === "all" ? "" : value,
          page: 1,
        })
      );
    } else {
      dispatch(
        updateFilters({
          [key]: value,
          page: 1,
        })
      );
    }
  };

  const handlePriceFilterChange = (key: string, value: string) => {
    dispatch(
      updateFilters({
        [key === "min" ? "minPrice" : "maxPrice"]: value,
        page: 1,
      })
    );
  };

  const resetFilters = () => {
    dispatch(clearFilters());
    setActiveTab("all");
    setSelectedProducts([]);
  };

  const handleSearchChange = (query: string) => {
    dispatch(
      updateFilters({
        search: query,
        page: 1,
      })
    );
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedProducts([]);

    const statusMap: Record<string, string> = {
      all: "",
      active: "ACTIVE",
      inactive: "INACTIVE",
      featured: "",
    };

    if (tab === "featured") {
      dispatch(
        updateFilters({
          featured: "true",
          status: "",
          page: 1,
        })
      );
    } else {
      dispatch(
        updateFilters({
          status: statusMap[tab] || "",
          featured: "",
          page: 1,
        })
      );
    }
  };

  const handlePaginate = (pageNumber: number) => {
    dispatch(updateFilters({ page: pageNumber }));
    setSelectedProducts([]);
  };

  // Handle successful form operations
  const handleFormSuccess = () => {
    setIsEditProductOpen(false);
    dispatch(clearSelectedProduct());
    // ProductForm already refreshes the list internally
  };

  const handleFormError = (error: string) => {
    console.error("Form error:", error);
    // Error toast is already shown by ProductForm
  };

  const displayProducts = products || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Manage your product inventory ({productStats.total} total,{" "}
          {productStats.active} active, {productStats.inactive} inactive)
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <Card className="border-gray-400 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Product Inventory</CardTitle>
              <ProductActions
                selectedProducts={selectedProducts}
                onBulkAction={handleBulkAction}
                disabled={updateLoading || deleteLoading}
              />
            </div>
            <CardDescription>
              View and manage your product inventory
            </CardDescription>

            <ProductFilters
              searchQuery={filters.search || ""}
              setSearchQuery={handleSearchChange}
              filters={{
                status: filters.status?.toLowerCase() || "all",
                category: filters.category || "all",
                price: {
                  min: filters.minPrice || "",
                  max: filters.maxPrice || "",
                },
                priceType: filters.priceType?.toLowerCase() || "all",
              }}
              categories={categories}
              products={products}
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              onFilterChange={handleFilterChange}
              onPriceFilterChange={handlePriceFilterChange}
              onResetFilters={resetFilters}
              productStats={productStats}
            />
          </CardHeader>

          <CardContent>
            <ProductTable
              products={displayProducts}
              categories={categories}
              loading={loading}
              selectedProducts={selectedProducts}
              sortConfig={sortConfig}
              currentPage={pagination.page}
              totalPages={pagination.pages}
              searchQuery={filters.search || ""}
              filters={{
                status: filters.status?.toLowerCase() || "all",
                category: filters.category || "all",
                stock: "all",
                price: {
                  min: filters.minPrice || "",
                  max: filters.maxPrice || "",
                },
              }}
              onSort={handleSort}
              onSelectAll={handleSelectAllProducts}
              onSelectProduct={handleSelectProduct}
              onEdit={(product) => {
                dispatch(setSelectedProduct(product));
                setIsEditProductOpen(true);
              }}
              onView={(product) => {
                dispatch(setSelectedProduct(product));
                setIsViewProductOpen(true);
              }}
              onDelete={handleDeleteProduct}
              onStatusChange={handleStatusChange}
              onPaginate={handlePaginate}
              onResetFilters={resetFilters}
              bulkActionLoading={updateLoading || deleteLoading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Product Dialog - Now only handles edit mode */}
      {/* Edit Product Dialog - Now only handles edit mode */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <ProductForm
            mode="edit"
            product={selectedProduct}
            onSuccess={handleFormSuccess}
            onError={handleFormError}
            onCancel={() => {
              setIsEditProductOpen(false);
              dispatch(clearSelectedProduct());
              setProductFormState(null); // Reset form state on cancel
            }}
            onProductChange={(formState) => {
              // Store the form state for submission
              setProductFormState(formState);

              // Convert form state back to product for live updates (display only)
              const imageUrls = formState.images
                .map((img) => {
                  if (typeof img === "string") return img;
                  if (img?.url) return img.url;
                  if (img?.previewUrl) return img.previewUrl;
                  return "";
                })
                .filter((url) => url !== "");

              const priceType = formState.hasFixedPrice ? "FIXED" : "VARIABLE";

              const updatedProduct: Product = {
                ...selectedProduct!,
                name: formState.name,
                description: formState.description,
                hasFixedPrice: formState.hasFixedPrice,
                priceType: priceType,
                fixedPrice: Number(formState.fixedPrice),
                unitPrices: formState.unitPrices.map((up) => ({
                  unit: up.unit,
                  price: Number(up.price),
                })),
                sku: formState.sku,
                categoryId: formState.categoryId
                  ? String(formState.categoryId)
                  : null,
                status: formState.status as "ACTIVE" | "INACTIVE",
                isFeatured: formState.isFeatured,
                isTrending: formState.isTrending,
                isDealOfTheDay: formState.isDealOfTheDay,
                isNewArrival: formState.isNewArrival,
                isFruit: formState.isFruit,
                isVegetable: formState.isVegetable,
                images: imageUrls,
                weight: formState.weight ? String(formState.weight) : null,
              };
              dispatch(setSelectedProduct(updatedProduct));
            }}
            onEditProduct={handleEditProduct} // Pass the edit handler
          />
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={isViewProductOpen} onOpenChange={setIsViewProductOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <ProductViewDialog
              product={selectedProduct}
              categories={categories}
              onEdit={() => {
                setIsViewProductOpen(false);
                setIsEditProductOpen(true);
              }}
              onDelete={() => {
                setIsViewProductOpen(false);
                handleDeleteProduct(selectedProduct.id);
              }}
              onStatusChange={(newStatus) =>
                handleStatusChange(selectedProduct.id, newStatus)
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
