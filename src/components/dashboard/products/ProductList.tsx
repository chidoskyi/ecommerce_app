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
  PriceType,
  Product,
  // ProductFilters as ProductFiltersType,
  ProductFormState,
  UpdateProductData,
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
import { ProductStatus } from "@prisma/client";

export function ProductList() {
  const dispatch = useAppDispatch();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Refetch products when filters change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      dispatch(fetchProducts(filters));
    }, 500);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        imagesToDelete: `${
          apiData.imagesToDelete?.length || 0
        } images to delete`,
      });

      // First, handle image deletions if there are any images to delete
      if (apiData.imagesToDelete && apiData.imagesToDelete.length > 0) {
        console.log(`🗑️ Deleting ${apiData.imagesToDelete.length} images`);

        const imageDeletionPromises = apiData.imagesToDelete.map(
          (imageUrl: string) =>
            dispatch(
              deleteProductImage({
                productId: selectedProduct.id!,
                imageUrl, // This expects imageUrl, which is correct
              })
            ).unwrap()
        );

        // Wait for all images to be deleted
        await Promise.allSettled(imageDeletionPromises);
        console.log("✅ Images deleted successfully");
      }

      // Prepare product data without files for update
      const productDataWithoutFiles = { ...apiData };
      delete productDataWithoutFiles.newImageFiles;
      delete productDataWithoutFiles.imagesToDelete;

      // Convert null values to undefined for UpdateProductData
      const updateData: UpdateProductData = {
        ...productDataWithoutFiles,
        description: productDataWithoutFiles.description ?? undefined,
        weight: productDataWithoutFiles.weight ?? undefined,
        unitPrices: productDataWithoutFiles.unitPrices ?? undefined,
        categoryId: productDataWithoutFiles.categoryId ?? undefined,
      };

      // Update the product data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await dispatch(
        updateProduct({
          id: selectedProduct.id!,
          productData: updateData,
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
            productId: selectedProduct.id!,
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
    let productToDelete; // Declare variable outside try block

    try {
      productToDelete = products.find((p) => p.id === productId);

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
        // Get the actual product objects for deletion
        const productsToDelete = products.filter((p) =>
          selectedProducts.includes(p.id!)
        );

        // First, delete all images for all selected products
        const allImagesToDelete = productsToDelete.flatMap(
          (product) => product.images || []
        );

        if (allImagesToDelete.length > 0) {
          console.log(
            `🗑️ Deleting ${allImagesToDelete.length} images before product deletion`
          );

          // Create promises for all image deletions across all products
          const imageDeletionPromises = allImagesToDelete.map((imageUrl) => {
            // Find which product this image belongs to
            const product = productsToDelete.find((p) =>
              p.images?.includes(imageUrl)
            );
            return dispatch(
              deleteProductImage({
                productId: product?.id || "", // Use the product ID
                imageUrl,
              })
            ).unwrap();
          });

          // Wait for all images to be deleted
          await Promise.allSettled(imageDeletionPromises);
        }

        // Optimistic update for all products
        selectedProducts.forEach((id) => {
          dispatch(removeProductOptimistic(id));
        });

        // Delete all products
        await Promise.all(
          selectedProducts.map((id) => dispatch(deleteProduct(id)).unwrap())
        );

        toast.success(`${selectedProducts.length} products deleted`);
      } else {
        const validStatus = action.toUpperCase() as "ACTIVE" | "INACTIVE";

        // Optimistic update for status changes
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
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    dispatch(
      updateFilters({
        sortBy: key,
        sortOrder: direction,
      })
    );
  };

  const handleSelectAllProducts = (
    checked: boolean,
    currentProducts: Product[]
  ) => {
    if (checked) {
      setSelectedProducts(currentProducts.map((product) => product.id!));
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

    const statusMap: Record<string, ProductStatus | undefined> = {
      all: undefined,
      active: "ACTIVE",
      inactive: "INACTIVE",
      featured: undefined,
    };

    if (tab === "featured") {
      dispatch(
        updateFilters({
          featured: "true",
          status: undefined, // Use undefined instead of ""
          page: 1,
        })
      );
    } else {
      dispatch(
        updateFilters({
          status: statusMap[tab], // This will be undefined for 'all' and 'featured'
          featured: undefined, // Use undefined instead of ""
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
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header Section - Mobile Optimized */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Products
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          <span className="block sm:inline">
            Manage your product inventory ({productStats.total} total,{" "}
          </span>
          <span className="block sm:inline">
            {productStats.active} active, {productStats.inactive} inactive)
          </span>
        </p>
      </div>

      {/* Main Content Card - Mobile Optimized */}
      <div className="flex flex-col space-y-4">
        <Card className="border-gray-400 shadow-md">
          <CardHeader className="pb-3 px-4 md:px-6">
            {/* Header with Actions - Mobile Stack */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-lg md:text-xl">
                  Product Inventory
                </CardTitle>
                <CardDescription className="text-sm">
                  View and manage your product inventory
                </CardDescription>
              </div>

              {/* Product Actions - Mobile Optimized */}
              <div className="flex-shrink-0">
                <ProductActions
                  selectedProducts={selectedProducts}
                  onBulkAction={handleBulkAction}
                  disabled={updateLoading || deleteLoading}
                />
              </div>
            </div>

            {/* Filters - Mobile Optimized */}
            <div className="pt-4">
              <ProductFilters
                searchQuery={filters.search || ""}
                setSearchQuery={handleSearchChange}
                filters={{
                  status:
                    (filters.status?.toUpperCase() as ProductStatus) ||
                    undefined,
                  category: filters.category || "all",
                  price:
                    filters.minPrice && filters.maxPrice
                      ? `${filters.minPrice}-${filters.maxPrice}`
                      : filters.minPrice
                      ? `${filters.minPrice}+`
                      : filters.maxPrice
                      ? `-${filters.maxPrice}`
                      : "",
                  priceType:
                    (filters.priceType?.toLowerCase() as PriceType) || "all",
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
            </div>
          </CardHeader>

          {/* Table Content - Mobile Optimized Padding */}
          <CardContent className="px-2 md:px-6 ">
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

      {/* Edit Product Dialog - Mobile Optimized */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="w-[95vw] max-w-3xl h-[95vh] md:max-h-[90vh] overflow-y-auto mx-2 md:mx-auto">
          <ProductForm
            mode="edit"
            product={selectedProduct || undefined}
            loading={loading} // Add the required loading prop
            onSuccess={handleFormSuccess}
            onError={handleFormError}
            onCancel={() => {
              setIsEditProductOpen(false);
              dispatch(clearSelectedProduct());
              setProductFormState(null);
            }}
            onProductChange={(formState) => {
              // Store the form state for submission
              setProductFormState(formState);

              // Only proceed if selectedProduct exists
              if (!selectedProduct) return;

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
                ...selectedProduct,
                name: formState.name,
                description: formState.description ?? null, // Convert undefined to null
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
            onEditProduct={handleEditProduct}
          />
        </DialogContent>
      </Dialog>

      {/* View Product Dialog - Mobile Optimized */}
      <Dialog open={isViewProductOpen} onOpenChange={setIsViewProductOpen}>
        <DialogContent className="w-[95vw] max-w-4xl h-[95vh] md:max-h-[90vh] overflow-y-auto mx-2 md:mx-auto">
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
                handleDeleteProduct(selectedProduct.id!);
              }}
              onStatusChange={(newStatus) =>
                handleStatusChange(selectedProduct.id!, newStatus)
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
