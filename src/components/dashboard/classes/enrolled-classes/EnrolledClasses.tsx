"use client";

import React, { useState, useEffect } from "react";
import {
  PencilIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";
import EnrolledClassesModal, {
  EnrolledClassDetail,
} from "./EnrolledClassesModal";
import Pagination from "@/components/dashboard/common/Pagination";

interface EnrolledClassData {
  name: string;
  email: string;
  phone: string;
  enrolledClassesCount: number;
  isActive: boolean;
  enrolledClasses: EnrolledClassDetail[];
}

function EnrolledClasses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEnrolledClasses, setSelectedEnrolledClasses] = useState<
    EnrolledClassDetail[]
  >([]);
  const [enrolledClassesData, setEnrolledClassesData] = useState<
    EnrolledClassData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchEnrolledClasses = async () => {
      try {
        const response = await fetch("/api/classes/enrolled");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setEnrolledClassesData(data.enrolledClasses);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledClasses();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleEdit = (_classId: string) => {};

  const handleShowClasses = (enrolledClasses: EnrolledClassDetail[]) => {
    setSelectedEnrolledClasses(enrolledClasses);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEnrolledClasses([]);
  };

  const filteredClasses = enrolledClassesData.filter(
    (cls) =>
      cls.isActive &&
      (cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.phone.includes(searchTerm)),
  );

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage);
  const paginatedClasses = filteredClasses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            Loading enrolled classes...
          </span>
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
      {/* Header Section - Mobile Responsive */}
      <div className="mb-6">
        {/* Mobile Layout */}
        <div className="md:hidden">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">
            Enrolled Classes
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
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Enrolled Classes
          </h1>
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3 border-b border-gray-200">NAME</th>
              <th className="px-6 py-3 border-b border-gray-200">EMAIL</th>
              <th className="px-6 py-3 border-b border-gray-200">PHONE</th>
              <th className="px-6 py-3 border-b border-gray-200">CLASSES</th>
              <th className="px-6 py-3 border-b border-gray-200">STATUS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedClasses.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {searchTerm
                    ? "No classes found matching your search."
                    : "No classes available."}
                </td>
              </tr>
            ) : (
              paginatedClasses.map((cls, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {cls.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {cls.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {cls.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {cls.enrolledClasses && cls.enrolledClasses.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShowClasses(cls.enrolledClasses)}
                          className="cursor-pointer flex items-center px-3 py-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                        >
                          <AcademicCapIcon className="h-4 w-4 mr-1 text-blue-500" />
                          {cls.enrolledClasses.length} Classes
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-500">No Classes</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        cls.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {cls.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedClasses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm
              ? "No classes found matching your search."
              : "No classes available."}
          </div>
        ) : (
          paginatedClasses.map((cls, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {cls.name}
                  </h3>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(cls.name)}
                    className="cursor-pointer p-2 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                    title="Edit class"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium mr-2">Email:</span>
                  <span>{cls.email}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium mr-2">Phone:</span>
                  <span>{cls.phone}</span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium mr-2">Classes:</span>
                  {cls.enrolledClasses && cls.enrolledClasses.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShowClasses(cls.enrolledClasses)}
                        className="flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        <AcademicCapIcon className="h-4 w-4 mr-1" />
                        {cls.enrolledClasses.length} Classes
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500">No Classes</span>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="font-medium mr-2">Status:</span>
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      cls.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {cls.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredClasses.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
        />
      )}

      <EnrolledClassesModal
        isOpen={isModalOpen}
        onClose={closeModal}
        enrolledClasses={selectedEnrolledClasses}
      />
    </div>
  );
}

export default EnrolledClasses;
