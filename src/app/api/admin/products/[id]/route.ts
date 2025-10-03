import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdminDynamic,
  type AuthenticatedRequest, RouteContext
} from "@/lib/auth";
import { Category, Prisma, Product, UnitPrice } from "@prisma/client";
import { initCloudinary, deleteImage } from "@/lib/cloudinary";

initCloudinary({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  apiKey: process.env.CLOUDINARY_API_KEY!,
  apiSecret: process.env.CLOUDINARY_API_SECRET!,
  folder: process.env.CLOUDINARY_PRODUCTS_PRESET || "products",
});

export interface ProductWithRelations extends Product {
  category: Category;
  reviews: { rating: number }[];
  unitPrices: UnitPrice[];
  averageRating: number | null; // Match the original type
  reviewCount?: number;
}

// // Define the proper route context type for Next.js App Router
// interface RouteContext {
//   params: Promise<{ id: string }>;
// }

export const DELETE = requireAdminDynamic<{ id: string }>(
  async (
    request: AuthenticatedRequest,
    ctx: RouteContext<{ id: string }>
  ) => {
    try {
      const user = request.user;
      const params = await ctx.params;
      const { id } = params;

      console.log("🗑️ Delete product API called for:", id);
      console.log("👤 Admin user:", user.email);

      if (!id) {
        return NextResponse.json(
          { error: "Product ID is required" },
          { status: 400 }
        );
      }

      // Check if product exists and get its data (including images)
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          images: true,
        },
      });

      if (!existingProduct) {
        return NextResponse.json(
          { error: "Product not found" }, 
          { status: 404 }
        );
      }

      // Check for foreign key constraints BEFORE attempting delete
      try {
        const orderItemCount = await prisma.orderItem.count({
          where: { productId: id }
        });

        if (orderItemCount > 0) {
          return NextResponse.json(
            {
              error: "Cannot delete product",
              message: `This product has ${orderItemCount} associated order items. Please remove these orders first or use soft delete.`,
              canDelete: false,
              orderItemCount,
              suggestion: "Consider using PATCH with action: 'soft_delete' instead"
            },
            { status: 409 }
          );
        }
      } catch (constraintError) {
        console.error("Error checking constraints:", constraintError);
        // Continue - we'll catch the actual deletion error below
      }

      // Collect all image URLs to delete from Cloudinary
      const imagesToDelete: string[] = [];
      if (existingProduct.images && Array.isArray(existingProduct.images)) {
        imagesToDelete.push(
          ...existingProduct.images.filter((url) => url && url.trim() !== "")
        );
      }

      // Extract public ID from Cloudinary URL
      function extractPublicIdFromUrl(url: string): string | null {
        try {
          const regex = /\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp)$/i;
          const match = url.match(regex);
          return match ? match[1] : null;
        } catch {
          return null;
        }
      }

      // Delete all images from Cloudinary first (optional - comment out if you want to skip)
      const cloudinaryDeletions: Promise<void>[] = [];
      
      for (const imageUrl of imagesToDelete) {
        const publicId = extractPublicIdFromUrl(imageUrl);
        if (publicId) {
          cloudinaryDeletions.push(
            deleteImage(publicId)
              .then(() => {})
              .catch((error) => {
                console.error(`⚠️ Failed to delete image ${publicId} from Cloudinary:`, error);
                // Don't throw - we want to continue with database deletion
              }) as Promise<void>
          );
        }
      }

      // Wait for all Cloudinary deletions to complete (or fail)
      if (cloudinaryDeletions.length > 0) {
        console.log(`🖼️ Attempting to delete ${cloudinaryDeletions.length} images from Cloudinary...`);
        await Promise.allSettled(cloudinaryDeletions);
        console.log(`✅ Cloudinary cleanup attempted for ${cloudinaryDeletions.length} images`);
      }

      // Hard delete the product from database
      const deletedProduct = await prisma.product.delete({
        where: { id },
      });

      console.log(`✅ Product deleted successfully: ${existingProduct.name}`);

      return NextResponse.json({
        success: true,
        message: "Product deleted successfully",
        id: deletedProduct.id,
        product: {
          id: deletedProduct.id,
          name: existingProduct.name,
          deletedImages: imagesToDelete.length,
        },
      });

    } catch (error) {
      console.error("❌ Products DELETE error:", error);

      // Handle specific Prisma errors
      if (error instanceof Error) {
        // Foreign key constraint errors
        if (error.message.includes("Foreign key constraint") || 
            error.message.includes("violate the required relation") ||
            error.message.includes("OrderItemToProduct")) {
          return NextResponse.json(
            {
              error: "Cannot delete product: it is referenced by existing orders",
              suggestion: "Use soft delete instead or remove associated orders first",
              code: "FOREIGN_KEY_CONSTRAINT"
            },
            { status: 409 }
          );
        }
        
        // Product not found
        if (error.message.includes("Record to delete does not exist")) {
          return NextResponse.json(
            { error: "Product not found" },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        { 
          error: "Failed to delete product",
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : "Internal server error"
        },
        { status: 500 }
      );
    }
  }
);

export const PUT = requireAdminDynamic(
  async (
    request: AuthenticatedRequest,
    ctx: RouteContext
  ) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const user = request.user;
      const params = await ctx.params; // Await the params promise first
      const { id } = params; // Then destructure

      // Check if request has a body
      const contentType = request.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return NextResponse.json(
          { error: "Content-Type must be application/json" },
          { status: 400 }
        );
      }

      // Try to parse the JSON body with error handling
      let body;
      try {
        body = await request.json();
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        return NextResponse.json(
          { error: "Invalid JSON format in request body" },
          { status: 400 }
        );
      }

      if (!id) {
        return NextResponse.json(
          { error: "Product ID is required" },
          { status: 400 }
        );
      }

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Check if SKU exists (excluding current product)
      if (body.sku && body.sku !== existingProduct.sku) {
        const existingSku = await prisma.product.findUnique({
          where: { sku: body.sku },
        });
        if (existingSku) {
          return NextResponse.json(
            { error: "SKU already exists" },
            { status: 400 }
          );
        }
      }

      // Validate images are URLs (already uploaded)
      const rawImages: unknown = body.images;
      const images = Array.isArray(rawImages) ? rawImages : [];
      const validImageUrls = images.filter(
        (img): img is string =>
          typeof img === "string" && img.startsWith("http")
      );

      // Prepare update data
      const updateData: Prisma.ProductUpdateInput = {};

      // Only update fields that are provided
      if (body.name !== undefined) updateData.name = body.name;
      if (body.description !== undefined)
        updateData.description = body.description;
      if (body.hasFixedPrice !== undefined)
        updateData.hasFixedPrice = Boolean(body.hasFixedPrice);
      if (body.priceType !== undefined) updateData.priceType = body.priceType;
      if (body.sku !== undefined) updateData.sku = body.sku;
      if (body.slug !== undefined) updateData.slug = body.slug;
      if (body.isFruit !== undefined)
        updateData.isFruit = Boolean(body.isFruit);
      if (body.isVegetable !== undefined)
        updateData.isVegetable = Boolean(body.isVegetable);
      if (body.isTrending !== undefined)
        updateData.isTrending = Boolean(body.isTrending);
      if (body.isFeatured !== undefined)
        updateData.isFeatured = Boolean(body.isFeatured);
      if (body.isDealOfTheDay !== undefined)
        updateData.isDealOfTheDay = Boolean(body.isDealOfTheDay);
      if (body.isNewArrival !== undefined)
        updateData.isNewArrival = Boolean(body.isNewArrival);
      if (body.status !== undefined)
        updateData.status = body.status.toUpperCase();

      // Update images (✅ allowed in update input)
      if (validImageUrls.length > 0) {
        updateData.images = validImageUrls;
      }

      // Handle category relationship
      if (body.categoryId !== undefined) {
        if (body.categoryId) {
          const categoryExists = await prisma.category.findUnique({
            where: { id: body.categoryId },
          });

          if (!categoryExists) {
            return NextResponse.json(
              { error: "Category not found" },
              { status: 400 }
            );
          }

          updateData.category = {
            connect: { id: body.categoryId },
          };
        } else {
          updateData.category = {
            disconnect: true,
          };
        }
      }

      type UnitPriceInput = {
        unit: string;
        price: number | string;
      };

      // Handle pricing updates
      if (body.hasFixedPrice !== undefined) {
        if (body.hasFixedPrice) {
          if (body.fixedPrice !== undefined) {
            updateData.fixedPrice = parseFloat(body.fixedPrice);
          }
          updateData.unitPrices = [];
        } else {
          updateData.fixedPrice = 0;
          if (Array.isArray(body.unitPrices)) {
            updateData.unitPrices = body.unitPrices.map(
              (up: UnitPriceInput) => ({
                unit: up.unit,
                price: parseFloat(up.price.toString()),
              })
            );
          } else {
            updateData.unitPrices = [];
          }
        }
      } else {
        // Handle individual price updates based on existing type
        if (existingProduct.hasFixedPrice && body.fixedPrice !== undefined) {
          updateData.fixedPrice = parseFloat(body.fixedPrice);
        } else if (
          !existingProduct.hasFixedPrice &&
          Array.isArray(body.unitPrices)
        ) {
          updateData.unitPrices = body.unitPrices.map((up: UnitPriceInput) => ({
            unit: up.unit,
            price: parseFloat(up.price.toString()),
          }));
        }
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
        },
      });

      // ✅ Return format that Redux expects
      return NextResponse.json({
        id: updatedProduct.id,
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Products PUT error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);

export const PATCH = requireAdminDynamic(
  async (
    request: AuthenticatedRequest,
    ctx: RouteContext
  ) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const user = request.user;
      const params = await ctx.params; // Await the params promise first
      const { id } = params; // Then destructure
      const body = await request.json();

      // Extract only the status field from the request body
      const { status } = body;

      // Validate that status is provided and is a valid value
      if (!status) {
        return NextResponse.json(
          { error: "Status is required" },
          { status: 400 }
        );
      }

      const validStatuses = ["ACTIVE", "INACTIVE"];
      if (!validStatuses.includes(status.toUpperCase())) {
        return NextResponse.json(
          { error: "Invalid status value. Must be ACTIVE or INACTIVE" },
          { status: 400 }
        );
      }

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Update only the status field and return the full product
      const product = (await prisma.product.update({
        where: { id },
        data: {
          status: status.toUpperCase(),
        },
        include: {
          category: true,
          reviews: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          // unitPrices: true,
        },
      })) as unknown as ProductWithRelations;

      const productWithUnitPrices = await prisma.product.findUnique({
        where: { id },
      });

      console.log(productWithUnitPrices?.unitPrices); // available here

      // Calculate average rating
      const averageRating =
        product.reviews.length > 0
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
            product.reviews.length
          : 0;

      return NextResponse.json({
        ...product,
        averageRating: averageRating, // This will be a number or 0
        reviewCount: product.reviews.length,
      });
    } catch (error) {
      console.error("Product status update error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }
);



// export const DELETE = requireAdminDynamic<{ id: string }>(
//   async (
//     request: AuthenticatedRequest,
//     ctx: RouteContext<{ id: string }>
//   ) => {
//     try {
//       // eslint-disable-next-line @typescript-eslint/no-unused-vars
//       const user = request.user;
//       const params = await ctx.params; // Await the params promise first
//       const { id } = params; // Then destructure

//       if (!id) {
//         return NextResponse.json(
//           { error: "Product ID is required" },
//           { status: 400 }
//         );
//       }

//       // Check if product exists and get its data (including images)
//       const existingProduct = await prisma.product.findUnique({
//         where: { id },
//         select: {
//           id: true,
//           name: true,
//           images: true,
//         },
//       });

//       if (!existingProduct) {
//         return NextResponse.json({ error: "Product not found" }, { status: 404 });
//       }

//       // Collect all image URLs to delete
//       const imagesToDelete: string[] = [];

//       // Add all images from the images array
//       if (existingProduct.images && Array.isArray(existingProduct.images)) {
//         imagesToDelete.push(
//           ...existingProduct.images.filter((url) => url && url.trim() !== "")
//         );
//       }

//       // ✅ REMOVED: Cloudinary deletion logic here
//       // Images will be deleted through the separate image deletion endpoint

//       // Hard delete the product from database
//       const deletedProduct = await prisma.product.delete({
//         where: { id },
//       });

//       return NextResponse.json({
//         success: true,
//         message: "Product deleted successfully",
//         id: deletedProduct.id,
//         product: {
//           id: deletedProduct.id,
//           name: existingProduct.name,
//           deletedImages: imagesToDelete.length,
//         },
//       });
//     } catch (error) {
//       console.error("Products DELETE error:", error);

//       if (error instanceof Error) {
//         if (error.message.includes("Foreign key constraint")) {
//           return NextResponse.json(
//             {
//               error:
//                 "Cannot delete product: it may be referenced by orders or other records",
//             },
//             { status: 409 }
//           );
//         }
//       }

//       return NextResponse.json(
//         { error: "Internal server error" },
//         { status: 500 }
//       );
//     }
//   }
// );