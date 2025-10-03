// api/admin/products/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AuthenticatedRequest, RouteContext, requireAdminDynamic } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initCloudinary, deleteImage } from "@/lib/cloudinary";

// Initialize Cloudinary
initCloudinary({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  apiKey: process.env.CLOUDINARY_API_KEY!,
  apiSecret: process.env.CLOUDINARY_API_SECRET!,
  folder: process.env.CLOUDINARY_PRODUCTS_PRESET || "products",
});

// =============================================
// DELETE SINGLE IMAGE ENDPOINT
// =============================================
export const DELETE = requireAdminDynamic<{ id: string }>(
  async (
    request: AuthenticatedRequest,
    ctx: RouteContext<{ id: string }>
  ) => {
    try {
      const user = request.user;
      const params = await ctx.params;
      const { id } = params;

      console.log("🗑️ Delete image API called for product:", id);
      console.log("👤 Admin user:", user.email);

      if (!id) {
        return NextResponse.json(
          { error: "Product ID is required" },
          { status: 400 }
        );
      }

      // Get the image URL from request body
      const body = await request.json();
      const { imageUrl } = body;

      if (!imageUrl) {
        return NextResponse.json(
          { error: "Image URL is required" },
          { status: 400 }
        );
      }

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id },
        select: { id: true, images: true }
      });

      if (!product) {
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      // Extract public ID from Cloudinary URL
      function extractPublicIdFromUrl(url: string): string | null {
        try {
          // Handle different Cloudinary URL formats
          const regex = /\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp)$/i;
          const match = url.match(regex);
          return match ? match[1] : null;
        } catch {
          return null;
        }
      }

      const publicId = extractPublicIdFromUrl(imageUrl);
      
      // Delete from Cloudinary first
      if (publicId) {
        try {
          await deleteImage(publicId);
          console.log(`✅ Deleted from Cloudinary: ${publicId}`);
        } catch (cloudinaryError) {
          console.error("⚠️ Cloudinary deletion failed:", cloudinaryError);
          // Continue with database update even if Cloudinary deletion fails
        }
      } else {
        console.warn("⚠️ Could not extract public ID from URL:", imageUrl);
      }

      // Remove from product images array
      const currentImages = Array.isArray(product.images) ? product.images : [];
      const updatedImages = currentImages.filter(img => img !== imageUrl);

      // Update product in database
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { images: updatedImages },
        include: { category: true },
      });

      console.log(`✅ Image removed from product ${id}`);

      return NextResponse.json({
        success: true,
        message: "Image deleted successfully",
        product: updatedProduct,
        deletedUrl: imageUrl,
        remainingImages: updatedImages.length,
      });

    } catch (error) {
      console.error("❌ Delete image API error:", error);
      
      // Handle specific Prisma errors
      if (error instanceof Error) {
        if (error.message.includes("Record to update not found")) {
          return NextResponse.json(
            { error: "Product not found" },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        { 
          error: "Failed to delete image",
          details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }
  }
);