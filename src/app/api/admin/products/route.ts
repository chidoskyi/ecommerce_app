import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/middleware";
import { slugify } from "@/lib/slugify";
import {
  deleteCloudinaryImage,
  handleImageUploads,
  parseFormDataWithFiles,
} from "../../products/route";

export async function POST(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    // Parse request data (handles both JSON and FormData)
    const body = await parseFormDataWithFiles(request);

    const {
      name,
      description,
      hasFixedPrice = true,
      priceType = "FIXED",
      fixedPrice,
      unitPrices,
      sku,
      categoryId,
      images = [],
      uploadedImages = [], // From file uploads
      slug,
      isFeatured = false,
      isFruit = false,
      isVegetable = false,
      isTrending = false,
      isDealOfTheDay = false,
      isNewArrival = false,
      status = "ACTIVE",
    } = body;

    // Validation
    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    if (hasFixedPrice && !fixedPrice) {
      return NextResponse.json(
        { error: "Fixed price is required when hasFixedPrice is true" },
        { status: 400 }
      );
    }

    if (!hasFixedPrice && !unitPrices) {
      return NextResponse.json(
        { error: "Unit prices are required when hasFixedPrice is false" },
        { status: 400 }
      );
    }

    // Check if SKU exists
    if (sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 400 }
        );
      }
    }

    // Handle image uploads
    let finalImages: string[] = [];

    // Combine existing images and newly uploaded images
    if (Array.isArray(images)) {
      const existingImageUrls = await handleImageUploads(images);
      finalImages = [...finalImages, ...existingImageUrls];
    }

    if (Array.isArray(uploadedImages)) {
      finalImages = [...finalImages, ...uploadedImages];
    }

    // Prepare base product data
    const productData: any = {
      name,
      description,
      hasFixedPrice: Boolean(hasFixedPrice),
      priceType,
      sku,
      images: finalImages,
      slug: slug || slugify(name),
      isFruit: Boolean(isFruit),
      isVegetable: Boolean(isVegetable),
      isTrending: Boolean(isTrending),
      isFeatured: Boolean(isFeatured),
      isDealOfTheDay: Boolean(isDealOfTheDay),
      isNewArrival: Boolean(isNewArrival),
      status: status.toUpperCase(),
    };

    // Handle category relationship
    if (categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!categoryExists) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 }
        );
      }

      productData.category = {
        connect: { id: categoryId },
      };
    }

    const validateUnitPrices = (unitPrices: any) => {
      if (!unitPrices) return [];

      // Handle array format
      if (Array.isArray(unitPrices)) {
        return unitPrices.map((up) => ({
          unit: up.unit,
          price: parseFloat(up.price),
        }));
      }

      // Handle object with options array
      if (unitPrices.options && Array.isArray(unitPrices.options)) {
        return unitPrices.options.map((up: any) => ({
          unit: up.unit,
          price: parseFloat(up.price),
        }));
      }

      // Handle JSON string
      if (typeof unitPrices === "string") {
        try {
          const parsed = JSON.parse(unitPrices);
          return validateUnitPrices(parsed);
        } catch {
          return [];
        }
      }

      return [];
    };

    // Handle pricing based on type
    if (hasFixedPrice) {
      productData.fixedPrice = parseFloat(fixedPrice);
      productData.unitPrices = [];
    } else {
      productData.fixedPrice = 0;
      productData.unitPrices = validateUnitPrices(unitPrices);
      // if (Array.isArray(unitPrices) && unitPrices.length > 0) {
      //   productData.unitPrices = unitPrices.map((up) => ({
      //     unit: up.unit,
      //     price: parseFloat(up.price),
      //   }));
      // } else if (unitPrices?.options) {
      //   productData.unitPrices = unitPrices.options.map((up) => ({
      //     unit: up.unit,
      //     price: parseFloat(up.price),
      //   }));
      // } else {
      //   productData.unitPrices = [];
      // }
    }

    const product = await prisma.product.create({
      data: productData,
      include: {
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
export async function PUT(request: NextRequest) {
  try {
    // Apply admin middleware
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    // const updatedProduct = await prisma.product.update({
    //   where: { id },
    //   data: updateData,
    //   include: {
    //     category: true,
    //   }
    // });

    // Parse request data (handles both JSON and FormData)
    const body = await parseFormDataWithFiles(request);

    const {
      id, // Product ID to update
      name,
      description,
      hasFixedPrice,
      priceType,
      fixedPrice,
      unitPrices,
      sku,
      categoryId,
      images = [],
      uploadedImages = [], // From file uploads
      removeImages = [], // Images to remove
      slug,
      isFeatured,
      isFruit,
      isVegetable,
      isTrending,
      isDealOfTheDay,
      isNewArrival,
      status,
    } = body;

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
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if SKU exists (excluding current product)
    if (sku && sku !== existingProduct.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 400 }
        );
      }
    }

    // Handle image updates
    let finalImages: string[] = [...(existingProduct.images || [])];

    // Remove specified images
    if (Array.isArray(removeImages) && removeImages.length > 0) {
      finalImages = finalImages.filter((img) => !removeImages.includes(img));
    }

    // Add new uploaded images
    if (Array.isArray(images)) {
      const newImageUrls = await handleImageUploads(images);
      finalImages = [...finalImages, ...newImageUrls];
    }

    if (Array.isArray(uploadedImages)) {
      finalImages = [...finalImages, ...uploadedImages];
    }

    // Prepare update data
    const updateData: any = {};

    // Only update fields that are provided
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (hasFixedPrice !== undefined)
      updateData.hasFixedPrice = Boolean(hasFixedPrice);
    if (priceType !== undefined) updateData.priceType = priceType;
    if (sku !== undefined) updateData.sku = sku;
    if (slug !== undefined) updateData.slug = slug;
    if (isFruit !== undefined) updateData.isFruit = Boolean(isFruit);
    if (isVegetable !== undefined)
      updateData.isVegetable = Boolean(isVegetable);
    if (isTrending !== undefined) updateData.isTrending = Boolean(isTrending);
    if (isFeatured !== undefined) updateData.isFeatured = Boolean(isFeatured);
    if (isDealOfTheDay !== undefined)
      updateData.isDealOfTheDay = Boolean(isDealOfTheDay);
    if (isNewArrival !== undefined)
      updateData.isNewArrival = Boolean(isNewArrival);
    if (status !== undefined) updateData.status = status.toUpperCase();

    // Always update images if there were changes
    updateData.images = finalImages;

    // Handle category relationship
    if (categoryId !== undefined) {
      if (categoryId) {
        const categoryExists = await prisma.category.findUnique({
          where: { id: categoryId },
        });

        if (!categoryExists) {
          return NextResponse.json(
            { error: "Category not found" },
            { status: 400 }
          );
        }

        updateData.category = {
          connect: { id: categoryId },
        };
      } else {
        updateData.category = {
          disconnect: true,
        };
      }
    }

    const validateUnitPrices = (unitPrices: any) => {
      if (!unitPrices) return [];

      // Handle array format
      if (Array.isArray(unitPrices)) {
        return unitPrices.map((up) => ({
          unit: up.unit,
          price: parseFloat(up.price),
        }));
      }

      // Handle object with options array
      if (unitPrices.options && Array.isArray(unitPrices.options)) {
        return unitPrices.options.map((up: any) => ({
          unit: up.unit,
          price: parseFloat(up.price),
        }));
      }

      // Handle JSON string
      if (typeof unitPrices === "string") {
        try {
          const parsed = JSON.parse(unitPrices);
          return validateUnitPrices(parsed);
        } catch {
          return [];
        }
      }

      return [];
    };

    // Handle pricing updates
    if (hasFixedPrice !== undefined) {
      if (hasFixedPrice) {
        if (fixedPrice !== undefined) {
          updateData.fixedPrice = parseFloat(fixedPrice);
        }
        updateData.unitPrices = [];
      } else {
        updateData.fixedPrice = 0;

        if (unitPrices !== undefined) {
          if (Array.isArray(unitPrices) && unitPrices.length > 0) {
            updateData.unitPrices = unitPrices.map((up) => ({
              unit: up.unit,
              price: parseFloat(up.price),
            }));
          } else if (unitPrices?.options) {
            updateData.unitPrices = unitPrices.options.map((up) => ({
              unit: up.unit,
              price: parseFloat(up.price),
            }));
          } else {
            updateData.unitPrices = [];
          }
        }
      }
    } else if (fixedPrice !== undefined || unitPrices !== undefined) {
      // Handle price updates based on existing pricing type
      if (existingProduct.hasFixedPrice && fixedPrice !== undefined) {
        updateData.fixedPrice = parseFloat(fixedPrice);
      } else if (!existingProduct.hasFixedPrice && unitPrices !== undefined) {
        if (Array.isArray(unitPrices) && unitPrices.length > 0) {
          updateData.unitPrices = unitPrices.map((up) => ({
            unit: up.unit,
            price: parseFloat(up.price),
          }));
        } else if (unitPrices?.options) {
          updateData.unitPrices = unitPrices.options.map((up) => ({
            unit: up.unit,
            price: parseFloat(up.price),
          }));
        } else {
          updateData.unitPrices = [];
        }
      } else if (unitPrices !== undefined) {
        updateData.unitPrices = validateUnitPrices(unitPrices);
      } else {
        updateData.unitPrices = [];
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
export async function DELETE(request: NextRequest) {
  try {
    // Apply admin middleware first
    const adminCheck = await requireAdmin(request);
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

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
        images: true, // Only select the images array that exists in your schema
        // Add other fields you want to return
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Collect all image URLs to delete
    const imagesToDelete: string[] = [];

    // Add all images from the images array
    if (existingProduct.images && Array.isArray(existingProduct.images)) {
      imagesToDelete.push(
        ...existingProduct.images.filter((url) => url && url.trim() !== "")
      );
    }

    // Delete images from Cloudinary (in parallel for better performance)
    const imageDeletePromises = imagesToDelete.map((url) =>
      deleteCloudinaryImage(url)
    );

    // Wait for all image deletions to complete (but don't fail if some fail)
    await Promise.allSettled(imageDeletePromises);

    // Hard delete the product from database
    const deletedProduct = await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
      id: deletedProduct.id, // ✅ Redux needs this ID field
      product: {
        id: deletedProduct.id,
        name: existingProduct.name,
        deletedImages: imagesToDelete.length,
      },
    });
  } catch (error) {
    console.error("Products DELETE error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Foreign key constraint")) {
        return NextResponse.json(
          {
            error:
              "Cannot delete product: it may be referenced by orders or other records",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
