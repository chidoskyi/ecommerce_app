// Enhanced helper functions with comprehensive logging
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch products with pagination, filtering, and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract and validate query parameters
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : undefined;
    const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : undefined;

    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const search = searchParams.get("search");
    const categoryName = searchParams.get("category");
    const minRatingParam = searchParams.get("minRating");
    const minRating = minRatingParam ? parseFloat(minRatingParam) : undefined;

    const limitParam = searchParams.get("limit");
    const limit = Math.min(parseInt(limitParam || "10"), 100);

    const pageParam = searchParams.get("page");
    const page = parseInt(pageParam || "1");
    const featured = searchParams.get("featured");
    const fruit = searchParams.get("fruit");
    const vegetable = searchParams.get("vegetable");
    const trending = searchParams.get("trending");
    const dealOfTheDay = searchParams.get("dealOfTheDay");
    const newArrival = searchParams.get("newArrival");
    const status = searchParams.get("status") || "ACTIVE";

    // Build where conditions
    const whereConditions: any[] = [{ status: status.toUpperCase() }];

    // Category filter
    if (categoryName && categoryName.toLowerCase() !== "all") {
      const category = await prisma.category.findFirst({
        where: {
          slug: { equals: categoryName, mode: "insensitive" },
          status: "ACTIVE",
        },
      });

      if (category) {
        whereConditions.push({ categoryId: category.id });
      } else {
        return NextResponse.json({
          success: true,
          products: [],
          pagination: { count: 0, total: 0, page, limit, pages: 0 },
        });
      }
    }

    // Boolean filters
    if (featured) whereConditions.push({ isFeatured: featured === "true" });
    if (fruit) whereConditions.push({ isFruit: fruit === "true" });
    if (vegetable) whereConditions.push({ isVegetable: vegetable === "true" });
    if (trending) whereConditions.push({ isTrending: trending === "true" });
    if (dealOfTheDay)
      whereConditions.push({ isDealOfTheDay: dealOfTheDay === "true" });
    if (newArrival)
      whereConditions.push({ isNewArrival: newArrival === "true" });

    // Price Filter (simplified and more reliable)
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceConditions: any[] = [];

      // Handle fixed price products
      const fixedPriceCondition: any = { hasFixedPrice: true };
      if (minPrice !== undefined)
        fixedPriceCondition.fixedPrice = { gte: minPrice };
      if (maxPrice !== undefined)
        fixedPriceCondition.fixedPrice = { lte: maxPrice };
      priceConditions.push(fixedPriceCondition);

      // Handle unit price products
      const unitPriceCondition: any = {
        hasFixedPrice: false,
        unitPrices: { some: {} },
      };
      if (minPrice !== undefined)
        unitPriceCondition.unitPrices.some.price = { gte: minPrice };
      if (maxPrice !== undefined)
        unitPriceCondition.unitPrices.some.price = { lte: maxPrice };
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
    const where =
      whereConditions.length === 1
        ? whereConditions[0]
        : { AND: whereConditions };

    // Sort options
    let orderBy: any;
    const isPriceSort = sortBy === "priceAsc" || sortBy === "priceDesc";

    if (isPriceSort) {
      orderBy = { createdAt: "desc" }; // Temporary, will sort in memory
    } else {
      switch (sortBy) {
        case "popularity":
          orderBy = { reviews: { _count: "desc" } };
          break;
        case "bestSelling":
          orderBy = { salesCount: "desc" };
          break;
        case "rating":
          orderBy = { reviews: { _avg: { rating: "desc" } } }; // Fixed missing brace
          break;
        default:
          orderBy = { [sortBy]: sortOrder };
      }
    }

    const skip = (page - 1) * limit;

    // Execute queries
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          reviews: { select: { rating: true } },
          unitPrices: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Process products
    const productsWithRatings = products.map((product) => {
      const ratings = product.reviews.map((r) => r.rating);
      const averageRating = ratings.length
        ? parseFloat(
            (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
          )
        : 0;

      let priceInfo = {};
      let sortPrice = 0;

      if (product.hasFixedPrice) {
        priceInfo = { displayPrice: product.fixedPrice, priceType: "fixed" };
        sortPrice = product.fixedPrice;
      } else if (product.unitPrices?.length) {
        const validPrices = product.unitPrices.filter((up) => up.price > 0);
        if (validPrices.length) {
          const prices = validPrices.map((up) => up.price);
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

      return {
        ...product,
        ...priceInfo,
        rating: averageRating, // ✅ Add rating field for ProductCard
        averageRating, // ✅ Keep averageRating for backward compatibility
        reviewCount: product.reviews.length,
        reviews: undefined,
        sortPrice,
      };
    });

    // Handle price sorting in memory if needed
    let finalProducts = isPriceSort
      ? [...productsWithRatings].sort((a, b) =>
          sortBy === "priceAsc"
            ? a.sortPrice - b.sortPrice
            : b.sortPrice - a.sortPrice
        )
      : productsWithRatings;

    // Remove internal field before returning
    const cleanProducts = finalProducts.map(({ sortPrice, ...rest }) => rest);

    return NextResponse.json({
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
    return NextResponse.json(
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
