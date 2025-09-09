/**
 * Simple Cloudinary Image Upload & Delete Library
 * Just upload images and delete them when needed
 */
import { v2 as cloudinary } from "cloudinary";

// Types
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
  uploadPreset?: string; // For client-side uploads
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
}

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
}

export class CloudinaryUploader {
  private folder?: string;

  constructor(config: CloudinaryConfig) {
    // Configure Cloudinary SDK
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
    
    this.folder = config.folder;
    console.log("✅ Cloudinary configured successfully");
  }

  /**
   * Upload an image
   * @param filePath - Path to the image file or URL
   * @param options - Upload options
   * @returns Upload result with publicId and URLs
   */
  async uploadImage(filePath: string, options: UploadOptions = {}): Promise<UploadResult> {
    try {
      console.log("📤 Uploading image:", filePath);
      
      const result = await cloudinary.uploader.upload(filePath, {
        folder: options.folder || this.folder,
        public_id: options.publicId,
        resource_type: 'image'
      });

      console.log("✅ Upload successful!");
      
      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
      };

    } catch (error) {
      console.error("❌ Upload failed:", error);
      throw new Error(`Upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Delete an image
   * @param publicId - The public ID of the image to delete
   * @returns Success result
   */
  async deleteImage(publicId: string): Promise<{ result: string }> {
    try {
      console.log("🗑️ Deleting image:", publicId);
      
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image'
      });

      console.log("✅ Delete successful!");
      
      return result;

    } catch (error) {
      console.error("❌ Delete failed:", error);
      throw new Error(`Delete failed: ${(error as Error).message}`);
    }
  }
}

// Simple usage functions
let uploader: CloudinaryUploader | null = null;

/**
 * Initialize Cloudinary with your credentials
 */
export const initCloudinary = (config: CloudinaryConfig): void => {
  uploader = new CloudinaryUploader(config);
};

/**
 * Upload an image - simple function
 */
export const uploadImage = async (filePath: string, options: UploadOptions = {}): Promise<UploadResult> => {
  if (!uploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return uploader.uploadImage(filePath, options);
};

/**
 * Delete an image - simple function
 */
export const deleteImage = async (publicId: string): Promise<{ result: string }> => {
  if (!uploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return uploader.deleteImage(publicId);
};

// Default export
// eslint-disable-next-line import/no-anonymous-default-export
export default {
  CloudinaryUploader,
  initCloudinary,
  uploadImage,
  deleteImage
};