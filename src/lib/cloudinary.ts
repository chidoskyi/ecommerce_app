/**
 * Cloudinary Upload Library - TypeScript Edition
 * Simple, reusable library for uploading images to Cloudinary
 */

// Types and Interfaces
export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  folder?: string;
  apiKey?: string;
  apiSecret?: string;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string | string[];
  transformation?: Record<string, any>;
  eager?: string;
}

export interface DestroyOptions {
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  type?: 'upload' | 'private' | 'authenticated';
  invalidate?: boolean;
}

export interface DestroyResponse {
  result: 'ok' | 'not found';
  partial?: boolean;
}

export interface CloudinaryResponse {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  tags: string[];
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  folder: string;
  original_filename: string;
}

export interface ImageTransformation {
  width?: number;
  height?: number;
  crop?: 'scale' | 'fit' | 'limit' | 'mfit' | 'fill' | 'lfill' | 'pad' | 'lpad' | 'mpad' | 'crop' | 'thumb' | 'imagga_crop' | 'imagga_scale';
  quality?: number | 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low';
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'gif' | 'svg' | 'bmp' | 'tiff';
  gravity?: 'auto' | 'center' | 'face' | 'faces' | 'north' | 'south' | 'east' | 'west' | 'north_east' | 'north_west' | 'south_east' | 'south_west';
  radius?: number | 'max';
  opacity?: number;
  angle?: number;
  [key: string]: any;
}

// Upload types enum for better type safety
export enum UploadType {
  CATEGORY = 'category',
  PRODUCT = 'product',
}

// Configuration for different upload types
const UPLOAD_CONFIGS = {
  [UploadType.CATEGORY]: {
    preset: process.env.CLOUDINARY_CATEGORIES_PRESET!,
    folder: 'categories',
    tags: ['category', 'admin-upload']
  },
  [UploadType.PRODUCT]: {
    preset: process.env.CLOUDINARY_PRODUCTS_PRESET!,
    folder: 'products',
    tags: ['product', 'admin-upload']
  },
} as const;

export type ProgressCallback = (progress: number) => void;

export class CloudinaryUploader {
  private cloudName: string;
  private uploadPreset: string;
  private folder: string;
  private baseUrl: string;
  private destroyUrl: string;
  private apiKey?: string;
  private apiSecret?: string;

  constructor(config: CloudinaryConfig) {
    if (!config.cloudName || !config.uploadPreset) {
      throw new Error('cloudName and uploadPreset are required');
    }
    
    this.cloudName = config.cloudName;
    this.uploadPreset = config.uploadPreset;
    this.folder = config.folder || '';
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
    this.destroyUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`;
  }

  /**
   * Generate signature for authenticated requests
   */
  private generateSignature(params: Record<string, any>, timestamp: number): string {
    if (!this.apiSecret) {
      throw new Error('API secret is required for destroy operations');
    }

    // Sort parameters and create query string
    const sortedParams = Object.keys(params)
      .filter(key => key !== 'api_key' && key !== 'signature')
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const stringToSign = `${sortedParams}&timestamp=${timestamp}${this.apiSecret}`;
    
    // You'll need to implement SHA-1 hashing here
    // For browser environments, you can use the Web Crypto API
    // For Node.js, you can use the crypto module
    return this.sha1Hash(stringToSign);
  }

  /**
   * Simple SHA-1 implementation (for demonstration)
   * In production, use a proper crypto library
   */
  private sha1Hash(str: string): string {
    // This is a simplified implementation
    // In a real application, use crypto.createHash('sha1') in Node.js
    // or Web Crypto API in browsers
    return 'placeholder_signature'; // Replace with actual SHA-1 implementation
  }

  /**
   * Destroy/delete image from Cloudinary
   */
  async destroy(publicId: string, options: DestroyOptions = {}): Promise<DestroyResponse> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('API key and secret are required for destroy operations');
    }

    try {
      const timestamp = Math.round(Date.now() / 1000);
      
      const params = {
        public_id: publicId,
        timestamp: timestamp,
        api_key: this.apiKey,
        ...options
      };

      const signature = this.generateSignature(params, timestamp);
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', this.apiKey);
      formData.append('signature', signature);

      if (options.resourceType) {
        formData.append('resource_type', options.resourceType);
      }
      if (options.type) {
        formData.append('type', options.type);
      }
      if (options.invalidate) {
        formData.append('invalidate', 'true');
      }

      const response = await fetch(this.destroyUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Destroy failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Cloudinary destroy failed: ${(error as Error).message}`);
    }
  }

  /**
   * Destroy multiple images
   */
  async destroyMultiple(publicIds: string[], options: DestroyOptions = {}): Promise<DestroyResponse[]> {
    try {
      const destroyPromises = publicIds.map(publicId => 
        this.destroy(publicId, options)
      );
      
      return await Promise.all(destroyPromises);
    } catch (error) {
      throw new Error(`Multiple destroy failed: ${(error as Error).message}`);
    }
  }

  /**
   * Upload single image
   */
  async upload(file: File, options: UploadOptions = {}): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      
      if (options.folder || this.folder) {
        formData.append('folder', options.folder || this.folder);
      }
      
      if (options.publicId) {
        formData.append('public_id', options.publicId);
      }
      
      if (options.tags) {
        const tags = Array.isArray(options.tags) ? options.tags.join(',') : options.tags;
        formData.append('tags', tags);
      }

      if (options.transformation) {
        formData.append('transformation', JSON.stringify(options.transformation));
      }

      if (options.eager) {
        formData.append('eager', options.eager);
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Upload failed: ${response.status}`);
      }

      const data: CloudinaryResponse = await response.json();
      return data.secure_url;

    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Upload image by type with predefined configuration
   */
  async uploadByType(file: File, uploadType: UploadType, additionalOptions: UploadOptions = {}): Promise<string> {
    const config = UPLOAD_CONFIGS[uploadType];
    
    const options: UploadOptions = {
      folder: config.folder,
      tags: config.tags,
      ...additionalOptions
    };

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.preset);
      
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      
      if (options.publicId) {
        formData.append('public_id', options.publicId);
      }
      
      if (options.tags) {
        const tags = Array.isArray(options.tags) ? options.tags.join(',') : options.tags;
        formData.append('tags', tags);
      }

      if (options.transformation) {
        formData.append('transformation', JSON.stringify(options.transformation));
      }

      if (options.eager) {
        formData.append('eager', options.eager);
      }

      const response = await fetch(this.baseUrl.replace(this.uploadPreset, config.preset), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Upload failed: ${response.status}`);
      }

      const data: CloudinaryResponse = await response.json();
      return data.secure_url;

    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Upload multiple images by type
   */
  async uploadMultipleByType(files: File[], uploadType: UploadType, additionalOptions: UploadOptions = {}): Promise<string[]> {
    try {
      const uploadPromises = files.map((file, index) => 
        this.uploadByType(file, uploadType, {
          ...additionalOptions,
          publicId: additionalOptions.publicId ? `${additionalOptions.publicId}_${index}` : undefined
        })
      );
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new Error(`Multiple upload by type failed: ${(error as Error).message}`);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultiple(files: File[], options: UploadOptions = {}): Promise<string[]> {
    try {
      const uploadPromises = files.map((file, index) => 
        this.upload(file, {
          ...options,
          publicId: options.publicId ? `${options.publicId}_${index}` : undefined
        })
      );
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      throw new Error(`Multiple upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Upload with progress tracking
   */
  async uploadWithProgress(
    file: File, 
    onProgress: ProgressCallback, 
    options: UploadOptions = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      
      if (options.folder || this.folder) {
        formData.append('folder', options.folder || this.folder);
      }

      if (options.publicId) {
        formData.append('public_id', options.publicId);
      }

      if (options.tags) {
        const tags = Array.isArray(options.tags) ? options.tags.join(',') : options.tags;
        formData.append('tags', tags);
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result: CloudinaryResponse = JSON.parse(xhr.responseText);
            resolve(result.secure_url);
          } catch (error) {
            reject(new Error('Invalid response from Cloudinary'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.open('POST', this.baseUrl);
      xhr.send(formData);
    });
  }

  /**
   * Upload with progress tracking by type
   */
  async uploadWithProgressByType(
    file: File, 
    uploadType: UploadType,
    onProgress: ProgressCallback, 
    additionalOptions: UploadOptions = {}
  ): Promise<string> {
    const config = UPLOAD_CONFIGS[uploadType];
    
    const options: UploadOptions = {
      folder: config.folder,
      tags: config.tags,
      ...additionalOptions
    };

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.preset);
      
      if (options.folder) {
        formData.append('folder', options.folder);
      }

      if (options.publicId) {
        formData.append('public_id', options.publicId);
      }

      if (options.tags) {
        const tags = Array.isArray(options.tags) ? options.tags.join(',') : options.tags;
        formData.append('tags', tags);
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const result: CloudinaryResponse = JSON.parse(xhr.responseText);
            resolve(result.secure_url);
          } catch (error) {
            reject(new Error('Invalid response from Cloudinary'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  }

  /**
   * Get full Cloudinary response (not just URL)
   */
  async uploadFull(file: File, options: UploadOptions = {}): Promise<CloudinaryResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', this.uploadPreset);
      
      if (options.folder || this.folder) {
        formData.append('folder', options.folder || this.folder);
      }
      
      if (options.publicId) {
        formData.append('public_id', options.publicId);
      }
      
      if (options.tags) {
        const tags = Array.isArray(options.tags) ? options.tags.join(',') : options.tags;
        formData.append('tags', tags);
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Upload failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get full Cloudinary response by type
   */
  async uploadFullByType(file: File, uploadType: UploadType, additionalOptions: UploadOptions = {}): Promise<CloudinaryResponse> {
    const config = UPLOAD_CONFIGS[uploadType];
    
    const options: UploadOptions = {
      folder: config.folder,
      tags: config.tags,
      ...additionalOptions
    };

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', config.preset);
      
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      
      if (options.publicId) {
        formData.append('public_id', options.publicId);
      }
      
      if (options.tags) {
        const tags = Array.isArray(options.tags) ? options.tags.join(',') : options.tags;
        formData.append('tags', tags);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Upload failed: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      throw new Error(`Cloudinary upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate optimized image URL from existing Cloudinary image
   */
  getOptimizedUrl(publicId: string, transformations: ImageTransformation = {}): string {
    const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/`;
    
    const transforms: string[] = [];
    
    // Add common optimizations if not specified
    if (!transformations.quality) transforms.push('q_auto');
    if (!transformations.format) transforms.push('f_auto');
    
    // Add custom transformations
    Object.entries(transformations).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const shortKey = this.getTransformationKey(key);
        transforms.push(`${shortKey}_${value}`);
      }
    });

    const transformString = transforms.length > 0 ? transforms.join(',') + '/' : '';
    return `${baseUrl}${transformString}${publicId}`;
  }

  /**
   * Get transformation key shortcuts
   */
  private getTransformationKey(key: string): string {
    const keyMap: Record<string, string> = {
      width: 'w',
      height: 'h',
      crop: 'c',
      quality: 'q',
      format: 'f',
      gravity: 'g',
      radius: 'r',
      opacity: 'o',
      angle: 'a'
    };
    return keyMap[key] || key;
  }

  /**
   * Get upload configuration for a specific type
   */
  static getUploadConfig(uploadType: UploadType) {
    return UPLOAD_CONFIGS[uploadType];
  }
}

// Singleton instance for global use
let globalUploader: CloudinaryUploader | null = null;

/**
 * Initialize global Cloudinary uploader
 */
export const initCloudinary = (config: CloudinaryConfig): CloudinaryUploader => {
  globalUploader = new CloudinaryUploader(config);
  return globalUploader;
};

/**
 * Quick upload function using global instance
 */
export const uploadImage = async (file: File, options: UploadOptions = {}): Promise<string> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.upload(file, options);
};

/**
 * Quick upload by type using global instance
 */
export const uploadImageByType = async (file: File, uploadType: UploadType, options: UploadOptions = {}): Promise<string> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.uploadByType(file, uploadType, options);
};

/**
 * Quick destroy function using global instance
 */
export const destroyImage = async (publicId: string, options: DestroyOptions = {}): Promise<DestroyResponse> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.destroy(publicId, options);
};

/**
 * Quick destroy multiple function using global instance
 */
export const destroyMultipleImages = async (publicIds: string[], options: DestroyOptions = {}): Promise<DestroyResponse[]> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.destroyMultiple(publicIds, options);
};

/**
 * Quick multiple upload function using global instance
 */
export const uploadMultipleImages = async (files: File[], options: UploadOptions = {}): Promise<string[]> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.uploadMultiple(files, options);
};

/**
 * Quick multiple upload by type using global instance
 */
export const uploadMultipleImagesByType = async (files: File[], uploadType: UploadType, options: UploadOptions = {}): Promise<string[]> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.uploadMultipleByType(files, uploadType, options);
};

/**
 * Upload with progress using global instance
 */
export const uploadImageWithProgress = async (
  file: File, 
  onProgress: ProgressCallback, 
  options: UploadOptions = {}
): Promise<string> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.uploadWithProgress(file, onProgress, options);
};

/**
 * Upload with progress by type using global instance
 */
export const uploadImageWithProgressByType = async (
  file: File, 
  uploadType: UploadType,
  onProgress: ProgressCallback, 
  options: UploadOptions = {}
): Promise<string> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.uploadWithProgressByType(file, uploadType, onProgress, options);
};

/**
 * Get full response using global instance
 */
export const uploadImageFull = async (file: File, options: UploadOptions = {}): Promise<CloudinaryResponse> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.uploadFull(file, options);
};

/**
 * Get full response by type using global instance
 */
export const uploadImageFullByType = async (file: File, uploadType: UploadType, options: UploadOptions = {}): Promise<CloudinaryResponse> => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return await globalUploader.uploadFullByType(file, uploadType, options);
};

/**
 * Get optimized image URL using global instance
 */
export const getOptimizedImageUrl = (publicId: string, transformations: ImageTransformation = {}): string => {
  if (!globalUploader) {
    throw new Error('Cloudinary not initialized. Call initCloudinary() first.');
  }
  return globalUploader.getOptimizedUrl(publicId, transformations);
};

/**
 * Direct upload function (no global instance needed)
 */
export const directUpload = async (
  file: File, 
  cloudName: string, 
  uploadPreset: string, 
  options: UploadOptions = {}
): Promise<string> => {
  const uploader = new CloudinaryUploader({ cloudName, uploadPreset });
  return await uploader.upload(file, options);
};

/**
 * Direct upload by type (no global instance needed)
 */
export const directUploadByType = async (
  file: File, 
  cloudName: string, 
  uploadType: UploadType,
  options: UploadOptions = {}
): Promise<string> => {
  const uploader = new CloudinaryUploader({ cloudName, uploadPreset: 'dummy' }); // preset will be overridden
  return await uploader.uploadByType(file, uploadType, options);
};

/**
 * Direct destroy function (no global instance needed)
 */
export const directDestroy = async (
  publicId: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string,
  options: DestroyOptions = {}
): Promise<DestroyResponse> => {
  const uploader = new CloudinaryUploader({ 
    cloudName, 
    uploadPreset: 'dummy', // not needed for destroy
    apiKey,
    apiSecret
  });
  return await uploader.destroy(publicId, options);
};

/**
 * Get upload configuration
 */
export const getUploadConfig = (uploadType: UploadType) => {
  return UPLOAD_CONFIGS[uploadType];
};

// Utility types for common use cases
export type UploadResult = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

// Helper function to extract common properties
export const getUploadResult = (response: CloudinaryResponse): UploadResult => ({
  url: response.secure_url,
  publicId: response.public_id,
  width: response.width,
  height: response.height,
  format: response.format,
  bytes: response.bytes
});

// Common transformation presets
export const TRANSFORMATION_PRESETS: Record<string, ImageTransformation> = {
  thumbnail: { width: 150, height: 150, crop: 'thumb', gravity: 'face' },
  avatar: { width: 200, height: 200, crop: 'fill', gravity: 'face', radius: 'max' },
  small: { width: 300, crop: 'scale' },
  medium: { width: 600, crop: 'scale' },
  large: { width: 1200, crop: 'scale' },
  hero: { width: 1920, height: 1080, crop: 'fill' },
  card: { width: 400, height: 300, crop: 'fill' },
  optimized: { quality: 'auto', format: 'auto' }
};

// Default export
export default {
  CloudinaryUploader,
  initCloudinary,
  uploadImage,
  uploadImageByType,
  destroyImage,
  destroyMultipleImages,
  uploadMultipleImages,
  uploadMultipleImagesByType,
  uploadImageWithProgress,
  uploadImageWithProgressByType,
  uploadImageFull,
  uploadImageFullByType,
  getOptimizedImageUrl,
  directUpload,
  directUploadByType,
  directDestroy,
  getUploadResult,
  getUploadConfig,
  UploadType,
  TRANSFORMATION_PRESETS
};