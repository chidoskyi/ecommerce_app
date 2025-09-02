// api/admin/categories/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadImage, initCloudinary } from "@/lib/cloudinary";

// Initialize Cloudinary
initCloudinary({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  apiKey: process.env.CLOUDINARY_API_KEY!,
  apiSecret: process.env.CLOUDINARY_API_SECRET!,
  folder: process.env.CLOUDINARY_CATEGORIES_PRESET || "categories",
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  
  const { id } = await params;
  console.log("📤 Upload API called for category:", id);
  
  try {
    
    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true, image: true }
    });

    if (!category) {
      return NextResponse.json(
        { error: "category not found" },
        { status: 404 }
      );
    }

    // Parse FormData - expecting single image
    const formData = await req.formData();
    const file = formData.get("image") as File; // Changed to get single file

    if (!file) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    console.log(`📁 Uploading file: ${file.name}`);

    // Upload single file to Cloudinary
    try {
      // Convert File to base64 data URI
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const dataUri = `data:${file.type};base64,${base64}`;

      const result = await uploadImage(dataUri, {
        folder: "categories",
        publicId: `category_${id}_${Date.now()}`,
      });

      console.log(`✅ Upload successful:`, result.secureUrl);

      // Update category with new image (replaces existing)
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: { image: result.secureUrl }, // Single image as string
      });

      console.log(`✅ Category ${id} updated with new image`);

      return NextResponse.json({
        success: true,
        url: result.secureUrl,
        category: updatedCategory,
      });

    } catch (uploadError) {
      console.error(`❌ Upload failed:`, uploadError);
      throw uploadError;
    }

  } catch (error) {
    console.error("❌ Upload API error:", error);
    return NextResponse.json(
      { 
        error: "Image upload failed",
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}