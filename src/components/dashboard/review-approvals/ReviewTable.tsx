"use client";

import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface Review {
  id: string;
  email: string;
  userName: string;
  course: string;
  description: string | null;
  rating: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function ReviewApprovals({
  reviews,
  activeTab,
  onApprove,
  onReject,
}: {
  reviews: Review[];
  activeTab: "pending" | "approved" | "rejected";
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  const filteredReviews = reviews.filter((review) => {
    const matchesTab = review.status === activeTab;
    const matchesSearch =
      searchQuery === "" ||
      review.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.course.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (review.description &&
        review.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-white p-0 font-poppins">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-end mb-4">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto lg:overflow-x-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    USER
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    CLASS
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    DESCRIPTION
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    RATING
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    DATE
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      No reviews found
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900">
                            {review.userName}
                          </span>
                          <span className="text-sm text-gray-500">
                            {review.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {review.course}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                        {(() => {
                          if (!review.description) {
                            return (
                              <span className="text-gray-400 italic">
                                No description
                              </span>
                            );
                          }

                          const THRESHOLD = 120;
                          const long = review.description.length > THRESHOLD;

                          if (!long)
                            return (
                              <span className="block">
                                {review.description}
                              </span>
                            );

                          if (isExpanded(review.id)) {
                            return (
                              <div>
                                <p className="whitespace-normal">
                                  {review.description}
                                </p>
                                <button
                                  onClick={() => toggleExpanded(review.id)}
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  See less
                                </button>
                              </div>
                            );
                          } else {
                            return (
                              <div>
                                <p
                                  className="truncate"
                                  style={{ maxWidth: "40rem" }}
                                >
                                  {review.description.slice(0, THRESHOLD)}…
                                </p>
                                <button
                                  onClick={() => toggleExpanded(review.id)}
                                  className="mt-2 text-sm text-blue-600 hover:underline"
                                >
                                  See more
                                </button>
                              </div>
                            );
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStars(review.rating)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {/* Show Approve button for Pending and Rejected reviews */}
                          {review.status !== "approved" && (
                            <button
                              onClick={() => onApprove(review.id)}
                              className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-md text-white font-medium transition-colors bg-green-500 hover:bg-green-600"
                            >
                              Approve
                            </button>
                          )}

                          {/* Show Reject button for Pending and Approved reviews */}
                          {review.status !== "rejected" && (
                            <button
                              onClick={() => onReject(review.id)}
                              className="cursor-pointer inline-flex items-center justify-center px-4 py-2 rounded-md text-white font-medium transition-colors bg-red-500 hover:bg-red-600"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
