"use client";

import React, { useState, useEffect } from "react";
import { MagnifyingGlassIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import Pagination from "@/components/dashboard/common/Pagination";
import CheckInsModal from "./CheckInsModal";

interface ClassData {
  classId: string;
  className: string | null;
  classImage: string | null;
  checkinCount: number;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

function CheckIns() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [classesData, setClassesData] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"upcoming" | "ended">("upcoming");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [checkInsModal, setCheckInsModal] = useState<{
    isOpen: boolean;
    classId: string;
    className: string | null;
    classImage: string | null;
  }>({
    isOpen: false,
    classId: "",
    className: null,
    classImage: null,
  });

  const tabs = [
    {
      name: "Upcoming",
      value: "upcoming" as const,
      current: activeTab === "upcoming",
    },
    { name: "Ended", value: "ended" as const, current: activeTab === "ended" },
  ];

  function classNames(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(" ");
  }

  useEffect(() => {
    fetchClasses();
    setIsInitialLoad(false);
  }, []);

  useEffect(() => {
    if (!isInitialLoad) {
      fetchClasses();
    }
  }, [currentPage, statusFilter, activeTab]);

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
      if (!isSearch) {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        type: activeTab,
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(statusFilter !== "all" && { status: statusFilter }),
      });

      const response = await fetch(`/api/check-ins?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setClassesData(data.classes || []);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching classes:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const _handleStatusFilterChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setStatusFilter(e.target.value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewCheckIns = (classData: ClassData) => {
    setCheckInsModal({
      isOpen: true,
      classId: classData.classId,
      className: classData.className,
      classImage: classData.classImage,
    });
  };

  const handleTabChange = (tabValue: "upcoming" | "ended") => {
    setActiveTab(tabValue);
    setCurrentPage(1);
  };

  const handleCloseCheckInsModal = () => {
    setCheckInsModal({
      isOpen: false,
      classId: "",
      className: null,
      classImage: null,
    });
    // Refresh the classes list when modal closes (in case check-ins were modified)
    fetchClasses();
  };

  if (loading && isInitialLoad) {
    return (
      <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading check-ins...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md text-center text-red-500">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
      {/* Header Section */}
      <div className="mb-6">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">
            Class Check-ins
          </h1>

          {/* Tabs - Mobile */}
          <div className="grid grid-cols-1 mb-4">
            <select
              value={activeTab}
              onChange={(e) =>
                handleTabChange(e.target.value as "upcoming" | "ended")
              }
              aria-label="Select a tab"
              className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
            >
              {tabs.map((tab) => (
                <option key={tab.value} value={tab.value}>
                  {tab.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500"
            />
          </div>

          {/* Search Bar */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search check-ins..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:block">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-semibold text-gray-800">
              Class Check-ins
            </h1>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by class name..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          {/* Tabs - Desktop */}
          <div className="border-b border-gray-200">
            <nav aria-label="Tabs" className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleTabChange(tab.value)}
                  aria-current={tab.current ? "page" : undefined}
                  className={classNames(
                    tab.current
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                    "border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap cursor-pointer",
                  )}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3 border-b border-gray-200">CLASS</th>
              <th className="px-6 py-3 border-b border-gray-200">CHECK-INS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classesData.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {searchTerm || statusFilter !== "all"
                    ? "No classes found matching your search."
                    : "No classes with check-ins available."}
                </td>
              </tr>
            ) : (
              classesData.map((classData) => (
                <tr key={classData.classId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center">
                      {classData.classImage && (
                        <img
                          src={classData.classImage}
                          alt={classData.className || "Class"}
                          className="h-8 w-8 rounded-full mr-2 object-cover"
                        />
                      )}
                      <span className="font-medium">
                        {classData.className || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {classData.checkinCount > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewCheckIns(classData)}
                          className="cursor-pointer flex items-center px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          <CalendarIcon className="h-4 w-4 mr-1 text-blue-500" />
                          {classData.checkinCount} Check-in
                          {classData.checkinCount > 1 ? "s" : ""}
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500">No Check-ins</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {classesData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm || statusFilter !== "all"
              ? "No classes found matching your search."
              : "No classes with check-ins available."}
          </div>
        ) : (
          classesData.map((classData) => (
            <div
              key={classData.classId}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  {classData.classImage && (
                    <img
                      src={classData.classImage}
                      alt={classData.className || "Class"}
                      className="h-8 w-8 rounded-full mr-2 object-cover"
                    />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {classData.className || "N/A"}
                  </h3>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  {classData.checkinCount > 0 ? (
                    <button
                      onClick={() => handleViewCheckIns(classData)}
                      className="cursor-pointer flex items-center px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      <CalendarIcon className="h-4 w-4 mr-1 text-blue-500" />
                      {classData.checkinCount} Check-in
                      {classData.checkinCount > 1 ? "s" : ""}
                    </button>
                  ) : (
                    <span className="text-gray-500 text-sm">No Check-ins</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {pagination.totalItems > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}

      <CheckInsModal
        isOpen={checkInsModal.isOpen}
        onClose={handleCloseCheckInsModal}
        classId={checkInsModal.classId}
        className={checkInsModal.className}
        classImage={checkInsModal.classImage}
        type={activeTab}
      />
    </div>
  );
}

export default CheckIns;
