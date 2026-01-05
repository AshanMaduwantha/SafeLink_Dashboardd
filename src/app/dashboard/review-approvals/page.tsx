"use client";

import { useState, useEffect } from "react";
import ReviewApprovals from "../../../components/dashboard/review-approvals/ReviewTable";

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

export default function Page() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ratings");
      if (!response.ok) throw new Error("Failed to fetch reviews");
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/ratings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!response.ok) throw new Error("Failed to approve review");

      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
      );
    } catch (error) {
      console.error("Error approving review:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`/api/ratings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!response.ok) throw new Error("Failed to reject review");

      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)),
      );
    } catch (error) {
      console.error("Error rejecting review:", error);
    }
  };

  const counts = {
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading Reviews...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold text-gray-900">
          Review Approvals
        </h1>
      </div>

      <div className="mb-4">
        <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-1 py-1">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeTab === "pending"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeTab === "approved"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            Approved ({counts.approved})
          </button>
          <button
            onClick={() => setActiveTab("rejected")}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              activeTab === "rejected"
                ? "bg-white text-blue-600 shadow"
                : "text-gray-600 hover:bg-white"
            }`}
          >
            Rejected ({counts.rejected})
          </button>
        </div>
      </div>

      <ReviewApprovals
        reviews={reviews}
        activeTab={activeTab}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
