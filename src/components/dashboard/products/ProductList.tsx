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
import { productsData } from "@/data/products";
import { categoriesData } from "@/data/categories";
import { ProductViewDialog } from "@/components/dashboard/products/ProductViewDialog";
import { Product, Category } from "@/lib/types";
import type { ProductFormState } from "./ProductForm";

// Conversion function
function formStateToProduct(form: ProductFormState, original?: Product): Product {
  return {
    id: original?.id ?? Date.now(),
    name: form.name,
    description: form.description,
    hasFixedPrice: form.hasFixedPrice,
    priceType: form.priceType,
    fixedPrice: parseFloat(form.fixedPrice) || 0,
    unitPrices: form.unitPrices.map((u: { unit: string; price: string }) => ({ unit: u.unit, price: parseFloat(u.price) || 0 })),
    inStock: parseInt(form.quantity) > 0,
    compareAtPrice: parseFloat(form.compareAtPrice) || 0,
    cost: parseFloat(form.cost) || 0,
    sku: form.sku,
    quantity: parseInt(form.quantity) || 0,
    categoryId: form.categoryId ? parseInt(form.categoryId) : null,
    status: form.status,
    isFeatured: form.isFeatured,
    isTrending: form.isTrending,
    isDealOfTheDay: form.isDealOfTheDay,
    isNewArrival: form.isNewArrival,
    rating: original?.rating ?? null,
    images: form.images,
    weight: form.weight,
    dimensions: form.dimensions,
    createdAt: original?.createdAt ?? form.createdAt,
    updatedAt: new Date().toISOString(),
  };
}

export function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isViewProductOpen, setIsViewProductOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    status: "all",
    category: "all",
    stock: "all",
    price: { min: "", max: "" },
    priceType: "all",
  });
  const [activeTab, setActiveTab] = useState("all");

  // Fetch products and categories on component mount
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      setProducts((productsData as any[]).map((p) => ({
        hasFixedPrice: typeof p.hasFixedPrice === 'boolean' ? p.hasFixedPrice : true,
        priceType: p.priceType === 'fixed' || p.priceType === 'variable' ? p.priceType : 'fixed',
        fixedPrice: typeof p.fixedPrice === 'number' ? p.fixedPrice : 0,
        unitPrices: Array.isArray(p.unitPrices) ? p.unitPrices : [],
        inStock: typeof p.inStock === 'boolean' ? p.inStock : true,
        compareAtPrice: typeof p.compareAtPrice === 'number' ? p.compareAtPrice : 0,
        cost: typeof p.cost === 'number' ? p.cost : 0,
        sku: typeof p.sku === 'string' ? p.sku : '',
        quantity: typeof p.quantity === 'number' ? p.quantity : 0,
        categoryId: typeof p.categoryId === 'number' ? p.categoryId : null,
        status: (p.status === 'active' || p.status === 'draft' || p.status === 'out_of_stock') ? p.status as 'active' | 'draft' | 'out_of_stock' : 'active',
        isFeatured: typeof p.isFeatured === 'boolean' ? p.isFeatured : false,
        isTrending: typeof p.isTrending === 'boolean' ? p.isTrending : false,
        isDealOfTheDay: typeof p.isDealOfTheDay === 'boolean' ? p.isDealOfTheDay : false,
        isNewArrival: typeof p.isNewArrival === 'boolean' ? p.isNewArrival : false,
        rating: typeof p.rating === 'number' ? p.rating : null,
        images: Array.isArray(p.images) ? p.images : [],
        weight: typeof p.weight === 'string' ? p.weight : '',
        dimensions: typeof p.dimensions === 'string' ? p.dimensions : '',
        createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date().toISOString(),
        updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
        ...p,
      })));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategories((categoriesData as any[]).map((c) => ({
        productsCount: typeof c.productsCount === 'number' ? c.productsCount : 0,
        status: (c.status === 'active' || c.status === 'inactive') ? c.status as 'active' | 'inactive' : 'active',
        createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
        updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : new Date().toISOString(),
        ...c,
      })));
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
    toast.success("Product added successfully");
    setIsEditProductOpen(false);
    setCurrentProduct(null);
  };

  const handleEditProduct = async () => {
    try {
      if (!currentProduct) return;
      const updatedProducts = products.map((product) =>
        product.id === currentProduct.id ? currentProduct : product
      );
      setProducts(updatedProducts);
      setIsEditProductOpen(false);
      setCurrentProduct(null);
      toast.success("Product updated successfully");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      const updatedProducts = products.filter(
        (product) => product.id !== productId
      );
      setProducts(updatedProducts);
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleStatusChange = async (productId: number, newStatus: string) => {
    try {
      const updatedProducts = products.map((product) =>
        product.id === productId
          ? {
              ...product,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            }
          : product
      );
      setProducts(updatedProducts);
      toast.success(`Product status updated to ${newStatus}`);
    } catch (error) {
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
      let updatedProducts = [...products];
      const now = new Date().toISOString();

      if (action === "delete") {
        updatedProducts = products.filter(
          (product) => !selectedProducts.includes(product.id)
        );
        toast.success(`${selectedProducts.length} products deleted`);
      } else {
        const validStatus = (action === 'active' || action === 'draft' || action === 'out_of_stock') ? action : 'active';
        updatedProducts = products.map((product) =>
          selectedProducts.includes(product.id)
            ? { ...product, status: validStatus, updatedAt: now }
            : product
        );
        toast.success(
          `${selectedProducts.length} products updated to ${validStatus}`
        );
      }

      setProducts(updatedProducts);
      setSelectedProducts([]);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  // const handleDuplicateProduct = (product) => {
  //   const duplicatedProduct = {
  //     ...product,
  //     id: products.length + 1,
  //     name: `${product.name} (Copy)`,
  //     sku: `${product.sku}-COPY`,
  //     barcode: product.barcode ? `${product.barcode}-COPY` : null,
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //   };
  //   // setProducts([...products, duplicatedProduct]);
  //   toast.success("Product duplicated successfully");
  // };

  const handleSort = (key: string) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Change the handler signature to match the boolean value
  const handleSelectAllProducts = (checked: boolean, currentProducts: Product[]) => {
    if (checked) {
      setSelectedProducts(currentProducts.map((product) => product.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: number) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1);
  };

  const handlePriceFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      price: {
        ...prev.price,
        [key]: value,
      },
    }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      status: "all",
      category: "all",
      stock: "all",
      price: { min: "", max: "" },
      priceType: "all",
    });
    setCurrentPage(1);
  };

  // Filter products based on search query, status, category, stock, and price
  const filterProducts = () => {
    return products.filter((product) => {
      const searchMatch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description &&
          product.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const tabMatch =
        activeTab === "all" ||
        (activeTab === "active" && product.status === "active") ||
        (activeTab === "draft" && product.status === "draft") ||
        (activeTab === "out_of_stock" && product.status === "out_of_stock") ||
        (activeTab === "featured" && product.isFeatured);

      const statusMatch =
        filters.status === "all" || product.status === filters.status;
      const categoryMatch =
        filters.category === "all" ||
        (typeof product.categoryId === 'number' && product.categoryId === Number.parseInt(filters.category));

      const stockMatch =
        filters.stock === "all" ||
        (filters.stock === "in_stock" && product.quantity > 0) ||
        (filters.stock === "low_stock" &&
          product.quantity > 0 &&
          product.quantity <= 10) ||
        (filters.stock === "out_of_stock" && product.quantity === 0);

      const priceTypeMatch =
        !filters.priceType || filters.priceType === "all" || product.priceType === filters.priceType;

      let priceMatch = true;
      if (filters.price.min && !isNaN(Number(filters.price.min))) {
        if (filters.priceType === "variable" || (filters.priceType === "all" && product.priceType === "variable")) {
          // For variable, check if any unitPrice is >= min
          priceMatch =
            priceMatch &&
            product.unitPrices &&
            product.unitPrices.some((u) => u.price >= Number.parseFloat(filters.price.min));
        } else {
          priceMatch =
            priceMatch && product.fixedPrice >= Number.parseFloat(filters.price.min);
        }
      }
      if (filters.price.max && !isNaN(Number(filters.price.max))) {
        if (filters.priceType === "variable" || (filters.priceType === "all" && product.priceType === "variable")) {
          // For variable, check if any unitPrice is <= max
          priceMatch =
            priceMatch &&
            product.unitPrices &&
            product.unitPrices.some((u) => u.price <= Number.parseFloat(filters.price.max));
        } else {
          priceMatch =
            priceMatch && product.fixedPrice <= Number.parseFloat(filters.price.max);
        }
      }

      return (
        searchMatch &&
        tabMatch &&
        statusMatch &&
        categoryMatch &&
        stockMatch &&
        priceTypeMatch &&
        priceMatch
      );
    });
  };

  const filteredProducts = filterProducts();

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortConfig.key === "name") {
      return sortConfig.direction === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    if (sortConfig.key === "price") {
      const aPrice = typeof a.fixedPrice === 'number' ? a.fixedPrice : 0;
      const bPrice = typeof b.fixedPrice === 'number' ? b.fixedPrice : 0;
      return sortConfig.direction === "asc"
        ? aPrice - bPrice
        : bPrice - aPrice;
    }
    if (sortConfig.key === "quantity") {
      return sortConfig.direction === "asc"
        ? a.quantity - b.quantity
        : b.quantity - a.quantity;
    }
    if (sortConfig.key === "updatedAt") {
      return sortConfig.direction === "asc"
        ? new Date(a.updatedAt) - new Date(b.updatedAt)
        : new Date(b.updatedAt) - new Date(a.updatedAt);
    }
    return 0;
  });

  // Pagination
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Manage your product inventory</p>
      </div>

      <div className="flex flex-col space-y-4 ">
        <Card className=" border-gray-400 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Product Inventory</CardTitle>
              <ProductActions
                selectedProducts={selectedProducts}
                onBulkAction={handleBulkAction}
              />
            </div>
            <CardDescription>
              View and manage your product inventory
            </CardDescription>

            <ProductFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filters={filters}
              categories={categories}
              products={products}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onFilterChange={handleFilterChange}
              onPriceFilterChange={handlePriceFilterChange}
              onResetFilters={resetFilters}
            />
          </CardHeader>

          <CardContent>
            <ProductTable
              products={currentProducts}
              categories={categories}
              loading={loading}
              selectedProducts={selectedProducts}
              sortConfig={sortConfig}
              currentPage={currentPage}
              totalPages={totalPages}
              searchQuery={searchQuery}
              filters={filters}
              onSort={handleSort}
              onSelectAll={handleSelectAllProducts}
              onSelectProduct={handleSelectProduct}
              onEdit={(product) => {
                setCurrentProduct(product);
                setIsEditProductOpen(true);
              }}
              onView={(product) => {
                setCurrentProduct(product);
                setIsViewProductOpen(true);
              }}
              onDelete={handleDeleteProduct}
              onStatusChange={handleStatusChange}
              // onDuplicate={handleDuplicateProduct}
              onPaginate={paginate}
              onResetFilters={resetFilters}
            />
          </CardContent>
        </Card>
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="max-w-3xl">
          {!currentProduct && (
            <ProductForm
              mode="add"
              categories={categories}
              onSave={(newProduct) => handleAddProduct(newProduct)}
              onCancel={() => setIsEditProductOpen(false)}
            />
          )}
          {currentProduct && (
            <ProductForm
              mode="edit"
              product={currentProduct}
              categories={categories}
              onSave={handleEditProduct}
              onCancel={() => setIsEditProductOpen(false)}
              onProductChange={formState => setCurrentProduct(formStateToProduct(formState, currentProduct))}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Product Dialog */}
      <Dialog open={isViewProductOpen} onOpenChange={setIsViewProductOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {currentProduct && (
            <ProductViewDialog
              product={currentProduct}
              categories={categories}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
