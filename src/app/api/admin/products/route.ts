// api/admin/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthenticatedRequest } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import { Prisma, ProductStatus, PriceType, UnitPrice } from "@prisma/client";

// Define proper types for the API response
interface PriceInfo {
  displayPrice?: number;
  priceType?: string;
  priceRange?: { min: number; max: number } | null;
}

interface ProcessedProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  hasFixedPrice: boolean;
  priceType: PriceType;
  fixedPrice: number;
  categoryId: string | null;
  sku: string;
  status: ProductStatus;
  isFeatured: boolean;
  isTrending: boolean;
  isVegetable: boolean;
  isFruit: boolean;
  isDealOfTheDay: boolean;
  isNewArrival: boolean;
  rating: number | null;
  averageRating: number;
  images: string[];
  weight: number | null;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string } | null;
  unitPrices: UnitPrice[]; // Fixed: should be array, not single object
  displayPrice?: number;
  priceRange?: { min: number; max: number } | null;
  reviewCount: number;
}

export interface ProductWithSortPrice extends ProcessedProduct {
  sortPrice: number;
}

interface PaginationInfo {
  count: number;
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface ApiResponse {
  success: boolean;
  products: ProcessedProduct[];
  pagination: PaginationInfo;
}

interface ErrorResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Type for valid sort options
type SortByOptions =
  | "createdAt"
  | "name"
  | "priceAsc"
  | "priceDesc"
  | "popularity"
  | "featured"
  | "rating";

// Type for valid sort order
type SortOrder = "asc" | "desc";

export const GET = requireAdmin(
  async (
    request: AuthenticatedRequest
  ): Promise<NextResponse<ApiResponse | ErrorResponse>> => {
    try {
      const { searchParams } = new URL(request.url);

      // Extract and validate query parameters with proper typing
      const minPriceParam = searchParams.get("minPrice");
      const maxPriceParam = searchParams.get("maxPrice");
      const minPrice: number | undefined = minPriceParam
        ? parseFloat(minPriceParam)
        : undefined;
      const maxPrice: number | undefined = maxPriceParam
        ? parseFloat(maxPriceParam)
        : undefined;

      const sortByParam = searchParams.get("sortBy");
      const sortBy: SortByOptions =
        (sortByParam as SortByOptions) || "createdAt";

      const sortOrderParam = searchParams.get("sortOrder");
      const sortOrder: SortOrder = (sortOrderParam as SortOrder) || "desc";

      const search: string | null = searchParams.get("search");

      // FIXED: Get category as ID, not name
      const categoryId: string | null = searchParams.get("category");
      console.log("Category filter received:", categoryId);

      const minRatingParam = searchParams.get("minRating");
      const minRating: number | undefined = minRatingParam
        ? parseFloat(minRatingParam)
        : undefined;

      const limitParam = searchParams.get("limit");
      const limit: number = Math.min(parseInt(limitParam || "10"), 100);

      const pageParam = searchParams.get("page");
      const page: number = parseInt(pageParam || "1");

      const featured: string | null = searchParams.get("featured");
      const fruit: string | null = searchParams.get("fruit");
      const vegetable: string | null = searchParams.get("vegetable");
      const trending: string | null = searchParams.get("trending");
      const dealOfTheDay: string | null = searchParams.get("dealOfTheDay");
      const newArrival: string | null = searchParams.get("newArrival");
      const status: string = searchParams.get("status") || "ACTIVE";
      const priceType: string = searchParams.get("priceType") || "FIXED";

      // Build where conditions with proper typing
      const whereConditions: Prisma.ProductWhereInput[] = [];

      // Only add status condition if it's not "ALL"
      if (status && status.toUpperCase() !== "ALL") {
        const validStatuses: ProductStatus[] = ["ACTIVE", "INACTIVE"];
        const requestedStatus = status.toUpperCase() as ProductStatus;

        // Only add if it's a valid status
        if (validStatuses.includes(requestedStatus)) {
          whereConditions.push({ status: requestedStatus });
        }
      }

      // PriceType filter
      if (priceType && priceType.toUpperCase() !== "ALL") {
        const priceTypeUpper = priceType.toUpperCase();
        if (priceTypeUpper === "FIXED") {
          whereConditions.push({ hasFixedPrice: true });
        } else if (priceTypeUpper === "VARIABLE") {
          whereConditions.push({ hasFixedPrice: false });
        }
      }

      // FIXED: Category filter - handle by ID directly
      if (categoryId && categoryId.toLowerCase() !== "all") {
        // Check if it's a valid ObjectId format (24 hex characters)
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(categoryId);

        if (isValidObjectId) {
          console.log("Adding category filter with ID:", categoryId);
          whereConditions.push({ categoryId: categoryId });
        } else {
          console.log("Invalid category ID format:", categoryId);
          // If invalid ID format, return empty results
          return NextResponse.json<ApiResponse>({
            success: true,
            products: [],
            pagination: { count: 0, total: 0, page, limit, pages: 0 },
          });
        }
      }

      // Boolean filters with proper type checking
      if (featured) whereConditions.push({ isFeatured: featured === "true" });
      if (fruit) whereConditions.push({ isFruit: fruit === "true" });
      if (vegetable)
        whereConditions.push({ isVegetable: vegetable === "true" });
      if (trending) whereConditions.push({ isTrending: trending === "true" });
      if (dealOfTheDay)
        whereConditions.push({ isDealOfTheDay: dealOfTheDay === "true" });
      if (newArrival)
        whereConditions.push({ isNewArrival: newArrival === "true" });

      // Price Filter (simplified and more reliable)
      if (minPrice !== undefined || maxPrice !== undefined) {
        const priceConditions: Prisma.ProductWhereInput[] = [];

        // Handle fixed price products
        const fixedPriceCondition: Prisma.ProductWhereInput = {
          hasFixedPrice: true,
        };
        if (minPrice !== undefined) {
          fixedPriceCondition.fixedPrice = { gte: minPrice };
        }
        if (maxPrice !== undefined) {
          fixedPriceCondition.fixedPrice = { lte: maxPrice };
        }
        priceConditions.push(fixedPriceCondition);

        // Handle unit price products
        const unitPriceCondition: Prisma.ProductWhereInput = {
          hasFixedPrice: false,
          unitPrices: {
            some: {
              ...(minPrice !== undefined && { price: { gte: minPrice } }),
              ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
            },
          },
        };
        priceConditions.push(unitPriceCondition);

        whereConditions.push({ OR: priceConditions });
      }

      // Rating filter
      if (minRating !== undefined) {
        whereConditions.push({
          reviews: { some: { rating: { gte: minRating } } },
        });
      }

      // Search filter
      if (search) {
        whereConditions.push({
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
          ],
        });
      }

      // Final where clause
      const where: Prisma.ProductWhereInput =
        whereConditions.length === 1
          ? whereConditions[0]
          : { AND: whereConditions };

      console.log("Final where clause:", JSON.stringify(where, null, 2));

      // Sort options with proper typing
      let orderBy: Prisma.ProductOrderByWithRelationInput;
      const isPriceSort = sortBy === "priceAsc" || sortBy === "priceDesc";
      const isRatingSort = sortBy === "rating";

      if (isPriceSort || isRatingSort) {
        // For price and rating sorting, we'll sort in memory after processing
        orderBy = { createdAt: "desc" };
      } else {
        switch (sortBy) {
          case "popularity":
            orderBy = {
              reviews: {
                _count: "desc",
              },
            };
            break;
          case "featured":
            orderBy = {
              isFeatured: "desc", // Featured products first
            };
            break;
          case "name":
            orderBy = { name: sortOrder };
            break;
          case "createdAt":
          default:
            orderBy = { createdAt: sortOrder };
        }
      }

      const skip: number = (page - 1) * limit;

      // FIX: Use Prisma validator to include unitPrices
      const include: Prisma.ProductInclude = {
        category: { select: { id: true, name: true } },
        reviews: { select: { rating: true } },
        // unitPrices: true, // Include all unitPrice fields
      };

      // Execute queries with proper typing
      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          include,
        }),
        prisma.product.count({ where }),
      ]);

      console.log("Query results:", {
        productsFound: products.length,
        totalCount,
        categoryFilter: categoryId,
      });

      // Process products with proper typing
      const productsWithRatings: ProductWithSortPrice[] = products.map(
        (product) => {
          const ratings: number[] = product.reviews.map((r) => r.rating);
          const averageRating: number = ratings.length
            ? parseFloat(
                (
                  ratings.reduce((sum, rating) => sum + rating, 0) /
                  ratings.length
                ).toFixed(2)
              )
            : 0;

          let priceInfo: PriceInfo = {};
          let sortPrice = 0;

          if (product.hasFixedPrice) {
            priceInfo = {
              displayPrice: product.fixedPrice || 0,
              priceType: "fixed",
            };
            sortPrice = product.fixedPrice || 0;
          } else if (product.unitPrices?.length) {
            const validPrices = product.unitPrices.filter((up) => up.price > 0);
            if (validPrices.length) {
              const prices: number[] = validPrices.map((up) => up.price);
              const minPrice = Math.min(...prices);
              priceInfo = {
                displayPrice: minPrice,
                priceType: "unit",
                priceRange:
                  Math.min(...prices) !== Math.max(...prices)
                    ? { min: Math.min(...prices), max: Math.max(...prices) }
                    : null,
              };
              sortPrice = minPrice;
            }
          }

          // Create the product with proper type casting
          const processedProduct: ProductWithSortPrice = {
            ...product,
            ...priceInfo,
            rating: averageRating,
            averageRating,
            reviewCount: product.reviews.length,
            sortPrice,
          } as unknown as ProductWithSortPrice;

          return processedProduct;
        }
      );

      // Handle price sorting in memory if needed
      let finalProducts: ProductWithSortPrice[] = productsWithRatings;

      if (sortBy === "rating") {
        finalProducts = [...productsWithRatings].sort((a, b) =>
          sortOrder === "desc"
            ? b.averageRating - a.averageRating
            : a.averageRating - b.averageRating
        );
      } else if (isPriceSort) {
        finalProducts = [...productsWithRatings].sort((a, b) =>
          sortBy === "priceAsc"
            ? a.sortPrice - b.sortPrice
            : b.sortPrice - a.sortPrice
        );
      }

      // Remove internal field before returning with proper typing
      const cleanProducts: ProcessedProduct[] = finalProducts.map((product) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { sortPrice, ...rest } = product;
        return rest;
      });

      return NextResponse.json<ApiResponse>({
        success: true,
        products: cleanProducts,
        pagination: {
          count: cleanProducts.length,
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          message: "Internal server error",
          ...(process.env.NODE_ENV === "development" && {
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        },
        { status: 500 }
      );
    }
  }
);

export const POST = requireAdmin(
  async (
    request: AuthenticatedRequest
  ) => {
    try {
    console.log("🚀 Starting product creation API call");
    const body = await request.json();
    console.log("📊 Parsed body:", body);

    // Validate required fields
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    // Validate images are URLs (already uploaded)
    const rawImages: unknown = body.images;
    const images = Array.isArray(rawImages) ? rawImages : [];
    const validImageUrls = images.filter(
      (img): img is string => typeof img === "string" && img.startsWith("http")
    );

    console.log(`🖼️ Using ${validImageUrls.length} valid image URLs`);

    // Create product data - FIXED: Use ProductCreateInput instead of ProductUpdateInput
    const productData: Prisma.ProductCreateInput = {
      name: body.name,
      description: body.description,
      hasFixedPrice:
        body.hasFixedPrice === true || body.hasFixedPrice === "true",
      priceType: body.priceType,
      sku: body.sku,
      images: validImageUrls,
      fixedPrice: body.fixedPrice,
      slug: body.slug || slugify(body.name),
      isFruit: Boolean(body.isFruit),
      isVegetable: Boolean(body.isVegetable),
      isTrending: Boolean(body.isTrending),
      isFeatured: Boolean(body.isFeatured),
      isDealOfTheDay: Boolean(body.isDealOfTheDay),
      isNewArrival: Boolean(body.isNewArrival),
      status: body.status?.toUpperCase() || "ACTIVE",
    };

    // Handle pricing
    if (productData.hasFixedPrice) {
      productData.fixedPrice = parseFloat(body.fixedPrice);
    } else {
      productData.fixedPrice = 0;
      productData.unitPrices = Array.isArray(body.unitPrices)
        ? body.unitPrices.map((up: { unit: string; price: string }) => ({
            unit: up.unit,
            price: parseFloat(up.price),
          }))
        : [];
    }

    // Add category if provided
    if (body.categoryId) {
      productData.category = {
        connect: { id: body.categoryId },
      };
      console.log("📋 Added category connection for ID:", body.categoryId);
    }

    const product = await prisma.product.create({
      data: productData,
      include: {
        category: true,
        reviews: true,
        // unitPrices: true,
      },
    });

    console.log("✅ Product created successfully:", product.id);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("❌ Product creation error:", error);
    return NextResponse.json(
      { error: "Failed to create product", details: (error as Error).message },
      { status: 500 }
    );
  }
})
