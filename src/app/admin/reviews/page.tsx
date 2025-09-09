"use client"

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchReviews,
  bulkUpdateReviews,
  setFilters,
  clearSelectedReviews,
  selectReviews,
  selectReviewsLoading,
  selectReviewsError,
  selectReviewsFilters,
  selectReviewsPagination,
  selectReviewsStatusCounts,
  selectSelectedReviews,
  selectIsBulkOperationRunning,
  selectSelectedReviewsCount,
} from "@/app/store/slices/adminReviewSlice";
import {
  Check,
  X,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { ReviewStatus } from "@/types/reviews";
import ReviewsTable from "@/components/dashboard/reviews/ReviewTable";

const AdminReviewsManagement = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const reviews = useAppSelector(selectReviews);
  const loading = useAppSelector(selectReviewsLoading);
  const error = useAppSelector(selectReviewsError);
  const filters = useAppSelector(selectReviewsFilters);
  const pagination = useAppSelector(selectReviewsPagination);
  const statusCounts = useAppSelector(selectReviewsStatusCounts);
  const selectedReviews = useAppSelector(selectSelectedReviews);
  const selectedCount = useAppSelector(selectSelectedReviewsCount);
  const isBulkOperationRunning = useAppSelector(selectIsBulkOperationRunning);

  // Local state
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Fetch reviews on component mount and filter changes
  useEffect(() => {
    dispatch(fetchReviews(filters));
        // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, filters.page, filters.status]);

  // Handlers
  const handleStatusFilter = (status: ReviewStatus | "all") => {
    dispatch(setFilters({ status, page: 1 }));
    setShowMobileFilters(false); // Close mobile filters after selection
  };

  const handleSearch = () => {
    dispatch(setFilters({ search: searchTerm, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    dispatch(setFilters({ page: newPage }));
  };

  const handleBulkAction = (action: "approve" | "reject" | "delete") => {
    if (selectedReviews.length === 0) return;

    const confirmMessage = `Are you sure you want to ${action} ${selectedReviews.length} selected review(s)?`;
    if (confirm(confirmMessage)) {
      dispatch(bulkUpdateReviews({ action, reviewIds: selectedReviews })).then(
        () => {
          dispatch(fetchReviews(filters)); // Refresh data
        }
      );
    }
  };

  const handleRefresh = () => {
    dispatch(fetchReviews(filters));
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

  const statuses: (ReviewStatus | "all")[] = [
    "all",
    "PENDING",
    "APPROVED",
    "REJECTED",
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Review Management
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Manage and moderate customer reviews
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div
              key={status}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600 capitalize">
                    {status.toLowerCase()} Reviews
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <div
                  className={`p-2 sm:p-3 rounded-lg ${getStatusBadgeColor(status)}`}
                >
                  {status === "APPROVED" && <Check className="w-4 h-4 sm:w-6 sm:h-6" />}
                  {status === "REJECTED" && <X className="w-4 h-4 sm:w-6 sm:h-6" />}
                  {status === "PENDING" && (
                    <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
          {/* Mobile Filter Toggle */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">
                Filters
                {filters.status !== "all" && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                    {filters.status}
                  </span>
                )}
              </span>
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Desktop Status Filter Tabs */}
            <div className="hidden lg:flex space-x-1 bg-gray-100 rounded-lg p-1">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    filters.status === status
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {status === "all"
                    ? "All"
                    : status.charAt(0) + status.slice(1).toLowerCase()}
                  {statusCounts[status] && (
                    <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      {statusCounts[status]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Mobile Status Filter Dropdown */}
            {showMobileFilters && (
              <div className="w-full lg:hidden">
                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusFilter(status)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        filters.status === status
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
                      }`}
                    >
                      {status === "all"
                        ? "All"
                        : status.charAt(0) + status.slice(1).toLowerCase()}
                      {statusCounts[status] && (
                        <span className="ml-1 text-xs bg-opacity-20 bg-black px-1 py-0.5 rounded">
                          {statusCounts[status]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
              <span className="text-blue-800 font-medium text-sm sm:text-base">
                {selectedCount} review(s) selected
              </span>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={() => handleBulkAction("approve")}
                  disabled={isBulkOperationRunning}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm flex items-center space-x-1 cursor-pointer flex-1 sm:flex-none justify-center"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => handleBulkAction("reject")}
                  disabled={isBulkOperationRunning}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs sm:text-sm flex items-center space-x-1 cursor-pointer flex-1 sm:flex-none justify-center"
                >
                  <X className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleBulkAction("delete")}
                  disabled={isBulkOperationRunning}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-xs sm:text-sm flex items-center space-x-1 cursor-pointer flex-1 sm:flex-none justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => dispatch(clearSelectedReviews())}
                  className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-xs sm:text-sm cursor-pointer flex-1 sm:flex-none justify-center flex items-center"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reviews Table Component */}
        <ReviewsTable
          reviews={reviews}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
        />

        {/* Pagination */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 sm:px-6 py-4 mt-6">
            {/* Mobile Pagination Info */}
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.totalCount
                )}{" "}
                of {pagination.totalCount} reviews
              </div>

              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Desktop Pagination Numbers */}
                <div className="hidden sm:flex items-center space-x-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1 text-sm rounded-lg ${
                            pagination.page === pageNum
                              ? "bg-blue-600 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Mobile Pagination - Simple Page Number */}
                <div className="sm:hidden px-3 py-1 text-sm bg-gray-100 rounded-lg">
                  {pagination.page} / {pagination.totalPages}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviewsManagement;