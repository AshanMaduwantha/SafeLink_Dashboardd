"use client";

import { useState } from "react";
import { News, NewsFilters } from "@/types/news";

interface NewsTableProps {
  news: News[];
  filters: NewsFilters;
  stats: {
    totalPublishedNews: number;
    totalDraftNews: number;
  };
  onFilterChange: (filters: Partial<NewsFilters>) => void;
  onEdit: (news: News) => void;
  onDelete: (news: News) => void;
  onTogglePin: (news: News) => void;
}

const categories = [
  "General",
  "Education",
  "Technology",
  "Health",
  "Sports",
  "Entertainment",
  "Business",
  "Science",
];

// Component for expandable description
const ExpandableDescription = ({
  content,
  maxLength = 150,
}: {
  content: string;
  maxLength?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldShowButton = content.length > maxLength;
  const displayContent = isExpanded ? content : content.substring(0, maxLength);

  return (
    <div className="h-full flex flex-col">
      <p className="text-sm text-gray-600 flex-1 break-words overflow-hidden">
        {displayContent}
        {!isExpanded && shouldShowButton && "..."}
      </p>
      {shouldShowButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors flex items-center gap-1 mt-2 self-start flex-shrink-0"
        >
          <span>{isExpanded ? "See less" : "See more"}</span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default function NewsTable({
  news,
  filters,
  stats,
  onFilterChange,
  onEdit,
  onDelete,
  onTogglePin,
}: NewsTableProps) {
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-black text-white";
      case "draft":
        return "bg-yellow-200 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Segmented Control */}
            <div className="bg-gray-200 rounded-full p-1 flex">
              <button
                onClick={() => onFilterChange({ status: "all" })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  filters.status === "all"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All News ({stats.totalPublishedNews + stats.totalDraftNews})
              </button>
              <button
                onClick={() => onFilterChange({ status: "published" })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  filters.status === "published"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Published ({stats.totalPublishedNews})
              </button>
              <button
                onClick={() => onFilterChange({ status: "draft" })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  filters.status === "draft"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Drafts ({stats.totalDraftNews})
              </button>
            </div>

            <div className="flex space-x-3">
              <select
                value={filters.category || ""}
                onChange={(e) => onFilterChange({ category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={filters.status || "all"}
                onChange={(e) =>
                  onFilterChange({ status: e.target.value as any })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="p-6">
        {news.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No news found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new news article.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((newsItem) => (
              <div
                key={newsItem.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="flex">
                  {/* Image */}
                  <div className="flex-shrink-0 w-48 h-48">
                    <img
                      src={newsItem.image_url || "/placeholder-news.jpg"}
                      alt={newsItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex-1 p-6 flex flex-col">
                      {/* Header with Title and Status */}
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-4 min-w-0">
                          {newsItem.title}
                        </h3>
                        {/* Status Badge */}
                        <div className="flex-shrink-0 ml-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium ${getStatusBadgeColor(newsItem.status)}`}
                          >
                            {newsItem.status.charAt(0).toUpperCase() +
                              newsItem.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Description - Constrained to prevent overflow */}
                      <div className="flex-1 min-h-0 mb-3 pr-4">
                        <ExpandableDescription content={newsItem.content} />
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-auto">
                        <div className="flex items-center space-x-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span>{formatDate(newsItem.publish_date)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-gray-100 px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {newsItem.status === "draft" ? (
                          <>
                            <button
                              onClick={() => onEdit(newsItem)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Continue Editing
                            </button>
                            <button
                              onClick={() => onDelete(newsItem)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => onEdit(newsItem)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => onTogglePin(newsItem)}
                              className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium transition-colors cursor-pointer ${
                                newsItem.is_pinned
                                  ? "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                                  : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                              }`}
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                                />
                              </svg>
                              {newsItem.is_pinned ? "Unpin" : "Pin"}
                            </button>
                            <button
                              onClick={() => onDelete(newsItem)}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
