// api/admin/products/[id]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadImage, initCloudinary } from "@/lib/cloudinary";

// Initialize Cloudinary
initCloudinary({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
  apiKey: process.env.CLOUDINARY_API_KEY!,
  apiSecret: process.env.CLOUDINARY_API_SECRET!,
  folder: process.env.CLOUDINARY_PRODUCTS_PRESET || "products",
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // FIXED: Made params a Promise
) {
  // FIXED: Await params before using
  const { id } = await params;
  console.log("📤 Upload API called for product:", id);
  
  try {
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

    // Parse FormData
    const formData = await req.formData();
    const files = formData.getAll("images") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No images provided" },
        { status: 400 }
      );
    }

    console.log(`📁 Found ${files.length} files to upload`);

    // Upload files to Cloudinary
    const uploadPromises = files.map(async (file, index) => {
      console.log(`📤 Uploading file ${index + 1}: ${file.name}`);
      
      try {
        // Convert File to base64 data URI
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUri = `data:${file.type};base64,${base64}`;

        const result = await uploadImage(dataUri, {
          folder: "products",
          publicId: `product_${id}_${Date.now()}_${index}`, // FIXED: Use awaited id
        });

        console.log(`✅ Upload ${index + 1} successful:`, result.secureUrl);
        return result.secureUrl;
      } catch (error) {
        console.error(`❌ Upload ${index + 1} failed:`, error);
        throw error;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    console.log(`✅ All uploads completed: ${uploadedUrls.length} images`);

    // Get current images and append new ones
    const currentImages = Array.isArray(product.images) ? product.images : [];
    const allImages = [...currentImages, ...uploadedUrls];

    // Update product with new images
    const updatedProduct = await prisma.product.update({
      where: { id }, // FIXED: Use awaited id
      data: { images: allImages },
      include: { category: true },
    });

    console.log(`✅ Product ${id} updated with ${uploadedUrls.length} new images`);

    return NextResponse.json({
      success: true,
      urls: uploadedUrls,
      product: updatedProduct,
      totalImages: allImages.length,
    });

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
