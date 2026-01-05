"use client";

import { useState, useEffect } from "react";
import {
  CreateNewsFormData,
  UpdateNewsFormData,
} from "@/lib/validations/news/news.schema";
import { News } from "@/types/news";

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateNewsFormData | UpdateNewsFormData) => void;
  news?: News;
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

const initialFormData = {
  title: "",
  content: "",
  image_url: "",
  publish_date: new Date().toISOString().split("T")[0],
  status: "draft" as const,
  category: "General",
  is_pinned: false,
};

export default function NewsModal({
  isOpen,
  onClose,
  onSubmit,
  news,
}: NewsModalProps) {
  const isEditMode = !!news;
  const [formData, setFormData] = useState<
    CreateNewsFormData | UpdateNewsFormData
  >(initialFormData);
  const [errors, setErrors] = useState<
    Partial<CreateNewsFormData | UpdateNewsFormData>
  >({});
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Update form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (news) {
        setFormData({
          id: news.id,
          title: news.title,
          content: news.content,
          image_url: news.image_url || "",
          publish_date:
            typeof news.publish_date === "string"
              ? news.publish_date.split("T")[0]
              : new Date(news.publish_date).toISOString().split("T")[0],
          status: news.status,
          category: news.category,
          is_pinned: news.is_pinned,
        });
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
      setSelectedFile(null);
    }
  }, [isOpen, news]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(e.target.files?.[0] || null);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateNewsFormData | UpdateNewsFormData> = {};

    if (!formData.title?.trim()) newErrors.title = "Title is required";
    if (!formData.content?.trim()) newErrors.content = "Content is required";
    if (!formData.publish_date)
      newErrors.publish_date = "Publish date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const finalFormData = { ...formData };

      // Upload image
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);

        const uploadResponse = await fetch("/api/s3-upload/news-image", {
          method: "POST",
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        const uploadResult = await uploadResponse.json();

        if (uploadResult.success) {
          finalFormData.image_url = uploadResult.url;
        } else {
          throw new Error(uploadResult.error || "Upload failed");
        }
      }

      await onSubmit(finalFormData);
      onClose();
    } catch (error) {
      alert(
        `Failed to ${isEditMode ? "update" : "create"} news: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-2xl border-2 border-gray-300 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto hide-scrollbar">
        <div className="p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              {isEditMode ? "Edit News Article" : "Create New News Article"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter news title..."
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Content */}
            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Content
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                placeholder="Full news content..."
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.content ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.content && (
                <p className="mt-1 text-xs text-red-600">{errors.content}</p>
              )}
            </div>

            {/* Category and Status */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Featured Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  {/* Image Preview */}
                  <div className="flex-shrink-0">
                    {formData.image_url ? (
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                      />
                    ) : selectedFile ? (
                      <div className="h-16 w-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt="Preview"
                          className="h-full w-full object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                        <svg
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      Upload Image
                    </label>
                  </div>

                  {/* Remove Button (only show when image exists) */}
                  {(formData.image_url || selectedFile) && (
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, image_url: "" }));
                          setSelectedFile(null);
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pin to Top */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pin to Top
                </label>
                <p className="text-xs text-gray-500">
                  Featured news appears at the top
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_pinned"
                  checked={formData.is_pinned}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-3 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center cursor-pointer"
              >
                {loading && (
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {loading
                  ? isEditMode
                    ? "Updating..."
                    : "Publishing..."
                  : isEditMode
                    ? "Update News"
                    : "Publish News"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
