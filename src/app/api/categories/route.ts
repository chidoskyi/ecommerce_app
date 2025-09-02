// app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";
import { slugify } from "@/lib/slugify";
// import { CloudinaryUploader } from "@/lib/cloudinary"; // Import your enhanced library

// Initialize Cloudinary uploader
// export const cloudinaryUploader = new CloudinaryUploader({
//   cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
//   uploadPreset: process.env.CLOUDINARY_CATEGORIES_PRESET!, // This will be overridden when using UploadType
// });

// // Helper function to handle image upload using the new type-safe method
// export async function handleImageUpload(
//   imageData: string | File | null
// ): Promise<string | null> {
//   if (!imageData) return null;

//   try {
//     // If it's a base64 string or blob URL, convert to File
//     if (typeof imageData === "string") {
//       if (imageData.startsWith("data:")) {
//         // Handle base64 data URL
//         const response = await fetch(imageData);
//         const blob = await response.blob();
//         const file = new File([blob], "category-image.jpg", {
//           type: blob.type,
//         });

//         // Use the new type-safe upload method
//         return await cloudinaryUploader.uploadByType(
//           file,
//           UploadType.CATEGORY,
//           {
//             publicId: `category_${Date.now()}`, // Optional: custom public ID
//           }
//         );
//       } else if (imageData.startsWith("http")) {
//         // If it's already a URL (e.g., existing Cloudinary URL), return as is
//         return imageData;
//       }
//     }

//     // If it's a File object
//     if (imageData instanceof File) {
//       return await cloudinaryUploader.uploadByType(
//         imageData,
//         UploadType.CATEGORY,
//         {
//           publicId: `category_${Date.now()}`, // Optional: custom public ID
//         }
//       );
//     }

//     return null;
//   } catch (error) {
//     console.error("Image upload failed:", error);
//     throw new Error(
//       `Failed to upload image: ${
//         error instanceof Error ? error.message : "Unknown error"
//       }`
//     );
//   }
// }

// GET all categories (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const status = searchParams.get("status");

    // Validate and parse inputs
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build the where clause
    const where: any = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        include: {
          _count: {
            select: { products: true },
          },
        },
        skip,
        take: limitNum,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      prisma.category.count({ where }),
    ]);

    return NextResponse.json({
      categories: categories.map((category) => ({
        ...category,
        productsCount: category._count?.products || 0,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      },
      { status: 500 }
    );
  }
}

// POST create new category (admin only)
export async function POST(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck; // Return error response if not admin
    }

    const body = await request.json();
    const {
      name,
      description,
      image,
      status = 'ACTIVE'
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = slugify(name);

    // Check for existing slug
    const existingCategory = await prisma.category.findUnique({
      where: { slug }
    });

    if (existingCategory) {
      return NextResponse.json(
        { 
          error: 'Category with this name already exists',
          suggestion: `Try a slightly different name (generated slug: ${slug})`
        },
        { status: 400 }
      );
    }

    // Handle image upload to Cloudinary using type-safe method
    let uploadedImageUrl: string | null = null;
    if (image) {
      try {
        uploadedImageUrl = await handleImageUpload(image);
      } catch (uploadError) {
        return NextResponse.json(
          { 
            error: 'Image upload failed',
            details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
          },
          { status: 400 }
        );
      }
    }

    // Create new category with uploaded image URL
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image: uploadedImageUrl,
        status
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json(
      {
        ...category,
        productsCount: category._count?.products || 0
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Unknown error' 
        })
      },
      { status: 500 }
    );
  }
}

// PUT update existing category (admin only)
export async function PUT(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    const { name, description, image, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Generate new slug if name is being updated
    let slug = existingCategory.slug;
    if (name && name !== existingCategory.name) {
      slug = slugify(name);
      
      // Check if new slug is already taken by another category
      const slugConflict = await prisma.category.findFirst({
        where: { 
          slug,
          NOT: { id }
        }
      });
      
      if (slugConflict) {
        return NextResponse.json(
          { 
            error: 'Category with this updated name already exists',
            suggestion: `Try a slightly different name (generated slug: ${slug})`
          },
          { status: 400 }
        );
      }
    }

    // Handle image update using type-safe method
    let finalImageUrl = existingCategory.image;
    if (image !== undefined) {
      if (image === null || image === '') {
        // User wants to remove the image
        finalImageUrl = null;
      } else if (image !== existingCategory.image) {
        // User is updating with a new image
        try {
          finalImageUrl = await handleImageUpload(image);
        } catch (uploadError) {
          return NextResponse.json(
            { 
              error: 'Image upload failed',
              details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
            },
            { status: 400 }
          );
        }
      }
      // If image === existingCategory.image, keep the existing image
    }

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? existingCategory.name,
        slug,
        description: description ?? existingCategory.description,
        image: finalImageUrl,
        status: status ?? existingCategory.status
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({
      ...updatedCategory,
      productsCount: updatedCategory._count?.products || 0
    });
  } catch (error) {
    console.error('Categories API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Unknown error' 
        })
      },
      { status: 500 }
    );
  }
}

// export async function POST(request: NextRequest) {
//   try {
//     // Apply admin middleware
//     const adminCheck = await requireAdmin(request);
//     if (adminCheck instanceof NextResponse) {
//       return adminCheck; // Return error response if not admin
//     }

//     const body = await request.json();
//     const {
//       name,
//       description,
//       image,
//       status = 'ACTIVE'
//     } = body;

//     // Validate required fields
//     if (!name) {
//       return NextResponse.json(
//         { error: 'Name is required' },
//         { status: 400 }
//       );
//     }

//     // Generate slug from name
//     const slug = slugify(name);

//     // Check for existing slug
//     const existingCategory = await prisma.category.findUnique({
//       where: { slug }
//     });

//     if (existingCategory) {
//       return NextResponse.json(
//         {
//           error: 'Category with this name already exists',
//           suggestion: `Try a slightly different name (generated slug: ${slug})`
//         },
//         { status: 400 }
//       );
//     }

//     // Create new category with generated slug
//     const category = await prisma.category.create({
//       data: {
//         name,
//         slug,
//         description,
//         image,
//         status
//       },
//       include: {
//         _count: {
//           select: { products: true }
//         }
//       }
//     });

//     return NextResponse.json(
//       {
//         ...category,
//         productsCount: category._count?.products || 0
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error('Categories API error:', error);
//     return NextResponse.json(
//       {
//         error: 'Internal server error',
//         ...(process.env.NODE_ENV === 'development' && {
//           details: error instanceof Error ? error.message : 'Unknown error'
//         })
//       },
//       { status: 500 }
//     );
//   }
// }

// // PUT update existing category (admin only)
// export async function PUT(request: NextRequest) {
//   try {
//     // Apply admin middleware
//     const adminCheck = await requireAdmin(request);
//     if (adminCheck instanceof NextResponse) {
//       return adminCheck;
//     }

//     const { searchParams } = new URL(request.url);
//     const id = searchParams.get('id');
//     const body = await request.json();
//     const { name, description, image, status } = body;

//     if (!id) {
//       return NextResponse.json(
//         { error: 'Category ID is required' },
//         { status: 400 }
//       );
//     }

//     // Check if category exists
//     const existingCategory = await prisma.category.findUnique({
//       where: { id }
//     });

//     if (!existingCategory) {
//       return NextResponse.json(
//         { error: 'Category not found' },
//         { status: 404 }
//       );
//     }

//     // Generate new slug if name is being updated
//     let slug = existingCategory.slug;
//     if (name && name !== existingCategory.name) {
//       slug = slugify(name);

//       // Check if new slug is already taken by another category
//       const slugConflict = await prisma.category.findFirst({
//         where: {
//           slug,
//           NOT: { id }
//         }
//       });

//       if (slugConflict) {
//         return NextResponse.json(
//           {
//             error: 'Category with this updated name already exists',
//             suggestion: `Try a slightly different name (generated slug: ${slug})`
//           },
//           { status: 400 }
//         );
//       }
//     }

//     // Update category
//     const updatedCategory = await prisma.category.update({
//       where: { id },
//       data: {
//         name: name ?? existingCategory.name,
//         slug,
//         description: description ?? existingCategory.description,
//         image: image ?? existingCategory.image,
//         status: status ?? existingCategory.status
//       },
//       include: {
//         _count: {
//           select: { products: true }
//         }
//       }
//     });

//     return NextResponse.json({
//       ...updatedCategory,
//       productsCount: updatedCategory._count?.products || 0
//     });
//   } catch (error) {
//     console.error('Categories API error:', error);
//     return NextResponse.json(
//       {
//         error: 'Internal server error',
//         ...(process.env.NODE_ENV === 'development' && {
//           details: error instanceof Error ? error.message : 'Unknown error'
//         })
//       },
//       { status: 500 }
//     );
//   }
// }

// DELETE category (admin only)
export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ DELETE /api/categories called:", request.url);

    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      console.log("⛔ Admin check failed:", adminCheck);
      return adminCheck;
    }
    console.log("✅ Admin check passed");

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    console.log("🔍 Extracted ID:", id);

    if (!id) {
      console.error("❌ Missing category ID");
      return NextResponse.json(
        { error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Check if category exists
    console.log("📦 Checking category in database...");
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    console.log("🔎 Category lookup result:", existingCategory);

    if (!existingCategory) {
      console.warn(`⚠️ Category with ID ${id} not found`);
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Prevent deletion if category has products
    if (existingCategory._count.products > 0) {
      console.warn(
        `⚠️ Cannot delete category ${id}, it has ${existingCategory._count.products} products`
      );
      return NextResponse.json(
        {
          error: "Cannot delete category with associated products",
          productsCount: existingCategory._count.products,
        },
        { status: 400 }
      );
    }

    // Delete category
    console.log(`🗑️ Deleting category with ID: ${id}`);
    await prisma.category.delete({
      where: { id },
    });

    console.log(`✅ Category ${id} deleted successfully`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("❌ Categories API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      },
      { status: 500 }
    );
  }
}
