// api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slugify";


export async function GET(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { searchParams } = new URL(request.url);

    // Extract and validate query parameters
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const minPrice = minPriceParam ? parseFloat(minPriceParam) : undefined;
    const maxPrice = maxPriceParam ? parseFloat(maxPriceParam) : undefined;

    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const search = searchParams.get("search");
    
    // FIXED: Get category as ID, not name
    const categoryId = searchParams.get("category");
    console.log('Category filter received:', categoryId);
    
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
    const priceType = searchParams.get("priceType") || "FIXED";

    // Build where conditions
    const whereConditions: any[] = [];

    // Only add status condition if it's not "ALL"
    if (status && status.toUpperCase() !== "ALL") {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'DRAFT'];
      const requestedStatus = status.toUpperCase();
      
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
        console.log('Adding category filter with ID:', categoryId);
        whereConditions.push({ categoryId: categoryId });
      } else {
        console.log('Invalid category ID format:', categoryId);
        // If invalid ID format, return empty results
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

    console.log('Final where clause:', JSON.stringify(where, null, 2));

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
          orderBy = { reviews: { _avg: { rating: "desc" } } };
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

    console.log('Query results:', {
      productsFound: products.length,
      totalCount,
      categoryFilter: categoryId
    });

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
        rating: averageRating,
        averageRating,
        reviewCount: product.reviews.length,
        reviews: undefined,
        sortPrice,
      };
    });

    // Handle price sorting in memory if needed
    const finalProducts = isPriceSort
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

export async function POST(request: NextRequest) {
  console.log("🚀 Starting product creation API call");
  
  try {
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
    const images = Array.isArray(body.images) ? body.images : [];
    const validImageUrls = images.filter((img: any) => 
      typeof img === 'string' && img.startsWith('http')
    );

    console.log(`🖼️ Using ${validImageUrls.length} valid image URLs`);

    // Create product data
    const productData: any = {
      name: body.name,
      description: body.description,
      hasFixedPrice: body.hasFixedPrice === true || body.hasFixedPrice === "true",
      priceType: body.priceType,
      sku: body.sku,
      images: validImageUrls,
      slug: body.slug || slugify(body.name),
      isFruit: Boolean(body.isFruit),
      isVegetable: Boolean(body.isVegetable),
      isTrending: Boolean(body.isTrending),
      isFeatured: Boolean(body.isFeatured),
      isDealOfTheDay: Boolean(body.isDealOfTheDay),
      isNewArrival: Boolean(body.isNewArrival),
      status: body.status?.toUpperCase() || 'ACTIVE',
    };

    // Handle pricing
    if (productData.hasFixedPrice) {
      productData.fixedPrice = parseFloat(body.fixedPrice);
    } else {
      productData.fixedPrice = 0;
      productData.unitPrices = Array.isArray(body.unitPrices) 
        ? body.unitPrices.map((up: any) => ({
            unit: up.unit,
            price: parseFloat(up.price),
          }))
        : [];
    }

    // Add category if provided - FIXED: Use string ID directly
    if (body.categoryId) {
      productData.category = {
        connect: { id: body.categoryId } // Use the string ID directly
      };
      console.log("📋 Added category connection for ID:", body.categoryId);
    }

    console.log("💾 Creating product with data:", {
      ...productData,
      images: `Array(${productData.images.length})`,
      category: productData.category ? `Connected to category` : 'None'
    });

    const product = await prisma.product.create({
      data: productData,
      include: {
        category: true,
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
}



