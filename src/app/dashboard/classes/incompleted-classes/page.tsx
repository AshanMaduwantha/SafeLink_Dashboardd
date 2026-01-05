"use client";

import React, { useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import IncompleteClassesTable from "@/components/dashboard/classes/incompleted-classes/IncompleteClassesTable";

interface IncompleteClass {
  id: string;
  className: string;
  description: string;
  instructorName: string;
  createdAt: string;
  lastStep: number;
}

export default function IncompleteClassesPage() {
  const [classes, setClasses] = useState<IncompleteClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Initial load
  useEffect(() => {
    fetchIncompleteClasses(false);
    setIsInitialLoad(false);
  }, []);

  // Debounce search term
  useEffect(() => {
    if (!isInitialLoad) {
      const timer = setTimeout(() => {
        setDebouncedSearchTerm(searchTerm);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchTerm, isInitialLoad]);

  // Handle search
  useEffect(() => {
    if (!isInitialLoad) {
      fetchIncompleteClasses(true);
    }
  }, [debouncedSearchTerm]);

  const fetchIncompleteClasses = async (isSearch = false) => {
    try {
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (debouncedSearchTerm) {
        params.append("search", debouncedSearchTerm);
      }

      const response = await fetch(`/api/classes/incomplete?${params}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setClasses(data.classes);
        } else {
          setError(data.error || "Failed to fetch incomplete classes");
        }
      } else {
        setError("Failed to fetch incomplete classes");
      }
    } catch (error) {
      console.error("Error fetching incomplete classes:", error);
      setError("Failed to fetch incomplete classes");
    } finally {
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDelete = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/draft?id=${classId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setClasses(classes.filter((cls) => cls.id !== classId));
      } else {
        throw new Error("Failed to delete class");
      }
    } catch (error) {
      console.error("Error deleting class:", error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            Loading incomplete classes...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">{error}</div>
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
            Incomplete Classes
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
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Incomplete Classes
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
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {searchLoading && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <IncompleteClassesTable classes={classes} onDelete={handleDelete} />
    </div>
  );
}
