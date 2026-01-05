"use client";

import React, { useState, useEffect } from "react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import Pagination from "../common/Pagination";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import ClassPackModal from "./ClassPackModal";
import ClassesModal from "./ClassesModal";
import { ClassPack, ClassPackFormData } from "@/types/classPacks";
import { Class, PaginationData } from "@/types/classes";
import Tooltip from "../common/Tooltip";

function AllClassPacks() {
  const [classPacks, setClassPacks] = useState<ClassPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    packId: string | null;
    packName: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    packId: null,
    packName: "",
    isLoading: false,
  });
  const [showModal, setShowModal] = useState(false);
  const [editingPack, setEditingPack] = useState<ClassPack | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [selectedPackClasses, setSelectedPackClasses] = useState<Class[]>([]);
  const [selectedPackName, setSelectedPackName] = useState<string>("");

  useEffect(() => {
    fetchClassPacks(false);
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    if (!isInitialLoad) {
      fetchClassPacks(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (!isInitialLoad) {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, isInitialLoad]);

  useEffect(() => {
    if (!isInitialLoad) {
      setCurrentPage(1);
      fetchClassPacks(true);
    }
  }, [debouncedSearchTerm]);

  const fetchClassPacks = async (isSearch = false) => {
    try {
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
      });

      const response = await fetch(`/api/class-packs?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch class packs");
      }
      const data = await response.json();
      setClassPacks(data.classPacks || []);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching class packs:", err);
    } finally {
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCreateClick = () => {
    setEditingPack(null);
    setIsEditMode(false);
    setShowModal(true);
  };

  const handleEditClick = async (pack: ClassPack) => {
    try {
      // Fetch full pack details including classes
      const response = await fetch(`/api/class-packs/${pack.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch pack details");
      }
      const data = await response.json();
      setEditingPack(data.classPack);
      setIsEditMode(true);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching pack details:", error);
      setError("Failed to load pack details. Please try again.");
    }
  };

  const openClassesModal = async (pack: ClassPack) => {
    try {
      setSelectedPackName(pack.packName);
      if (pack.classes && pack.classes.length > 0) {
        setSelectedPackClasses(pack.classes);
        setShowClassesModal(true);
        return;
      }
      const response = await fetch(`/api/class-packs/${pack.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch pack details");
      }
      const data = await response.json();
      const classes: Class[] = data.classPack?.classes || [];
      setSelectedPackClasses(classes);
      setShowClassesModal(true);
    } catch (error) {
      console.error("Error opening classes modal:", error);
      setError("Failed to load classes for this pack. Please try again.");
    }
  };

  const closeClassesModal = () => {
    setShowClassesModal(false);
    setSelectedPackClasses([]);
    setSelectedPackName("");
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPack(null);
    setIsEditMode(false);
  };

  const handleModalSubmit = async (data: ClassPackFormData) => {
    try {
      if (isEditMode && editingPack) {
        // Update
        const response = await fetch(`/api/class-packs/${editingPack.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update class pack");
        }
      } else {
        // Create
        const response = await fetch("/api/class-packs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create class pack");
        }
      }

      await fetchClassPacks(false);
    } catch (error) {
      console.error("Error submitting class pack:", error);
      throw error;
    }
  };

  const handleDeleteClick = (packId: string, packName: string) => {
    setDeleteModal({
      isOpen: true,
      packId,
      packName,
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.packId) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/class-packs/${deleteModal.packId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete class pack");
      }

      setClassPacks((prevPacks) =>
        prevPacks.filter((pack) => pack.id !== deleteModal.packId),
      );

      setPagination((prev) => ({
        ...prev,
        totalItems: prev.totalItems - 1,
      }));

      setDeleteModal({
        isOpen: false,
        packId: null,
        packName: "",
        isLoading: false,
      });
    } catch (error) {
      console.error("Error deleting class pack:", error);
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
      setError("Failed to delete class pack. Please try again.");
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      packId: null,
      packName: "",
      isLoading: false,
    });
  };

  const handleToggleStatus = async (packId: string, currentStatus: boolean) => {
    try {
      // Fetch pack details first
      const packResponse = await fetch(`/api/class-packs/${packId}`);
      if (!packResponse.ok) {
        throw new Error("Failed to fetch pack details");
      }
      const packData = await packResponse.json();
      const pack = packData.classPack;

      // Update pack with toggled status
      const response = await fetch(`/api/class-packs/${packId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packName: pack.packName,
          classIds: pack.classes?.map((c: any) => c.id) || [],
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update pack status");
      }

      setClassPacks((prevPacks) =>
        prevPacks.map((pack) =>
          pack.id === packId ? { ...pack, isActive: !currentStatus } : pack,
        ),
      );
    } catch (error) {
      console.error("Error updating pack status:", error);
      setError("Failed to update pack status. Please try again.");
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      {/* Header Section - Mobile Responsive */}
      <div className="mb-6">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">
            Class Packs
          </h1>

          {/* Search Bar - Full Width on Mobile */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search class packs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchLoading && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Create Button - Full Width on Mobile */}
          <button
            onClick={handleCreateClick}
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full font-medium cursor-pointer"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Class Pack
          </button>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">Class Packs</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search class packs..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {searchLoading && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            <button
              onClick={handleCreateClick}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Class Pack
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading class packs...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error loading class packs
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchClassPacks()}
            className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="w-full bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3 border-b border-gray-200">
                    PACK NAME
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200">
                    CLASSES
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200">PRICE</th>
                  <th className="px-6 py-3 border-b border-gray-200">STATUS</th>
                  <th className="px-6 py-3 border-b border-gray-200 text-right">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classPacks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {searchTerm
                        ? "No class packs found matching your search."
                        : "No class packs available."}
                    </td>
                  </tr>
                ) : (
                  classPacks.map((pack) => (
                    <tr key={pack.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pack.packName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openClassesModal(pack)}
                            className="cursor-pointer flex items-center px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                          >
                            <AcademicCapIcon className="h-4 w-4 mr-1 text-blue-500" />
                            {pack.classes?.length || pack.classCount || 0} Class
                            {(pack.classes?.length || pack.classCount || 0) ===
                            1
                              ? ""
                              : "es"}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof pack.price === "number"
                          ? `$${pack.price.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <button
                          onClick={() =>
                            handleToggleStatus(pack.id, pack.isActive)
                          }
                          className={`cursor-pointer inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                            pack.isActive
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }`}
                        >
                          {pack.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Tooltip content="Edit pack">
                            <button
                              onClick={() => handleEditClick(pack)}
                              className="cursor-pointer p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          </Tooltip>
                          <div className="relative inline-flex">
                            <Tooltip content="Delete pack">
                              <button
                                onClick={() =>
                                  handleDeleteClick(pack.id, pack.packName)
                                }
                                className="cursor-pointer p-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {classPacks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm
                  ? "No class packs found matching your search."
                  : "No class packs available."}
              </div>
            ) : (
              classPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {pack.packName}
                      </h3>
                    </div>
                    <div className="flex space-x-1 ml-2">
                      <Tooltip content="Edit pack">
                        <button
                          onClick={() => handleEditClick(pack)}
                          className="cursor-pointer p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <div className="relative inline-flex">
                        <Tooltip content="Delete pack">
                          <button
                            onClick={() =>
                              handleDeleteClick(pack.id, pack.packName)
                            }
                            className="cursor-pointer p-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium mr-2">Classes:</span>
                      <button
                        onClick={() => openClassesModal(pack)}
                        className="cursor-pointer inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {pack.classes?.length || pack.classCount || 0}
                      </button>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium mr-2">Price:</span>
                      <span className="text-gray-900">
                        {typeof pack.price === "number"
                          ? `$${pack.price.toFixed(2)}`
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <button
                        onClick={() =>
                          handleToggleStatus(pack.id, pack.isActive)
                        }
                        className={`cursor-pointer inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          pack.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {pack.isActive ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Pagination */}
      {!loading && !error && pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Class Pack"
        message={`Are you sure you want to delete "${deleteModal.packName}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        isLoading={deleteModal.isLoading}
        loadingText="Deleting..."
      />

      {/* Create/Edit Modal */}
      <ClassPackModal
        isOpen={showModal}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        classPack={editingPack}
        isEditMode={isEditMode}
      />

      {/* Classes Modal */}
      <ClassesModal
        isOpen={showClassesModal}
        onClose={closeClassesModal}
        classes={selectedPackClasses}
        packName={selectedPackName}
      />
    </div>
  );
}

export default AllClassPacks;
