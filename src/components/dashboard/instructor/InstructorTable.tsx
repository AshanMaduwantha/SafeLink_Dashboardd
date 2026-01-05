"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  PlusIcon,
  LockClosedIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import Tooltip from "../common/Tooltip";
import InstructorClassesModal from "./InstructorClassesModal";
import { Class, PaginationData } from "@/types/classes";
import Alert from "../common/Alert";

interface Instructor {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  status: boolean;
  instructor_id: string;
  createdAt: string;
  classes: Class[];
}

function InstructorTable() {
  const searchParams = useSearchParams();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
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
    instructorId: string | null;
    instructorName: string;
  }>({
    isOpen: false,
    instructorId: null,
    instructorName: "",
  });
  const [showInstructorClassesModal, setShowInstructorClassesModal] =
    useState(false);
  const [selectedInstructorClasses, setSelectedInstructorClasses] = useState<
    Class[]
  >([]);
  const [selectedInstructorName, setSelectedInstructorName] = useState("");
  const [alert, setAlert] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  // Check for success message from URL parameters
  useEffect(() => {
    const success = searchParams.get("success");
    const message = searchParams.get("message");

    if (success === "true" && message) {
      setAlert({
        type: "success",
        message: decodeURIComponent(message),
      });

      window.history.replaceState({}, "", "/dashboard/instructor");

      setTimeout(() => {
        setAlert({ type: null, message: "" });
      }, 5000);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchInstructors = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
          ...(searchTerm && { search: searchTerm }),
        });
        const response = await fetch(`/api/instructor?${params}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch instructors");
        }
        const data = await response.json();
        setInstructors(data.instructors);
        setPagination(data.pagination);
      } catch (err: any) {
        console.error("Error fetching instructors:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };
    fetchInstructors();
  }, [currentPage, itemsPerPage, searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteClick = (instructorId: string, instructorName: string) => {
    setDeleteModal({
      isOpen: true,
      instructorId,
      instructorName,
    });
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, instructorId: null, instructorName: "" });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.instructorId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/instructor/${deleteModal.instructorId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete instructor");
      }

      setInstructors((prev) =>
        prev.filter((instructor) => instructor.id !== deleteModal.instructorId),
      );
      setAlert({
        type: "success",
        message: "Instructor deleted successfully.",
      });
      setTimeout(() => {
        setAlert({ type: null, message: "" });
      }, 3000);
      handleDeleteCancel();
    } catch (error: any) {
      console.error("Error deleting instructor:", error);
      setAlert({
        type: "error",
        message: error.message || "Failed to delete instructor.",
      });
      setTimeout(() => {
        setAlert({ type: null, message: "" });
      }, 5000);
      handleDeleteCancel();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewClasses = (name: string, classes: Class[]) => {
    setSelectedInstructorName(name);
    setSelectedInstructorClasses(classes);
    setShowInstructorClassesModal(true);
  };

  const handleCloseClassesModal = () => {
    setShowInstructorClassesModal(false);
    setSelectedInstructorClasses([]);
    setSelectedInstructorName("");
  };

  const handleToggleStatus = async (
    instructorId: string,
    currentStatus: boolean,
  ) => {
    setTogglingStatusId(instructorId);
    try {
      const response = await fetch(
        `/api/instructor/${instructorId}/toggle-status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: !currentStatus }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to update instructor status",
        );
      }

      setInstructors((prevInstructors) =>
        prevInstructors.map((instructor) =>
          instructor.id === instructorId
            ? { ...instructor, status: !currentStatus }
            : instructor,
        ),
      );
      setAlert({
        type: "success",
        message: `Instructor status updated to ${
          !currentStatus ? "enabled" : "disabled"
        }.`,
      });
      setTimeout(() => {
        setAlert({ type: null, message: "" });
      }, 3000);
    } catch (error: any) {
      console.error("Error toggling instructor status:", error);
      setError(
        error.message || "An unexpected error occurred while updating status.",
      );
      setAlert({
        type: "error",
        message: error.message || "Failed to update instructor status.",
      });
      setTimeout(() => {
        setAlert({ type: null, message: "" });
      }, 5000);
    } finally {
      setTogglingStatusId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      {alert.type && (
        <div className="mb-4">
          <Alert
            type={alert.type}
            title={alert.type === "success" ? "Success" : "Error"}
            message={alert.message}
            onDismiss={() => setAlert({ type: null, message: "" })}
          />
        </div>
      )}
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            Instructor Management
          </h1>
          <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-4">
            {/* Search Bar */}
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            {/* Add Instructor Button */}
            <Link
              href="/dashboard/instructor/create"
              className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Instructor
            </Link>
          </div>
        </div>
      </div>

      {/* Table View */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading instructors...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 text-lg">Error: {error}</p>
          <button
            onClick={() => setCurrentPage(1)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="w-full bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3 border-b border-gray-200">ID</th>
                <th className="px-6 py-3 border-b border-gray-200">NAME</th>
                <th className="px-6 py-3 border-b border-gray-200">EMAIL</th>
                <th className="px-6 py-3 border-b border-gray-200">
                  PHONE NUMBER
                </th>
                <th className="px-6 py-3 border-b border-gray-200">CLASSES</th>
                <th className="px-6 py-3 border-b border-gray-200 text-left">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {instructors.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "No instructors found matching your search."
                      : "No instructors available."}
                  </td>
                </tr>
              ) : (
                instructors.map((instructor) => (
                  <tr key={instructor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {instructor.instructor_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">
                      {instructor.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {instructor.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {instructor.phoneNumber || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() =>
                            handleViewClasses(
                              instructor.name,
                              instructor.classes || [],
                            )
                          }
                          className="cursor-pointer px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
                        >
                          {instructor.classes?.length || 0} Classes
                        </span>
                        {/* Placeholder for class indicators */}
                        <div className="flex space-x-1">
                          {(instructor.classes || []).slice(0, 2).map((cls) => (
                            <span
                              key={cls.id}
                              className="h-2 w-2 rounded-full bg-blue-500"
                            ></span>
                          ))}
                          {(instructor.classes?.length || 0) > 2 && (
                            <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Tooltip content="Edit">
                          <Link
                            href={`/dashboard/instructor/edit/${instructor.id}`}
                            className="cursor-pointer p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 block"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Link>
                        </Tooltip>
                        <Tooltip
                          content={instructor.status ? "Disable" : "Enable"}
                        >
                          <button
                            onClick={() =>
                              handleToggleStatus(
                                instructor.id,
                                instructor.status,
                              )
                            }
                            className={`cursor-pointer p-2 rounded-md ${
                              instructor.status
                                ? "bg-green-500 text-white hover:bg-green-600"
                                : "bg-red-500 text-white hover:bg-red-600"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            disabled={togglingStatusId === instructor.id}
                          >
                            {togglingStatusId === instructor.id ? (
                              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <LockClosedIcon className="h-5 w-5" />
                            )}
                          </button>
                        </Tooltip>
                        <div className="relative inline-flex">
                          <Tooltip content="Delete">
                            <button
                              onClick={() =>
                                handleDeleteClick(
                                  instructor.id,
                                  instructor.name,
                                )
                              }
                              className="cursor-pointer p-2 rounded-md bg-red-500 text-white hover:bg-red-600"
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center py-6">
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10"
                >
                  <span className="sr-only">Previous</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                      pagination.currentPage === i + 1
                        ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-10"
                >
                  <span className="sr-only">Next</span>
                  <svg
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </nav>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={"Delete Instructor"}
        message={`Are you sure you want to delete "${deleteModal.instructorName}"? This action cannot be undone.`}
        confirmButtonText={"Delete"}
        cancelButtonText="Cancel"
        isLoading={isDeleting}
      />

      {/* Instructor Classes Modal */}
      <InstructorClassesModal
        isOpen={showInstructorClassesModal}
        onClose={handleCloseClassesModal}
        instructorName={selectedInstructorName}
        classes={selectedInstructorClasses}
      />
    </div>
  );
}

export default InstructorTable;
