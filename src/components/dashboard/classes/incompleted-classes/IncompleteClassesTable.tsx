"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayIcon, TrashIcon } from "@heroicons/react/24/outline";
import DeleteConfirmationModal from "@/components/dashboard/common/DeleteConfirmationModal";
import Tooltip from "@/components/dashboard/common/Tooltip";

interface IncompleteClass {
  id: string;
  className: string;
  description: string;
  instructorName: string;
  createdAt: string;
  lastStep: number;
}

interface IncompleteClassesTableProps {
  classes: IncompleteClass[];
  onDelete: (classId: string) => void;
}

export default function IncompleteClassesTable({
  classes,
  onDelete,
}: IncompleteClassesTableProps) {
  const router = useRouter();
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    classId: string | null;
    className: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    classId: null,
    className: "",
    isLoading: false,
  });

  // Function to get step name from step number
  const getStepName = (stepNumber: number): string => {
    const stepNames = [
      "Class Details", // Step 1 (index 0)
      "Thumbnail & Overview", // Step 2 (index 1)
      "Schedule", // Step 3 (index 2)
      "Pricing", // Step 4 (index 3)
      "Review", // Step 5 (index 4)
    ];
    return stepNames[stepNumber] || "Unknown Step";
  };

  const handleResume = (classId: string, lastStep: number) => {
    // Navigate to the create-class page with the classId and appropriate step
    // lastStep represents the last completed step (0-4), so we need to go to the next step
    const stepSlugs = [
      "class-details", // Step 1 (index 0)
      "thumbnail-and-overviewvideo", // Step 2 (index 1)
      "schedule", // Step 3 (index 2)
      "pricing", // Step 4 (index 3)
      "review", // Step 5 (index 4)
    ];

    // Navigate to the next step after the last completed step
    // If lastStep is 0 (no steps completed), go to step 1 (class-details)
    // If lastStep is 1 (completed step 1), go to step 2 (thumbnail-and-overviewvideo)
    // If lastStep is 2 (completed step 2), go to step 3 (schedule)
    // And so on...
    const nextStepIndex = lastStep; // This will be the next step to work on
    const stepSlug = stepSlugs[nextStepIndex] || "class-details";

    router.push(
      `/dashboard/classes/create-classes?step=${stepSlug}&classId=${classId}`,
    );
  };

  const handleDeleteClick = (classId: string, className: string) => {
    setDeleteModal({
      isOpen: true,
      classId,
      className,
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.classId) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      await onDelete(deleteModal.classId);
      setDeleteModal({
        isOpen: false,
        classId: null,
        className: "",
        isLoading: false,
      });
    } catch (error) {
      console.error("Error deleting class:", error);
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({
      isOpen: false,
      classId: null,
      className: "",
      isLoading: false,
    });
  };

  if (classes.length === 0) {
    return (
      <>
        {/* Desktop Empty State */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="w-full bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3 border-b border-gray-200">
                  CLASS NAME
                </th>
                <th className="px-6 py-3 border-b border-gray-200">
                  LAST STEP
                </th>
                <th className="px-6 py-3 border-b border-gray-200">CREATED</th>
                <th className="px-6 py-3 border-b border-gray-200 text-right">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No incomplete classes found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile Empty State */}
        <div className="md:hidden text-center py-12 text-gray-500">
          No incomplete classes found.
        </div>

        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Incomplete Class"
          message={`Are you sure you want to delete "${deleteModal.className}"? This action cannot be undone.`}
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
          isLoading={deleteModal.isLoading}
        />
      </>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="w-full bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3 border-b border-gray-200">CLASS NAME</th>
              <th className="px-6 py-3 border-b border-gray-200">LAST STEP</th>
              <th className="px-6 py-3 border-b border-gray-200">CREATED</th>
              <th className="px-6 py-3 border-b border-gray-200 text-right">
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.map((classItem, _index) => (
              <tr key={classItem.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {classItem.className || "Untitled Class"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {getStepName(classItem.lastStep)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {new Date(classItem.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Tooltip content="Resume class creation">
                      <button
                        onClick={() =>
                          handleResume(classItem.id, classItem.lastStep)
                        }
                        className="cursor-pointer p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                    </Tooltip>
                    <div className="relative inline-flex">
                      <Tooltip content="Delete class">
                        <button
                          onClick={() =>
                            handleDeleteClick(
                              classItem.id,
                              classItem.className || "Untitled Class",
                            )
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {classes.map((classItem, _index) => (
          <div
            key={classItem.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {classItem.className || "Untitled Class"}
                </h3>
              </div>
              <div className="flex space-x-1">
                <Tooltip content="Resume class creation">
                  <button
                    onClick={() =>
                      handleResume(classItem.id, classItem.lastStep)
                    }
                    className="p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                  >
                    <PlayIcon className="h-4 w-4" />
                  </button>
                </Tooltip>
                <Tooltip content="Delete class">
                  <button
                    onClick={() =>
                      handleDeleteClick(
                        classItem.id,
                        classItem.className || "Untitled Class",
                      )
                    }
                    className="p-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-500">
                <span className="font-medium mr-2">Created:</span>
                <span>
                  {new Date(classItem.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <span className="font-medium mr-2">Last Step:</span>
                <span>{getStepName(classItem.lastStep)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Incomplete Class"
        message={`Are you sure you want to delete "${deleteModal.className}"? This action cannot be undone.`}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        isLoading={deleteModal.isLoading}
      />
    </>
  );
}
