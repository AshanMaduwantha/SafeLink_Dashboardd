"use client";

import React, { useState, useEffect } from "react";
import AddPromotionModal from "./AddPromotionModal";
import { Promotion } from "@/types/promotion";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import Pagination from "../common/Pagination";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import Tooltip from "../common/Tooltip";

const AllPromotion = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(
    null,
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [promotionToDeleteId, setPromotionToDeleteId] = useState<string | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
      });
      const response = await fetch(`/api/promotion?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Debug log removed for production
      setPromotions(data.promotions || []);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [currentPage, searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const openModal = () => {
    setSelectedPromotion(null);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPromotion(null);
    fetchPromotions();
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsModalOpen(true);
  };

  const handleToggleEnable = async (id: string, currentStatus: boolean) => {
    try {
      const promotionToUpdate = promotions.find((promo) => promo.id === id);
      if (!promotionToUpdate) {
        throw new Error("Promotion not found for toggling status.");
      }

      const updatedPromotion = {
        ...promotionToUpdate,
        is_enabled: !currentStatus,
        status: !currentStatus ? "Active" : "Inactive",
      };

      const response = await fetch(`/api/promotion/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPromotion),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorData.error || response.statusText}`,
        );
      }
      setPromotions((prevPromotions) =>
        prevPromotions.map((promo) =>
          promo.id === id
            ? {
                ...promo,
                is_enabled: !currentStatus,
                status: !currentStatus ? "Active" : "Inactive",
              }
            : promo,
        ),
      );
    } catch (err: any) {
      console.error("Error toggling promotion status:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (id: string) => {
    setPromotionToDeleteId(id);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setPromotionToDeleteId(null);
  };

  const confirmDeletePromotion = async () => {
    if (!promotionToDeleteId) return;

    try {
      const response = await fetch(`/api/promotion/${promotionToDeleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      fetchPromotions();
      closeDeleteModal();
    } catch (err: any) {
      console.error("Error deleting promotion:", err);
      setError(err.message);
      closeDeleteModal();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Table Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Promotion Management
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search promotions..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <button
              onClick={openModal}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-normal transition-colors duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <span className="text-xl">+</span>
              <span className="text-sm sm:text-base">Add Promotion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 sm:px-6 py-4 bg-red-50 border-b border-red-200">
          <div className="text-red-800 text-sm">
            Error: {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-600 hover:text-red-800 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="px-4 sm:px-6 py-12 text-center">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <div className="text-gray-500 text-base sm:text-lg">
              Loading promotions...
            </div>
          </div>
        </div>
      )}

      <AddPromotionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        promotionToEdit={selectedPromotion}
      />

      {/* Table */}
      {!loading && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  <span className="hidden sm:inline">PROMOTION NAME</span>
                  <span className="sm:hidden">NAME</span>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  DISCOUNT
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  <span className="hidden sm:inline">START DATE</span>
                  <span className="sm:hidden">START</span>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  <span className="hidden sm:inline">END DATE</span>
                  <span className="sm:hidden">END</span>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  STATUS
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  <span className="hidden sm:inline">ENABLE</span>
                  <span className="sm:hidden">ON/OFF</span>
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promotions.map((promotion) => (
                <tr key={promotion.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-none">
                        {promotion.promotion_name}
                      </div>
                      {new Date(promotion.end_date) < new Date() && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-md bg-red-500 text-white whitespace-nowrap w-fit">
                          ENDED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {Math.round(promotion.discount)}%
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(promotion.start_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(promotion.end_date).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md ${
                        promotion.status === "Active"
                          ? "bg-[#00A63E] text-white"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {promotion.status}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() =>
                        handleToggleEnable(promotion.id, promotion.is_enabled)
                      }
                      className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                        promotion.is_enabled ? "bg-black" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                          promotion.is_enabled
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-1 sm:space-x-2">
                      <Tooltip content="Edit promotion">
                        <button
                          onClick={() => handleEditPromotion(promotion)}
                          className="cursor-pointer p-1.5 sm:p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                        >
                          <svg
                            className="h-4 w-4 sm:h-5 sm:w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            ></path>
                          </svg>
                        </button>
                      </Tooltip>
                      <div className="relative inline-flex">
                        <Tooltip content="Delete promotion">
                          <button
                            onClick={() => openDeleteModal(promotion.id)}
                            className="cursor-pointer p-1.5 sm:p-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 min-w-[36px] sm:min-w-[40px] min-h-[36px] sm:min-h-[40px] flex items-center justify-center"
                          >
                            <svg
                              className="h-4 w-4 sm:h-5 sm:w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              ></path>
                            </svg>
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!loading && promotions.length === 0 && (
        <div className="text-center py-12 px-4 sm:px-6">
          <div className="text-gray-500 text-base sm:text-lg">
            No promotions found
          </div>
          <div className="text-gray-400 text-sm mt-1">
            Click &quot;Add Promotion&quot; to create your first promotion
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeletePromotion}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
      />

      {/* Pagination */}
      {!loading && !error && promotions.length > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default AllPromotion;
