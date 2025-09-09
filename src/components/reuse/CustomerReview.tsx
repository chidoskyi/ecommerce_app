"use client";

import { User, ThumbsUp } from "lucide-react";
import { useState, useEffect } from "react";
import { StarRating } from "./StarRating";
import { ReviewModal } from "./ReviewModal";
import Image from "next/image";
import {
  fetchReviews,
  createReview,
  markReviewHelpful,
  updateFilters,
  selectReviews,
  selectPagination,
  selectLoading,
  selectErrors,
  // selectFilters,
} from "@/app/store/slices/reviewSlice";
import type {
  CustomerReviewsProps,
  RatingDistribution,
  Review,
  ReviewFormData,
} from "@/types/reviews";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";

export const CustomerReviews = ({
  productId,
  initialRating = 0,
  initialReviewCount = 0,
}: CustomerReviewsProps) => {
  const dispatch = useAppDispatch();

  // Redux selectors
  const reviews = useAppSelector(selectReviews);
  const pagination = useAppSelector(selectPagination);
  const loading = useAppSelector(selectLoading);
  const errors = useAppSelector(selectErrors);
  // const filters = useSelector(selectFilters);

  // Local state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userHelpfulVotes, setUserHelpfulVotes] = useState<
    Record<string, boolean>
  >({});

  // Calculate rating statistics from reviews
  const calculateRatingStats = (reviewsList: Review[]) => {
    if (reviewsList.length === 0) {
      return {
        averageRating: initialRating,
        totalReviews: initialReviewCount,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const totalRating = reviewsList.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    const averageRating = totalRating / reviewsList.length;

    const ratingDistribution: RatingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    reviewsList.forEach((review) => {
      const roundedRating = Math.round(review.rating);
      // Ensure the rounded rating is within bounds (1-5)
      const boundedRating = Math.min(Math.max(roundedRating, 1), 5);
      ratingDistribution[boundedRating as keyof RatingDistribution]++;
    });

    return {
      averageRating,
      totalReviews: reviewsList.length,
      ratingDistribution,
    };
  };

  const { averageRating, totalReviews, ratingDistribution } =
    calculateRatingStats(reviews);

  // Load reviews when component mounts or productId changes
  useEffect(() => {
    if (productId) {
      dispatch(updateFilters({ productId, status: "APPROVED" }));
      dispatch(
        fetchReviews({ productId, status: "APPROVED", page: 1, limit: 10 })
      );
    }

    // Load user helpful votes from localStorage
    const savedVotes = localStorage.getItem(`helpful_votes_${productId}`);
    if (savedVotes) {
      setUserHelpfulVotes(JSON.parse(savedVotes));
    }
  }, [dispatch, productId]);

  // Handle review submission
  const handleSubmitReview = async (reviewData: ReviewFormData) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await dispatch(
        createReview({
          ...reviewData,
          productId,
        })
      ).unwrap();

      setShowReviewModal(false);

      // Refresh reviews to get updated data
      dispatch(
        fetchReviews({ productId, status: "APPROVED", page: 1, limit: 10 })
      );
    } catch (error) {
      console.error("Failed to create review:", error);
      // Handle error (show toast, etc.)
    }
  };

  // Handle helpful vote
  const handleHelpfulVote = async (reviewId: string, helpful: boolean) => {
    // Check if user already voted
    if (userHelpfulVotes[reviewId] !== undefined) {
      return; // User already voted
    }

    try {
      await dispatch(markReviewHelpful({ reviewId, helpful })).unwrap();

      // Save user vote locally
      const updatedVotes = { ...userHelpfulVotes, [reviewId]: helpful };
      setUserHelpfulVotes(updatedVotes);
      localStorage.setItem(
        `helpful_votes_${productId}`,
        JSON.stringify(updatedVotes)
      );
    } catch (error) {
      console.error("Failed to mark review as helpful:", error);
    }
  };

  // Handle load more reviews
  const handleLoadMore = () => {
    const nextPage = pagination.page + 1;
    dispatch(
      fetchReviews({
        productId,
        status: "APPROVED",
        page: nextPage,
        limit: pagination.limit,
      })
    );
  };

  // Format date helper
  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading.fetchReviews && reviews.length === 0) {
    return (
      <div className="mt-8 bg-white rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-24 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 bg-white rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          Customer Reviews ({totalReviews})
        </h2>
        {/* <button
          onClick={() => setShowReviewModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Write a Review
        </button> */}
      </div>

      {errors.fetchReviews && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">
            Error loading reviews: {errors.fetchReviews}
          </p>
          <button
            onClick={() =>
              dispatch(fetchReviews({ productId, status: "APPROVED" }))
            }
            className="mt-2 text-red-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Rating Summary */}
        <div>
          <div className="text-6xl font-bold text-gray-900 mb-2">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex mb-2">
            <StarRating rating={Math.round(averageRating)} showNumber={false} />
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count =
                ratingDistribution[star as keyof RatingDistribution] || 0;
              const percentage =
                totalReviews > 0 ? (count / totalReviews) * 100 : 0;

              return (
                <div key={star} className="flex items-center space-x-2">
                  <div className="w-20">
                    <StarRating
                      rating={star}
                      showNumber={false}
                      starSize={14}
                    />
                  </div>

                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <span className="text-sm text-gray-600 w-8 text-right">
                    {count}
                  </span>

                  {/* Add percentage display */}
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews Content */}
        <div>
          {reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b pb-6 last:border-b-0">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                        <User size={16} className="text-gray-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <StarRating
                            rating={review.rating}
                            showNumber={false}
                            starSize={16}
                          />
                          {review.isVerified && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {review.author ||
                            (review.user
                              ? `${review.user.firstName} ${review.user.lastName}`
                              : "Anonymous")}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  {review.title && (
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {review.title}
                    </h3>
                  )}

                  <p className="text-gray-600 mb-3 leading-relaxed">
                    {review.content}
                  </p>

                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-4">
                      {review.images.map((image, index) => (
                        <div key={index} className="relative">
                          <Image
                            src={image}
                            alt={`Review image ${index + 1}`}
                            width={50}
                            height={50}
                            className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Helpful votes */}
                  <div className="flex items-center space-x-4 text-sm">
                    <button
                      onClick={() => handleHelpfulVote(review.id, true)}
                      disabled={
                        userHelpfulVotes[review.id] !== undefined ||
                        loading.helpful
                      }
                      className={`flex items-center space-x-1 px-3 py-1 rounded-full transition-colors ${
                        userHelpfulVotes[review.id] === true
                          ? "bg-green-100 text-green-700"
                          : userHelpfulVotes[review.id] === false
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-600 hover:bg-gray-100 cursor-pointer"
                      }`}
                    >
                      <ThumbsUp size={14} />
                      <span>Helpful ({review.helpfulCount || 0})</span>
                    </button>

                    {userHelpfulVotes[review.id] !== undefined && (
                      <span className="text-xs text-gray-500">
                        Thank you for your feedback!
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              {pagination.page < pagination.totalPages && (
                <div className="text-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading.fetchReviews}
                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading.fetchReviews ? "Loading..." : "Load More Reviews"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-64">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                No reviews yet
              </h3>
              <p className="text-gray-600 mb-4">
                Be the first to share your thoughts about this product!
              </p>
              <button
                onClick={() => setShowReviewModal(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              >
                Write a Review
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        show={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleSubmitReview}
        loading={loading.createReview}
        error={errors.createReview}
      />
    </div>
  );
};
