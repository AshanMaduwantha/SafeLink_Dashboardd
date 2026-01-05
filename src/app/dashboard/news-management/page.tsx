"use client";

import { useState, useEffect } from "react";
import { News, NewsFilters } from "@/types/news";
import {
  CreateNewsFormData,
  UpdateNewsFormData,
} from "@/lib/validations/news/news.schema";
import NewsTable from "@/components/dashboard/news-management/NewsTable";
import AddNewsModal from "@/components/dashboard/news-management/AddNewsModal";
import DeleteConfirmationModal from "@/components/dashboard/common/DeleteConfirmationModal";
import Alert from "@/components/dashboard/common/Alert";

interface NewsResponse {
  news: News[];
  totalPublishedNews: number;
  totalDraftNews: number;
}

export default function NewsManagementPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filters, setFilters] = useState<NewsFilters>({
    status: "all",
    category: "",
    search: "",
  });
  const [stats, setStats] = useState({
    totalPublishedNews: 0,
    totalDraftNews: 0,
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(filters.status &&
          filters.status !== "all" && { status: filters.status }),
        ...(filters.category && { category: filters.category }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/news?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch news");
      }

      const data: NewsResponse = await response.json();
      setNews(data.news);
      setStats({
        totalPublishedNews: data.totalPublishedNews,
        totalDraftNews: data.totalDraftNews,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [filters]);

  // Auto-dismiss success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleNewsSubmit = async (
    newsData: CreateNewsFormData | UpdateNewsFormData,
  ) => {
    try {
      const isEdit = "id" in newsData;
      const url = isEdit ? `/api/news/${newsData.id}` : "/api/news";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newsData),
      });

      if (!response.ok) {
        const _errorText = await response.text();
        throw new Error(`Failed to ${isEdit ? "update" : "create"} news`);
      }

      const _result = await response.json();

      setSuccess(`News ${isEdit ? "updated" : "created"} successfully`);
      setIsModalOpen(false);
      setSelectedNews(null);
      fetchNews();
    } catch (err) {
      console.error("Error in handleNewsSubmit:", err);
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${"id" in newsData ? "update" : "create"} news`,
      );
    }
  };

  const handleDeleteNews = async () => {
    if (!selectedNews) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/news/${selectedNews.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete news");
      }

      setSuccess("News deleted successfully");
      setIsDeleteModalOpen(false);
      setSelectedNews(null);
      fetchNews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete news");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePin = async (newsItem: News) => {
    try {
      const response = await fetch(`/api/news/${newsItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_pinned: !newsItem.is_pinned }),
      });

      if (!response.ok) {
        const _errorText = await response.text();
        throw new Error("Failed to toggle pin status");
      }

      const _result = await response.json();

      setSuccess(
        `News ${newsItem.is_pinned ? "unpinned" : "pinned"} successfully`,
      );
      fetchNews();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to toggle pin status",
      );
    }
  };

  const handleFilterChange = (newFilters: Partial<NewsFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const openModal = (newsItem?: News) => {
    setSelectedNews(newsItem || null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (newsItem: News) => {
    setSelectedNews(newsItem);
    setIsDeleteModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading news...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-600">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Latest News Management
        </h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add News
        </button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert
            type="error"
            title="Error"
            message={error}
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {success && (
        <div className="mb-4">
          <Alert
            type="success"
            title="Success"
            message={success}
            onDismiss={() => setSuccess(null)}
          />
        </div>
      )}

      <NewsTable
        news={news}
        filters={filters}
        stats={stats}
        onFilterChange={handleFilterChange}
        onEdit={openModal}
        onDelete={openDeleteModal}
        onTogglePin={handleTogglePin}
      />

      <AddNewsModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedNews(null);
        }}
        onSubmit={handleNewsSubmit}
        news={selectedNews || undefined}
      />

      {selectedNews && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            if (!isDeleting) {
              setIsDeleteModalOpen(false);
              setSelectedNews(null);
            }
          }}
          onConfirm={handleDeleteNews}
          title="Delete News"
          message={`Are you sure you want to delete "${selectedNews.title}"? This action cannot be undone.`}
          isLoading={isDeleting}
          loadingText="Deleting..."
        />
      )}
    </div>
  );
}
