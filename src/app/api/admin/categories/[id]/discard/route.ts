// api/admin/categories/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { initCloudinary, deleteImage } from "@/lib/cloudinary";

// Initialize Cloudinary
initCloudinary({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  apiKey: process.env.CLOUDINARY_API_KEY!,
  apiSecret: process.env.CLOUDINARY_API_SECRET!,
  folder: process.env.CLOUDINARY_CATEGORIES_PRESET || "categories",
});

// =============================================
// DELETE IMAGE ENDPOINT
// =============================================

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log("🗑️ Delete image API called for category:", id);
  
  try {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true, image: true }
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    if (!category.image) {
      return NextResponse.json(
        { error: "No image to delete" },
        { status: 400 }
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

    const publicId = extractPublicIdFromUrl(category.image);
    
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

    // Remove image from category (set to null)
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: { image: null }, // Set image to null since it's a single field
    });

    console.log(`✅ Image removed from category ${id}`);

    return NextResponse.json({
      success: true,
      category: updatedCategory,
      deletedUrl: category.image,
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