"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  LockClosedIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import Pagination from "../common/Pagination";
import DeleteConfirmationModal from "../common/DeleteConfirmationModal";
import ScheduleModal from "./ScheduleModal";
import { ScheduleItem } from "@/types/schedule";
import { Class, PaginationData } from "@/types/classes";
import Tooltip from "../common/Tooltip";

function AllClasses() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedSchedules, setSelectedSchedules] = useState<ScheduleItem[]>(
    [],
  );
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
    classId: string | null;
    className: string;
    isLoading: boolean;
    action: "disable" | null;
  }>({
    isOpen: false,
    classId: null,
    className: "",
    isLoading: false,
    action: null,
  });
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    fetchClasses(false);
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    if (!isInitialLoad) {
      fetchClasses(false);
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
      fetchClasses(true);
    }
  }, [debouncedSearchTerm]);

  const fetchClasses = async (isSearch = false) => {
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

      const response = await fetch(`/api/classes?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }
      const data = await response.json();
      const parsedClasses = (data.classes || []).map((cls: any) => ({
        ...cls,
        schedule: cls.schedule || [],
      }));
      setClasses(parsedClasses);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching classes:", err);
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

  const handleScheduleClick = (schedules: ScheduleItem[]) => {
    setSelectedSchedules(schedules);
    setShowScheduleModal(true);
  };

  const handleCloseScheduleModal = () => {
    setShowScheduleModal(false);
    setSelectedSchedules([]);
  };

  const handleView = (classId: string) => {
    router.push(`/dashboard/classes/view?classId=${classId}`);
  };

  const handleDisableClick = (classId: string, className: string) => {
    setDeleteModal({
      isOpen: true,
      classId,
      className,
      isLoading: false,
      action: "disable",
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.classId || !deleteModal.action) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      if (deleteModal.action === "disable") {
        const response = await fetch(
          `/api/classes/${deleteModal.classId}/toggle-status`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              isActive: false,
            }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to disable class");
        }

        setClasses((prevClasses) =>
          prevClasses.map((cls) =>
            cls.id === deleteModal.classId ? { ...cls, isActive: false } : cls,
          ),
        );
      }

      setDeleteModal({
        isOpen: false,
        classId: null,
        className: "",
        isLoading: false,
        action: null,
      });
    } catch (error) {
      console.error(`Error disabling class:`, error);
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
      setError(`Failed to disable class. Please try again.`);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      classId: null,
      className: "",
      isLoading: false,
      action: null,
    });
  };

  const handleToggleStatus = async (
    classId: string,
    currentStatus: boolean,
  ) => {
    try {
      const response = await fetch(`/api/classes/${classId}/toggle-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update class status");
      }

      setClasses((prevClasses) =>
        prevClasses.map((cls) =>
          cls.id === classId ? { ...cls, isActive: !currentStatus } : cls,
        ),
      );
    } catch (error) {
      console.error("Error updating class status:", error);
      setError("Failed to update class status. Please try again.");
    }
  };

  const toggleDescriptionExpansion = (classId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const getFirstLine = (text: string) => {
    const lines = text.split("\n");
    return lines[0];
  };

  const hasMultipleLines = (text: string) => {
    return text.includes("\n") || text.length > 100;
  };

  const ExpandableDescription = ({
    description,
    classId,
  }: {
    description: string;
    classId: string;
  }) => {
    const isExpanded = expandedDescriptions.has(classId);
    const shouldShowToggle = hasMultipleLines(description);
    const displayText = isExpanded ? description : getFirstLine(description);

    if (!shouldShowToggle) {
      return <div className="break-words whitespace-normal">{description}</div>;
    }

    return (
      <div className="break-words whitespace-normal">
        <div className={isExpanded ? "" : "line-clamp-1"}>{displayText}</div>
        <button
          onClick={() => toggleDescriptionExpansion(classId)}
          className="cursor-pointer flex items-center mt-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
        >
          {isExpanded ? (
            <>
              <span>Show less</span>
              <ChevronUpIcon className="h-3 w-3 ml-1" />
            </>
          ) : (
            <>
              <span>Show more</span>
              <ChevronDownIcon className="h-3 w-3 ml-1" />
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      {/* Header Section - Mobile Responsive */}
      <div className="mb-6">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">
            All Classes
          </h1>

          {/* Search Bar - Full Width on Mobile */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search classes..."
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
          <Link
            href="/dashboard/classes/create-classes"
            className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full font-medium"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Class
          </Link>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">All Classes</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search classes, instructors, or descriptions..."
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
            <Link
              href="/dashboard/classes/create-classes"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Class
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading classes...</span>
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
            Error loading classes
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchClasses()}
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
                  <th className="px-6 py-3 border-b border-gray-200">NAME</th>
                  <th className="px-6 py-3 border-b border-gray-200">
                    DESCRIPTION
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200">
                    INSTRUCTOR
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200">
                    SCHEDULE
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200">STATUS</th>
                  <th className="px-6 py-3 border-b border-gray-200 text-right">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {searchTerm
                        ? "No classes found matching your search."
                        : "No classes available."}
                    </td>
                  </tr>
                ) : (
                  classes.map((cls) => (
                    <tr key={cls.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {cls.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        <ExpandableDescription
                          description={cls.description}
                          classId={cls.id}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {cls.instructor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {cls.schedule && cls.schedule.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleScheduleClick(cls.schedule)}
                              className="cursor-pointer flex items-center px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
                              {cls.schedule.length} Schedule
                              {cls.schedule.length > 1 ? "s" : ""}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500">No Schedule</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cls.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {cls.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Tooltip content="View class">
                            <button
                              onClick={() => handleView(cls.id)}
                              className="cursor-pointer p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                          </Tooltip>
                          <div className="relative inline-flex">
                            <Tooltip
                              content={
                                cls.isActive
                                  ? "Disable class"
                                  : "Activate class"
                              }
                            >
                              <button
                                onClick={() =>
                                  cls.isActive
                                    ? handleDisableClick(cls.id, cls.name)
                                    : handleToggleStatus(
                                        cls.id,
                                        cls.isActive || false,
                                      )
                                }
                                className={`cursor-pointer p-2 rounded-md text-white hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                  cls.isActive
                                    ? "bg-blue-500 hover:bg-blue-600 focus:ring-blue-400"
                                    : "bg-green-500 hover:bg-green-600 focus:ring-green-400"
                                }`}
                              >
                                <LockClosedIcon className="h-5 w-5" />
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
            {classes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm
                  ? "No classes found matching your search."
                  : "No classes available."}
              </div>
            ) : (
              classes.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cls.name}
                      </h3>
                    </div>
                    <div className="flex space-x-1">
                      <Tooltip content="View class">
                        <button
                          onClick={() => handleView(cls.id)}
                          className="cursor-pointer p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip
                        content={
                          cls.isActive ? "Disable class" : "Activate class"
                        }
                      >
                        <button
                          onClick={() =>
                            cls.isActive
                              ? handleDisableClick(cls.id, cls.name)
                              : handleToggleStatus(
                                  cls.id,
                                  cls.isActive || false,
                                )
                          }
                          className={`p-2 rounded-md text-white hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            cls.isActive
                              ? "bg-green-500 hover:bg-green-600 focus:ring-green-400"
                              : "bg-blue-500 hover:bg-blue-600 focus:ring-blue-400"
                          }`}
                        >
                          <LockClosedIcon className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    <ExpandableDescription
                      description={cls.description}
                      classId={cls.id}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <span className="font-medium mr-2">Instructor:</span>
                      <span>{cls.instructor}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      {cls.schedule && cls.schedule.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleScheduleClick(cls.schedule)}
                            className="flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          >
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {cls.schedule.length} Schedule
                            {cls.schedule.length > 1 ? "s" : ""}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500">No Schedule</span>
                      )}
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

      {/* Disable Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title={"Disable Class"}
        message={`Are you sure you want to disable "${deleteModal.className}"? The class will be hidden from students but can be reactivated later.`}
        confirmButtonText={"Disable"}
        cancelButtonText="Cancel"
        isLoading={deleteModal.isLoading}
        loadingText={"Disabling..."}
      />

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={handleCloseScheduleModal}
        schedules={selectedSchedules}
      />
    </div>
  );
}

export default AllClasses;
