import React from "react";
import {
  updateReview,
  deleteReview,
  clearSelectedReviews,
  toggleReviewSelection,
  selectAllReviews,
  selectSelectedReviews,
  selectIsReviewUpdating,
  selectIsReviewDeleting,
  selectIsAllReviewsSelected,
} from "@/app/store/slices/adminReviewSlice";
import {
  Check,
  X,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  AlertTriangle,
  Calendar,
  User,
  Package,
  MoreVertical,
} from "lucide-react";
import { Review } from "@/types/reviews";
import { StarRating } from "@/components/reuse/StarRating";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";

export interface ReviewRowProps {
  review: Review;
}

const ReviewRow: React.FC<ReviewRowProps> = ({ review }) => {
  const dispatch = useAppDispatch();
  const selectedReviews = useAppSelector(selectSelectedReviews);
  const isUpdating = useAppSelector(selectIsReviewUpdating(review.id));
  const isDeleting = useAppSelector(selectIsReviewDeleting(review.id));
  const [showMobileActions, setShowMobileActions] = React.useState(false);

  const isSelected = selectedReviews.includes(review.id);

  const handleApprove = () => {
    dispatch(updateReview({ id: review.id, action: "approve" }));
    setShowMobileActions(false);
  };

  const handleReject = () => {
    dispatch(updateReview({ id: review.id, action: "reject" }));
    setShowMobileActions(false);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this review?")) {
      dispatch(deleteReview(review.id));
    }
    setShowMobileActions(false);
  };

  const handleToggleVerification = () => {
    dispatch(updateReview({ id: review.id, isVerified: !review.isVerified }));
    setShowMobileActions(false);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div
      className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors relative ${
        isSelected ? "bg-blue-50" : ""
      }`}
    >
      <div className="flex items-start space-x-3 sm:space-x-4">
        {/* Selection Checkbox */}
        <button
          onClick={() => dispatch(toggleReviewSelection(review.id))}
          className="mt-1 flex-shrink-0"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {/* Review Content */}
        <div className="flex-1 min-w-0">
          {/* Header - Mobile First Layout */}
          <div className="mb-3">
            {/* Top Row: Rating and Status */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
                <StarRating rating={review.rating} showNumber />
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeColor(
                    review.status
                  )}`}
                >
                  {review.status}
                </span>
                {review.isVerified && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Verified
                  </span>
                )}
              </div>

              {/* Mobile Actions Toggle */}
              <div className="sm:hidden">
                <button
                  onClick={() => setShowMobileActions(!showMobileActions)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Date - Mobile */}
            <div className="text-sm text-gray-500 flex items-center space-x-1 sm:hidden">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Date - Desktop */}
            <div className="text-sm text-gray-500 items-center space-x-1 hidden sm:flex sm:justify-end">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Review Text */}
          <div className="mb-4">
            <p className="text-gray-900 leading-relaxed text-sm sm:text-base">
              {review.content}
            </p>
          </div>

          {/* Meta Information - Mobile Stacked Layout */}
          <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4 flex-shrink-0" />
                <div className="flex flex-col sm:flex-row sm:items-center min-w-0">
                  <span className="truncate">
                    {review.user?.firstName} {review.user?.lastName}
                  </span>
                  <span className="text-gray-400 text-xs sm:text-sm sm:ml-1">
                    ({review.user?.email})
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <Package className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{review.product.name}</span>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex sm:items-center sm:space-x-2">
              {review.status === "PENDING" && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={isUpdating}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center space-x-1 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isUpdating}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center space-x-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </>
              )}

              <button
                onClick={handleToggleVerification}
                disabled={isUpdating}
                className={`px-3 py-1 rounded-lg disabled:opacity-50 text-sm flex items-center space-x-1 cursor-pointer ${
                  review.isVerified
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{review.isVerified ? "Verified" : "Verify"}</span>
              </button>

              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Mobile Action Buttons Dropdown */}
          {showMobileActions && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border sm:hidden">
              <div className="grid grid-cols-2 gap-2">
                {review.status === "PENDING" && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={isUpdating}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center justify-center space-x-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isUpdating}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center justify-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                <button
                  onClick={handleToggleVerification}
                  disabled={isUpdating}
                  className={`px-3 py-2 rounded-lg disabled:opacity-50 text-sm flex items-center justify-center space-x-1 ${
                    review.isVerified
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{review.isVerified ? "Verified" : "Verify"}</span>
                </button>

                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm flex items-center justify-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {(isUpdating || isDeleting) && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export interface ReviewsTableProps {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const ReviewsTable: React.FC<ReviewsTableProps> = ({
  reviews,
  loading,
  error,
  onRefresh,
}) => {
  const dispatch = useAppDispatch();
  const isAllSelected = useAppSelector(selectIsAllReviewsSelected);

  const handleSelectAll = () => {
    if (isAllSelected) {
      dispatch(clearSelectedReviews());
    } else {
      dispatch(selectAllReviews());
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-sm sm:text-base">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No reviews found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            onClick={handleSelectAll}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700"
          >
            {isAllSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span className="hidden sm:inline">Select All</span>
            <span className="sm:hidden">All</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 max-h-96 sm:max-h-none overflow-y-auto">
        {reviews.map((review) => (
          <ReviewRow key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
};

export default ReviewsTable;