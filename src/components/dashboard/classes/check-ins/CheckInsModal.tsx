"use client";

import React, { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  CalendarIcon,
  UserIcon,
  XMarkIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import DeleteConfirmationModal from "@/components/dashboard/common/DeleteConfirmationModal";
import Tooltip from "@/components/dashboard/common/Tooltip";

interface CheckInData {
  id: string;
  enrollmentId: string;
  classId: string;
  userId: string;
  checkinDate: string;
  checkinTime: string;
  checkinStatus: string | boolean;
  scheduleId: string;
  scheduleTime: {
    startTime: string;
    endTime: string;
  } | null;
  createdAt: string;
  className: string | null;
  classImage: string | null;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  enrollmentStatus: string | null;
}

interface CheckInsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className: string | null;
  classImage: string | null;
  type?: "upcoming" | "ended";
}

const CheckInsModal: React.FC<CheckInsModalProps> = ({
  isOpen,
  onClose,
  classId,
  className,
  classImage,
  type = "upcoming",
}) => {
  const [checkIns, setCheckIns] = useState<CheckInData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingCheckIn, setTogglingCheckIn] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    checkInId: string | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    checkInId: null,
    isLoading: false,
  });

  useEffect(() => {
    if (isOpen && classId) {
      fetchCheckIns();
    }
  }, [isOpen, classId, type]);

  const fetchCheckIns = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ type });
      const response = await fetch(
        `/api/check-ins/class/${classId}?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCheckIns(data.checkIns || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching check-ins:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusDisplay = (status: string | boolean | null | undefined) => {
    if (status === null || status === undefined) return "N/A";

    if (typeof status === "boolean") {
      return status ? "Checked-in" : "Not Checked-in";
    }

    const statusStr = String(status).toLowerCase();
    if (statusStr === "true" || statusStr === "1") {
      return "Checked-in";
    }
    if (statusStr === "false" || statusStr === "0") {
      return "Not Checked-in";
    }

    return String(status);
  };

  const getStatusBadgeClass = (status: string | boolean | null | undefined) => {
    if (status === null || status === undefined) {
      return "bg-gray-100 text-gray-800";
    }

    if (typeof status === "boolean") {
      return status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
    }

    const statusLower = String(status).toLowerCase();
    if (
      statusLower === "true" ||
      statusLower === "1" ||
      statusLower === "checked-in"
    ) {
      return "bg-green-100 text-green-800";
    }
    if (
      statusLower === "false" ||
      statusLower === "0" ||
      statusLower === "not checked-in"
    ) {
      return "bg-red-100 text-red-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const handleToggleCheckIn = async (
    checkInId: string,
    currentStatus: string | boolean,
  ) => {
    setTogglingCheckIn(checkInId);

    try {
      const isCurrentlyCheckedIn =
        typeof currentStatus === "boolean"
          ? currentStatus
          : String(currentStatus).toLowerCase() === "true" ||
            String(currentStatus).toLowerCase() === "checked-in";

      const newStatus = !isCurrentlyCheckedIn;

      const response = await fetch(`/api/check-ins/${checkInId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchCheckIns();
    } catch (err: any) {
      console.error("Error toggling check-in:", err);
      setError(err.message);
    } finally {
      setTogglingCheckIn(null);
    }
  };

  const handleDeleteClick = (checkInId: string) => {
    setDeleteModal({
      isOpen: true,
      checkInId,
      isLoading: false,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.checkInId) return;

    setDeleteModal((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/check-ins/${deleteModal.checkInId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchCheckIns();
      setDeleteModal({
        isOpen: false,
        checkInId: null,
        isLoading: false,
      });
    } catch (err: any) {
      console.error("Error deleting check-in:", err);
      setError(err.message);
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleDeleteClose = () => {
    setDeleteModal({
      isOpen: false,
      checkInId: null,
      isLoading: false,
    });
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl h-[90vh] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {classImage && (
                        <img
                          src={classImage}
                          alt={className || "Class"}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <Dialog.Title
                        as="h3"
                        className="flex items-center gap-2 text-lg font-bold leading-6 text-gray-900"
                      >
                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                        {className || "Class"} Check-ins
                      </Dialog.Title>
                    </div>
                    <button
                      onClick={onClose}
                      className="cursor-pointer rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-red-100 transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5 hover:text-red-500" />
                    </button>
                  </div>

                  <div className="mt-6 flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">
                          Loading check-ins...
                        </span>
                      </div>
                    ) : error ? (
                      <div className="flex items-center justify-center h-32">
                        <p className="text-red-500">Error: {error}</p>
                      </div>
                    ) : checkIns.length === 0 ? (
                      <div className="flex items-center justify-center h-32">
                        <p className="text-center text-gray-500 text-lg">
                          No check-ins available for this class.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                          <thead>
                            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <th className="px-6 py-3 border-b border-gray-200">
                                {type === "ended"
                                  ? "ENDED-ON"
                                  : "CHECKED-IN-ON"}
                              </th>
                              <th className="px-6 py-3 border-b border-gray-200">
                                USER
                              </th>
                              <th className="px-6 py-3 border-b border-gray-200">
                                EMAIL
                              </th>
                              <th className="px-6 py-3 border-b border-gray-200">
                                STATUS
                              </th>
                              <th className="px-6 py-3 border-b border-gray-200">
                                ACTIONS
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {checkIns.map((checkIn) => (
                              <tr key={checkIn.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                                    {formatDate(checkIn.checkinDate)}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center">
                                    <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                                    {checkIn.userName ||
                                      checkIn.userId ||
                                      "N/A"}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {checkIn.userEmail || "N/A"}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span
                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                                      checkIn.checkinStatus,
                                    )}`}
                                  >
                                    {getStatusDisplay(checkIn.checkinStatus)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex justify-end space-x-2 items-center">
                                    {type !== "ended" && (
                                      <Tooltip
                                        content={
                                          getStatusDisplay(
                                            checkIn.checkinStatus,
                                          ) === "Checked-in"
                                            ? "Cancel check-in"
                                            : "Check-in"
                                        }
                                      >
                                        <span className="inline-block">
                                          <button
                                            onClick={() =>
                                              handleToggleCheckIn(
                                                checkIn.id,
                                                checkIn.checkinStatus,
                                              )
                                            }
                                            disabled={
                                              togglingCheckIn === checkIn.id
                                            }
                                            className={`cursor-pointer p-2 rounded-md text-white hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                              getStatusDisplay(
                                                checkIn.checkinStatus,
                                              ) === "Checked-in"
                                                ? "bg-red-500 hover:bg-red-600 focus:ring-red-400"
                                                : "bg-green-500 hover:bg-green-600 focus:ring-green-400"
                                            }`}
                                          >
                                            {togglingCheckIn === checkIn.id ? (
                                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            ) : getStatusDisplay(
                                                checkIn.checkinStatus,
                                              ) === "Checked-in" ? (
                                              <XCircleIcon className="h-5 w-5" />
                                            ) : (
                                              <CheckCircleIcon className="h-5 w-5" />
                                            )}
                                          </button>
                                        </span>
                                      </Tooltip>
                                    )}
                                    <Tooltip content="Delete check-in">
                                      <span className="inline-block">
                                        <button
                                          onClick={() =>
                                            handleDeleteClick(checkIn.id)
                                          }
                                          className="cursor-pointer p-2 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                                        >
                                          <TrashIcon className="h-5 w-5" />
                                        </button>
                                      </span>
                                    </Tooltip>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Delete Check-in"
        message="Are you sure you want to delete this check-in? This action cannot be undone."
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        isLoading={deleteModal.isLoading}
        loadingText="Deleting..."
      />
    </>
  );
};

export default CheckInsModal;
