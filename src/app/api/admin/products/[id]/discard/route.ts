// api/admin/products/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
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
// DELETE IMAGE ENDPOINT
// =============================================


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIXED: Made params a Promise
) {
  // FIXED: Await params before using
  const { id } = await params;
  console.log("🗑️ Delete image API called for product:", id);
  
  try {
    const { imageUrl } = await req.json();

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
        const regex = /\/v\d+\/(.+?)\.(jpg|jpeg|png|gif|webp)$/i;
        const match = url.match(regex);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    }

    const publicId = extractPublicIdFromUrl(imageUrl);
    
    // Delete from Cloudinary
    if (publicId) {
      try {
        await deleteImage(publicId);
        console.log(`✅ Deleted from Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        console.error("⚠️ Cloudinary deletion failed:", cloudinaryError);
        // Continue with database update even if Cloudinary deletion fails
      }
    }

    // Remove from product images array
    const currentImages = Array.isArray(product.images) ? product.images : [];
    const updatedImages = currentImages.filter(img => img !== imageUrl);

    // Update product
    const updatedProduct = await prisma.product.update({
      where: { id }, // FIXED: Use awaited id
      data: { images: updatedImages },
      include: { category: true },
    });

    console.log(`✅ Image removed from product ${id}`);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      deletedUrl: imageUrl,
      remainingImages: updatedImages.length,
    });

  } catch (error) {
    console.error("❌ Delete image API error:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete image",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}