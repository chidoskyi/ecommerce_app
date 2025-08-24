// utils/cloudinary.ts
export const getCloudinaryUrl = (
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    transformations?: string;
  }
) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dgxsqjeun';
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  // Default transformations
  const defaultTransformations = 'c_fill,q_auto,f_auto';
  
  // Custom width/height or transformations
  const transformations = options?.transformations 
    ? options.transformations
    : `w_${options?.width || 800},h_${options?.height || 400},${defaultTransformations}`;
  
  return `${baseUrl}/${transformations}/${publicId}`;
};