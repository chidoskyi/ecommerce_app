import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CloudinaryUploader,
  type CloudinaryConfig,
  type UploadOptions,
} from "@/lib/cloudinary";

// Initialize Cloudinary with environment variables
export const cloudinaryConfig: CloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  uploadPreset: process.env.CLOUDINARY_PRODUCTS_PRESET || "products",
  folder: process.env.CLOUDINARY_FOLDER || "products",
};

// Create Cloudinary uploader instance
export const cloudinaryUploader = new CloudinaryUploader(cloudinaryConfig);

// Helper function to handle image uploads
export async function handleImageUploads(images: any[]): Promise<string[]> {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return [];
  }

  const uploadedUrls: string[] = [];

  for (const image of images) {
    try {
      // Handle different image input formats
      if (typeof image === "string") {
        // If it's already a URL (existing image), keep it
        if (image.startsWith("http")) {
          uploadedUrls.push(image);
        }
      } else if (
        image instanceof File ||
        (image.constructor && image.constructor.name === "File")
      ) {
        // If it's a File object, upload to Cloudinary
        const uploadOptions: UploadOptions = {
          folder: "products",
          tags: ["product", "ecommerce"],
          context: {
            source: "product_upload",
            application: "ecommerce",
          },
          transformation: {
            quality: "auto:good",
            format: "auto",
            flags: "progressive",
          },
        };

        const uploadedUrl = await cloudinaryUploader.upload(
          image,
          uploadOptions
        );
        uploadedUrls.push(uploadedUrl);
      } else if (image.file && image.file instanceof File) {
        // Handle nested file structure
        const uploadOptions: UploadOptions = {
          folder: "products",
          tags: ["product", "ecommerce"],
          publicId: image.publicId || undefined,
          context: {
            source: "product_upload",
            application: "ecommerce",
          },
          transformation: {
            quality: "auto:good",
            format: "auto",
            flags: "progressive",
          },
        };

        const uploadedUrl = await cloudinaryUploader.upload(
          image.file,
          uploadOptions
        );
        uploadedUrls.push(uploadedUrl);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      // Continue with other images even if one fails
    }
  }

  return uploadedUrls;
}

// Helper function to handle FormData with files
export async function parseFormDataWithFiles(request: NextRequest) {
  const contentType = request.headers.get("content-type");

  if (contentType?.includes("multipart/form-data")) {
    // Handle FormData with files
    const formData = await request.formData();
    const data: any = {};
    const files: File[] = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (key === "images" || key.startsWith("images[")) {
          files.push(value);
        } else {
          data[key] = value;
        }
      } else {
        // Handle nested JSON data
        if (key.includes("[") || key === "unitPrices") {
          try {
            data[key] = JSON.parse(value as string);
          } catch {
            data[key] = value;
          }
        } else {
          data[key] = value;
        }
      }
    }

    // Upload files to Cloudinary
    if (files.length > 0) {
      data.uploadedImages = await handleImageUploads(files);
    }

    return data;
  } else {
    // Handle regular JSON request
    return await request.json();
  }
}

export function extractPublicIdFromUrl(url: string): string | null {
  try {
    // Handle both secure and non-secure URLs
    const regex =
      /(?:https?:\/\/)?(?:res\.cloudinary\.com\/[^\/]+\/image\/upload\/)?(?:v\d+\/)?(.+?)(?:\.[a-zA-Z]+)?$/;
    const match = url.match(regex);

    if (match && match[1]) {
      // Remove any transformation parameters (everything before the last '/')
      let publicId = match[1];
      const parts = publicId.split("/");

      // If there are transformation parameters, the actual public ID is usually the last part
      // But we need to handle folder structure too
      if (publicId.includes(",") || publicId.includes("_")) {
        // This might contain transformations, extract the clean public ID
        const cleanMatch = url.match(/\/([^\/,_]+(?:\/[^\/,_]+)*)\.[a-zA-Z]+$/);
        if (cleanMatch && cleanMatch[1]) {
          publicId = cleanMatch[1];
        }
      }

      return publicId;
    }

    return null;
  } catch (error) {
    console.error("Error extracting public ID from URL:", error);
    return null;
  }
}

// Helper function to delete image from Cloudinary using your existing uploader
export async function deleteCloudinaryImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes("cloudinary.com")) {
    return; // Skip if not a Cloudinary URL
  }

  const publicId = extractPublicIdFromUrl(imageUrl);
  if (!publicId) {
    console.warn("Could not extract public ID from URL:", imageUrl);
    return;
  }

  try {
    // Use the existing cloudinaryUploader instance
    await cloudinaryUploader.destroy(publicId, {
      resourceType: "image",
      invalidate: true, // Clear CDN cache
    });
    console.log(`Successfully deleted image: ${publicId}`);
  } catch (error) {
    console.error(`Failed to delete image ${publicId} from Cloudinary:`, error);
    // Don't throw error here - we still want to delete the product even if image deletion fails
  }
}

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



// POST - Create new product (Admin only)
// export async function POST(request: NextRequest) {
//   try {
//     // Apply admin middleware
//     const adminCheck = await requireAdmin(request);
//     if (adminCheck instanceof NextResponse) {
//       return adminCheck;
//     }

//     const body = await request.json();
//     const {
//       name,
//       description,
//       hasFixedPrice = true,
//       priceType = 'FIXED',
//       fixedPrice,
//       unitPrices,
//       sku,
//       categoryId,
//       images = [],
//       slug,
//       isFeatured = false,
//       isFruit = false,
//       isVegetable = false,
//       isTrending = false,
//       isDealOfTheDay = false,
//       isNewArrival = false,
//       weight,
//       status = 'ACTIVE'
//     } = body;

//     // Validation
//     if (!name || !description) {
//       return NextResponse.json(
//         { error: 'Name and description are required' },
//         { status: 400 }
//       );
//     }

//     if (hasFixedPrice && !fixedPrice) {
//       return NextResponse.json(
//         { error: 'Fixed price is required when hasFixedPrice is true' },
//         { status: 400 }
//       );
//     }

//     if (!hasFixedPrice && !unitPrices) {
//       return NextResponse.json(
//         { error: 'Unit prices are required when hasFixedPrice is false' },
//         { status: 400 }
//       );
//     }

//     // Check if SKU exists
//     if (sku) {
//       const existingSku = await prisma.product.findUnique({
//         where: { sku }
//       });
//       if (existingSku) {
//         return NextResponse.json(
//           { error: 'SKU already exists' },
//           { status: 400 }
//         );
//       }
//     }

//     // Prepare base product data
//     const productData: any = {
//       name,
//       description,
//       hasFixedPrice: Boolean(hasFixedPrice),
//       priceType,
//       sku,
//       images: Array.isArray(images) ? images : [],
//       slug: slug || slugify(name),
//       isFruit: Boolean(isFruit),
//       isVegetable: Boolean(isVegetable),
//       isTrending: Boolean(isTrending),
//       isFeatured: Boolean(isFeatured),
//       isDealOfTheDay: Boolean(isDealOfTheDay),
//       isNewArrival: Boolean(isNewArrival),
//       weight,
//       status: status.toUpperCase()
//     };

//     // Handle category relationship
//     if (categoryId) {
//       // Verify the category exists first
//       const categoryExists = await prisma.category.findUnique({
//         where: { id: categoryId }
//       });

//       if (!categoryExists) {
//         return NextResponse.json(
//           { error: 'Category not found' },
//           { status: 400 }
//         );
//       }

//       productData.category = {
//         connect: { id: categoryId }
//       };
//     }

//     // Handle pricing based on type
//     if (hasFixedPrice) {
//       productData.fixedPrice = parseFloat(fixedPrice);
//       productData.unitPrices = []; // Set as empty array for fixed price products
//     } else {
//       // Since fixedPrice is required in schema, set to 0 for variable pricing
//       productData.fixedPrice = 0;

//       // Handle unitPrices as composite types (embedded documents)
//       if (Array.isArray(unitPrices) && unitPrices.length > 0) {
//         productData.unitPrices = unitPrices.map(up => ({
//           unit: up.unit,
//           price: parseFloat(up.price)
//         }));
//       } else if (unitPrices?.options) {
//         productData.unitPrices = unitPrices.options.map(up => ({
//           unit: up.unit,
//           price: parseFloat(up.price)
//         }));
//       } else {
//         productData.unitPrices = [];
//       }
//     }

//     const product = await prisma.product.create({
//       data: productData,
//       include: {
//         category: true,
//       }
//     });

//     return NextResponse.json(product, { status: 201 });
//   } catch (error) {
//     console.error('Products POST error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// PUT - Update product (Admin only)

// export async function PUT(request: NextRequest) {
//   try {
//     // Apply admin middleware first
//     const adminCheck = await requireAdmin(request);
//     if (adminCheck instanceof NextResponse) {
//       return adminCheck;
//     }

//     const body = await request.json();
//     const {
//       id,
//       name,
//       description,
//       hasFixedPrice,
//       priceType,
//       fixedPrice,
//       unitPrices,
//       sku,
//       categoryId,
//       images,
//       slug,
//       isFeatured,
//       isFruit,
//       isVegetable,
//       isTrending,
//       isDealOfTheDay,
//       isNewArrival,
//       status
//     } = body;

//     if (!id) {
//       return NextResponse.json(
//         { error: 'Product ID is required' },
//         { status: 400 }
//       );
//     }

//     // Check if product exists
//     const existingProduct = await prisma.product.findUnique({
//       where: { id }
//     });

//     if (!existingProduct) {
//       return NextResponse.json(
//         { error: 'Product not found' },
//         { status: 404 }
//       );
//     }

//     // Check if SKU already exists (if updating SKU)
//     if (sku && sku !== existingProduct.sku) {
//       const existingSku = await prisma.product.findUnique({
//         where: { sku }
//       });
//       if (existingSku) {
//         return NextResponse.json(
//           { error: 'SKU already exists' },
//           { status: 400 }
//         );
//       }
//     }

//     // Build update data
//     const updateData: any = {};
//     if (name !== undefined) updateData.name = name;
//     if (description !== undefined) updateData.description = description;
//     if (hasFixedPrice !== undefined) updateData.hasFixedPrice = Boolean(hasFixedPrice);
//     if (priceType !== undefined) updateData.priceType = priceType;

//     // Handle pricing fields
//     if (fixedPrice !== undefined) {
//       updateData.fixedPrice = hasFixedPrice ? parseFloat(fixedPrice) : null;
//     }

//     if (unitPrices !== undefined) {
//       if (Array.isArray(unitPrices)) {
//         updateData.unitPrices = unitPrices;
//       } else if (unitPrices?.options) {
//         updateData.unitPrices = unitPrices.options;
//       } else {
//         updateData.unitPrices = [];
//       }
//     }

//     if (sku !== undefined) updateData.sku = sku;

//     // Handle category relationship
//     if (categoryId !== undefined) {
//       updateData.category = categoryId ? { connect: { id: categoryId } } : { disconnect: true };
//     }

//     if (images !== undefined) updateData.images = Array.isArray(images) ? images : [];
//     if (slug !== undefined) updateData.slug = slug;
//     if (isFruit !== undefined) updateData.isFruit = Boolean(isFruit);
//     if (isVegetable !== undefined) updateData.isVegetable = Boolean(isVegetable);
//     if (isTrending !== undefined) updateData.isTrending = Boolean(isTrending);
//     if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
//     if (isDealOfTheDay !== undefined) updateData.isDealOfTheDay = Boolean(isDealOfTheDay);
//     if (isNewArrival !== undefined) updateData.isNewArrival = Boolean(isNewArrival);
//     if (status !== undefined) updateData.status = status.toUpperCase();

//     const updatedProduct = await prisma.product.update({
//       where: { id },
//       data: updateData,
//       include: {
//         category: true,
//       }
//     });

//     return NextResponse.json(updatedProduct);
//   } catch (error) {
//     console.error('Products PUT error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

// DELETE - Delete product (Admin only)
// Helper function to extract public ID from Cloudinary URL



// export async function DELETE(request: NextRequest) {
//   try {
//     // Apply admin middleware first
//     const adminCheck = await requireAdmin(request);
//     if (adminCheck instanceof NextResponse) {
//       return adminCheck;
//     }

//     const { searchParams } = new URL(request.url);
//     const id = searchParams.get('id');

//     if (!id) {
//       return NextResponse.json(
//         { error: 'Product ID is required' },
//         { status: 400 }
//       );
//     }

//     // Check if product exists
//     const existingProduct = await prisma.product.findUnique({
//       where: { id }
//     });

//     if (!existingProduct) {
//       return NextResponse.json(
//         { error: 'Product not found' },
//         { status: 404 }
//       );
//     }

//     // Hard delete the product
//     const deletedProduct = await prisma.product.delete({
//       where: { id }
//     });

//     return NextResponse.json({
//       message: 'Product permanently deleted',
//       product: deletedProduct
//     });
//   } catch (error) {
//     console.error('Products DELETE error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }
