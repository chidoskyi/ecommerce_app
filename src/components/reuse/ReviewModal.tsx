"use client";

import { Star, X, Upload, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useDispatch } from "react-redux";
import { clearErrors } from "@/app/store/slices/reviewSlice";
import type { ReviewFormData, ReviewModalProps } from "@/types/reviews";
import Image from "next/image";
import { useParams } from "next/navigation";

export const ReviewModal = ({
  show,
  onClose,
  onSubmit,
  loading = false,
  error = null,
}: ReviewModalProps) => {
  const dispatch = useDispatch();
  
  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [hoverRating, setHoverRating] = useState(0);
  const params = useParams<{ productId: string }>();
  if (!params) {
    throw new Error('No route parameters found');
  }
  const { productId } = params;
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form validation
  const isValid = rating > 0 && title.trim() && content.trim() && authorName.trim();

  // Clear errors when modal opens
  useEffect(() => {
    if (show) {
      dispatch(clearErrors("createReview"));
    }
  }, [show, dispatch]);

  // Handle star click with half-star support
  const handleStarClick = (starIndex: number, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const starWidth = rect.width;
    const isLeftHalf = clickX < starWidth / 2;
    
    const newRating = isLeftHalf ? starIndex - 0.5 : starIndex;
    setRating(newRating);
  };

  // Handle star hover with half-star support
  const handleStarHover = (starIndex: number, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const hoverX = event.clientX - rect.left;
    const starWidth = rect.width;
    const isLeftHalf = hoverX < starWidth / 2;
    
    const newHoverRating = isLeftHalf ? starIndex - 0.5 : starIndex;
    setHoverRating(newHoverRating);
  };

  // Render individual star
  const renderStar = (starIndex: number) => {
    const currentRating = hoverRating || rating;
    const isFullStar = currentRating >= starIndex;
    const isHalfStar = currentRating >= starIndex - 0.5 && currentRating < starIndex;
    
    return (
      <button
        key={starIndex}
        type="button"
        onClick={(e) => handleStarClick(starIndex, e)}
        onMouseMove={(e) => handleStarHover(starIndex, e)}
        onMouseLeave={() => setHoverRating(0)}
        disabled={loading}
        className="focus:outline-none transition-transform hover:scale-110 disabled:cursor-not-allowed relative cursor-pointer"
      >
        {isHalfStar ? (
          <div className="relative">
            <Star size={32} className="text-gray-300" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star size={32} className="fill-orange-400 text-orange-400" />
            </div>
          </div>
        ) : (
          <Star
            size={32}
            className={
              isFullStar
                ? "fill-orange-400 text-orange-400"
                : "text-gray-300 hover:text-orange-300"
            }
          />
        )}
      </button>
    );
  };

  // Get rating text
  const getRatingText = (ratingValue: number) => {
    if (ratingValue === 0) return "";
    if (ratingValue <= 1) return "Poor";
    if (ratingValue <= 2) return "Fair";
    if (ratingValue <= 3) return "Good";
    if (ratingValue <= 4) return "Very Good";
    return "Excellent";
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5); // Limit to 5 images
      const validFiles = files.filter(file => {
        // Validate file type and size (max 5MB)
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 5 * 1024 * 1024;
        return isValidType && isValidSize;
      });

      setImages(validFiles);

      // Create preview URLs
      const previewUrls = validFiles.map((file) => URL.createObjectURL(file));
      setPreviews(previewUrls);
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    const newImages = [...images];
    const newPreviews = [...previews];
    
    // Revoke URL to prevent memory leaks
    URL.revokeObjectURL(newPreviews[index]);
    
    newImages.splice(index, 1);
    newPreviews.splice(index, 1);
    
    setImages(newImages);
    setPreviews(newPreviews);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isValid || loading) return;

    // Convert images to base64 for API submission
    const imagePromises = images.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    try {
      const base64Images = await Promise.all(imagePromises);
      
      const reviewData: ReviewFormData = {
        productId, // From URL
        rating,
        title: title.trim(),
        content: content.trim(),
        author: authorName.trim(),
        images: base64Images,
      };

      onSubmit(reviewData);
    } catch (error) {
      console.error("Failed to process images:", error);
    }
  };

  // Reset form
  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setTitle("");
    setAuthorName("");
    setContent("");
    setImages([]);
    setPreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle close
  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      handleClose();
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[2000]"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl transform transition-all duration-300 ease-in-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">
            Write a Review
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          Share your experience with this product to help other customers make informed decisions.
        </p>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Unable to submit review</h3>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Rating */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Rating <span className="text-red-500">*</span>
          </h3>
          <div className="flex space-x-1 cursor-pointer">
            {[1, 2, 3, 4, 5].map((star) => renderStar(star))}
          </div>
          <div className="flex items-center justify-between mt-2">
            {(hoverRating > 0 || rating > 0) && (
              <p className="text-sm text-gray-600  cursor-pointer">
                {hoverRating > 0 ? (
                  <span className="font-medium">
                    {hoverRating} star{hoverRating !== 1 ? 's' : ''} - {getRatingText(hoverRating)}
                  </span>
                ) : (
                  <span>
                    {rating} star{rating !== 1 ? 's' : ''} - {getRatingText(rating)}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Author Name */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Your Name <span className="text-red-500">*</span>
          </h3>
          <input
            type="text"
            placeholder="Enter your name (will be displayed publicly)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            maxLength={50}
          />
          <p className="text-xs text-gray-500 mt-1">
            {authorName.length}/50 characters
          </p>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Review Title <span className="text-red-500">*</span>
          </h3>
          <input
            type="text"
            placeholder="Summarize your experience in a few words"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            {title.length}/100 characters
          </p>
        </div>

        {/* Review Content */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Detailed Review <span className="text-red-500">*</span>
          </h3>
          <textarea
            placeholder="Tell us about your experience with this product. What did you like? What could be improved?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {content.length}/1000 characters
          </p>
        </div>

        {/* Upload Images */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Add Photos (Optional)
          </h3>

          {/* Image Previews */}
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <Image
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    width={50}
                    height={50}
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={loading}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:cursor-not-allowed"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            className={`border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors ${
              loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-400'
            }`}
            onClick={() => !loading && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={loading}
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="text-gray-400" size={24} />
              <span className="text-gray-600 font-medium">
                Click to upload images
              </span>
              <span className="text-gray-500 text-sm">or drag and drop</span>
              <span className="text-gray-400 text-xs">
                PNG, JPG, GIF up to 5MB each (max 5 images)
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer" 
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{loading ? "Submitting..." : "Submit Review"}</span>
          </button>
        </div>

        {/* Required fields note */}
        <p className="text-xs text-gray-500 mt-4">
          <span className="text-red-500">*</span> Required fields
        </p>
      </div>
    </div>
  );
};