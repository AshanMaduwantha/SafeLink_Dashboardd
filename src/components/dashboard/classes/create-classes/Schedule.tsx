"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useSearchParams } from "next/navigation";
import ScheduleClassModal from "./ScheduleClassModal";
import DeleteConfirmationModal from "../../common/DeleteConfirmationModal";
import {
  ScheduledClass,
  NewScheduledClass,
  ScheduleFormRef,
  ScheduleProps,
} from "@/types/schedule";

export type { ScheduleFormRef };

const Schedule = forwardRef<ScheduleFormRef, ScheduleProps>(
  ({ onLoadingChange }, ref) => {
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");

    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(today.getDate());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDateObj, setSelectedDateObj] = useState<Date>(today);
    const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>(
      [],
    );
    const [editingSchedule, setEditingSchedule] =
      useState<ScheduledClass | null>(null);
    const [_loading, setLoading] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] =
      useState<ScheduledClass | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showValidationError, setShowValidationError] = useState(false);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);

    useImperativeHandle(ref, () => ({
      triggerValidation: () => {
        if (scheduledClasses.length === 0) {
          setShowValidationError(true);
          return Promise.resolve(false);
        }
        setShowValidationError(false);
        return Promise.resolve(true);
      },
      isLoading: () => isLoadingSchedule,
    }));

    useEffect(() => {
      if (classId) {
        fetchAllScheduledClasses();
      }
    }, [classId]);

    const generateCalendarDays = () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      const firstDayOfMonth = new Date(year, month, 1);
      const dayOfWeek = firstDayOfMonth.getDay();
      const startDayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const startDate = new Date(firstDayOfMonth);
      startDate.setDate(firstDayOfMonth.getDate() - startDayOffset);

      const days = [];
      const currentDate = new Date(startDate);

      for (let i = 0; i < 42; i++) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return days;
    };

    const calendarDays = generateCalendarDays();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const handlePrevMonth = () => {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
      );
    };

    const handleNextMonth = () => {
      setCurrentMonth(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
      );
    };

    const isCurrentMonth = (date: Date) => {
      return date.getMonth() === currentMonth.getMonth();
    };

    const isSelectedDate = (date: Date) => {
      return date.getDate() === selectedDate && isCurrentMonth(date);
    };

    const isPastDate = (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate < today;
    };

    const handleDateClick = (date: Date) => {
      if (isPastDate(date)) return;

      setSelectedDate(date.getDate());
      setSelectedDateObj(date);
    };

    const handleScheduleNew = () => {
      setEditingSchedule(null);
      setIsModalOpen(true);
    };

    const handleModalClose = () => {
      setIsModalOpen(false);
      setEditingSchedule(null);
    };

    // Fetch all scheduled classes for the class
    const fetchAllScheduledClasses = async () => {
      if (!classId) {
        return;
      }

      try {
        setLoading(true);
        setIsLoadingSchedule(true);
        onLoadingChange?.(true);

        const response = await fetch(`/api/classes/${classId}/schedule`);

        if (response.ok) {
          const data = await response.json();
          setScheduledClasses(data.schedule || []);
        } else {
          setScheduledClasses([]);
        }
      } catch (error) {
        console.error("Error fetching scheduled classes:", error);
        setScheduledClasses([]);
      } finally {
        setLoading(false);
        setIsLoadingSchedule(false);
        onLoadingChange?.(false);
      }
    };

    const _formatDateForAPI = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${month}/${day}/${year}`;
    };

    // Format time for display
    const formatTimeForDisplay = (time24: string) => {
      const [hours, minutes] = time24.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    // Format date for display
    const _formatDateForDisplay = (dateString: string) => {
      const [month, day, year] = dateString.split("/");
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        month: "short",
        day: "numeric",
      };
      return date.toLocaleDateString("en-US", options);
    };

    // Format scheduled date for display
    const formatScheduledDateForDisplay = (dateString: string) => {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      };
      return date.toLocaleDateString("en-US", options);
    };

    const handleSaveClass = async (data: NewScheduledClass) => {
      if (!classId) {
        console.error("No class ID available");
        setIsModalOpen(false);
        return;
      }

      try {
        setLoading(true);
        setIsLoadingSchedule(true);

        let response;
        if (data.schedule_id) {
          // If schedule_id exists, it's an edit operation (PUT)
          response = await fetch(
            `/api/classes/${classId}/schedule?scheduleId=${data.schedule_id}`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            },
          );
        } else {
          // Otherwise, it's a new schedule operation (POST)
          response = await fetch(`/api/classes/${classId}/schedule`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });
        }

        if (response.ok) {
          await fetchAllScheduledClasses();
          setIsModalOpen(false);
          setShowValidationError(false);
        } else {
          let errorData = { error: "Unknown error" };
          try {
            // Attempt to parse JSON only if content-type is application/json
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              errorData = await response.json();
            } else {
              // If not JSON, read as text or provide a generic error
              const errorText = await response.text();
              errorData.error = errorText || "Server error, no JSON response.";
            }
          } catch (jsonError) {
            console.error("Error parsing error response:", jsonError);
            errorData.error = "Failed to parse server error response.";
          }
          console.error("Failed to save schedule:", errorData.error);
        }
      } catch (error) {
        console.error("Error saving schedule:", error);
      } finally {
        setLoading(false);
        setIsLoadingSchedule(false);
      }
    };

    const handleDeleteClick = (scheduleItem: ScheduledClass) => {
      setScheduleToDelete(scheduleItem);
      setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
      if (!classId || !scheduleToDelete) {
        console.error("No class ID or schedule to delete");
        return;
      }

      try {
        setDeleting(true);
        setIsLoadingSchedule(true);
        const response = await fetch(
          `/api/classes/${classId}/schedule?scheduleId=${scheduleToDelete.schedule_id}`,
          {
            method: "DELETE",
          },
        );

        if (response.ok) {
          await fetchAllScheduledClasses();
          setDeleteModalOpen(false);
          setScheduleToDelete(null);
        } else {
          const errorData = await response.json();
          console.error("Failed to delete schedule:", errorData.error);
        }
      } catch (error) {
        console.error("Error deleting schedule:", error);
      } finally {
        setDeleting(false);
        setIsLoadingSchedule(false);
      }
    };

    const handleDeleteCancel = () => {
      setDeleteModalOpen(false);
      setScheduleToDelete(null);
    };

    const handleEditClick = (scheduleItem: ScheduledClass) => {
      setEditingSchedule(scheduleItem);
      setSelectedDateObj(new Date(scheduleItem.date)); // Set selected date for modal
      setIsModalOpen(true);
    };

    return (
      <div className="w-full p-3 sm:p-6 bg-white rounded-lg">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Schedule
          </h1>
          <p className="text-gray-600 text-sm">
            Classes and Duration information.
          </p>
        </div>

        {/* Calendar */}
        <div className="bg-white p-3 sm:p-6 mb-6 sm:mb-8">
          {/* Month Navigation */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={handlePrevMonth}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button
              onClick={handleNextMonth}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map((day, index) => (
              <div
                key={index}
                className="text-center text-sm font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 border border-gray-200 rounded-lg overflow-hidden">
            {/* Calendar Days */}
            {calendarDays.map((date, index) => {
              const isPast = isPastDate(date);
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(date)}
                  disabled={isPast}
                  className={`
                  relative w-full h-12 text-sm transition-colors flex items-center justify-center border-b border-r border-gray-200 last:border-r-0
                  ${
                    isPast
                      ? "text-gray-300 bg-gray-50 cursor-not-allowed"
                      : isCurrentMonth(date)
                        ? "text-gray-900 hover:bg-gray-100 cursor-pointer"
                        : "text-gray-400 bg-gray-50 cursor-pointer"
                  }
                `}
                >
                  <span
                    className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                  ${
                    isSelectedDate(date)
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : ""
                  }
                `}
                  >
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scheduled Classes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Scheduled Classes
            </h3>
            <button
              onClick={handleScheduleNew}
              className="cursor-pointer bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5"
            >
              <span className="text-sm">+</span>
              Schedule New
            </button>
          </div>
          {showValidationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">
                Please schedule at least one class before continuing.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {isLoadingSchedule ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-500">
                    Loading scheduled classes...
                  </span>
                </div>
              </div>
            ) : scheduledClasses.length > 0 ? (
              scheduledClasses
                .sort((a, b) => {
                  // Sort by date first, then by start time
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);

                  if (dateA.getTime() !== dateB.getTime()) {
                    return dateA.getTime() - dateB.getTime();
                  }

                  // If same date, sort by start time
                  return a.startTime.localeCompare(b.startTime);
                })
                .map((classItem) => (
                  <div
                    key={classItem.schedule_id}
                    className="bg-white rounded-lg p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-600">
                            {formatScheduledDateForDisplay(classItem.date)}
                          </p>
                          <span className="text-sm text-gray-500">•</span>
                          <h4 className="font-semibold text-gray-900">
                            {classItem.name}
                          </h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-12">
                        <p className="text-sm text-gray-600 sm:text-right">
                          {formatTimeForDisplay(classItem.startTime)} -{" "}
                          {formatTimeForDisplay(classItem.endTime)}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(classItem)}
                            className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 transition-colors"
                            title="Edit scheduled class"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="h-4 w-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(classItem)}
                            className="cursor-pointer bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                            title="Delete scheduled class"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500">
                  No scheduled classes for this class
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Schedule Class Modal */}
        <ScheduleClassModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          selectedDate={selectedDateObj}
          onSave={handleSaveClass}
          editingSchedule={editingSchedule}
          scheduledClasses={scheduledClasses}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Remove Scheduled Class"
          message={`Are you sure you want to remove "${scheduleToDelete?.name}"? This action cannot be undone.`}
          confirmButtonText="Remove"
          cancelButtonText="Cancel"
          isLoading={deleting}
        />
      </div>
    );
  },
);

Schedule.displayName = "Schedule";

export default Schedule;
