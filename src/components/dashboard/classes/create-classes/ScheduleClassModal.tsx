"use client";

import React, { useState, useEffect } from "react";
import { ScheduledClass, NewScheduledClass } from "@/types/schedule";

interface ScheduleClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSave: (data: NewScheduledClass) => Promise<void>;
  editingSchedule: ScheduledClass | null;
  scheduledClasses?: ScheduledClass[];
}

const ScheduleClassModal: React.FC<ScheduleClassModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSave,
  editingSchedule,
  scheduledClasses = [],
}) => {
  const [formData, setFormData] = useState<NewScheduledClass>({
    name: "",
    startTime: "",
    endTime: "",
    date: "",
  });

  const [errors, setErrors] = useState({
    name: "",
    startTime: "",
    endTime: "",
  });

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const formatTimeForInput = (time: string) => {
    if (!time) return "";
    // Convert 24-hour format to 12-hour format for display
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation for name field
    if (field === "name") {
      if (value.length > 40) {
        setErrors((prev) => ({
          ...prev,
          [field]: "Name must be 40 characters or less",
        }));
      } else if (errors[field as keyof typeof errors]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    } else {
      // Clear error when user starts typing for other fields
      if (errors[field as keyof typeof errors]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      startTime: "",
      endTime: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 40) {
      newErrors.name = "Name must be 40 characters or less";
    }

    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    }

    // Check if end time is after start time
    if (formData.startTime && formData.endTime) {
      if (formData.startTime >= formData.endTime) {
        newErrors.endTime = "End time must be after start time";
      } else {
        // Validation: Check for time overlap
        const isTimeOverlap = scheduledClasses.some((schedule) => {
          // Skip the current schedule if we are editing
          if (
            editingSchedule &&
            schedule.schedule_id === editingSchedule.schedule_id
          ) {
            return false;
          }

          const scheduleDate = new Date(schedule.date);
          const formDate = new Date(selectedDate);

          const isSameDate =
            scheduleDate.getFullYear() === formDate.getFullYear() &&
            scheduleDate.getMonth() === formDate.getMonth() &&
            scheduleDate.getDate() === formDate.getDate();

          if (!isSameDate) return false;

          // Convert times to minutes for easier comparison
          const [startHour, startMinute] = formData.startTime
            .split(":")
            .map(Number);
          const [endHour, endMinute] = formData.endTime.split(":").map(Number);
          const newStart = startHour * 60 + startMinute;
          const newEnd = endHour * 60 + endMinute;

          const [sStartHour, sStartMinute] = schedule.startTime
            .split(":")
            .map(Number);
          const [sEndHour, sEndMinute] = schedule.endTime
            .split(":")
            .map(Number);
          const existingStart = sStartHour * 60 + sStartMinute;
          const existingEnd = sEndHour * 60 + sEndMinute;

          // Overlap condition: (StartA < EndB) and (EndA > StartB)
          return newStart < existingEnd && newEnd > existingStart;
        });

        if (isTimeOverlap) {
          newErrors.startTime = "Time overlaps with an existing class";
        }
      }
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    if (isOpen && editingSchedule) {
      setFormData({
        name: editingSchedule.name,
        startTime: editingSchedule.startTime,
        endTime: editingSchedule.endTime,
        date: formatDateForAPI(new Date(editingSchedule.date)),
        schedule_id: editingSchedule.schedule_id,
      });
    } else if (isOpen && !editingSchedule) {
      // Reset form for new schedule
      setFormData({
        name: "",
        startTime: "",
        endTime: "",
        date: formatDateForAPI(selectedDate),
      });
    }
    setErrors({ name: "", startTime: "", endTime: "" }); // Clear errors on modal open/edit
  }, [isOpen, editingSchedule, selectedDate]);

  const handleSave = async () => {
    if (validateForm()) {
      const dataToSave: NewScheduledClass = {
        name: formData.name,
        startTime: formData.startTime,
        endTime: formData.endTime,
        date: formatDateForAPI(selectedDate),
      };

      if (editingSchedule) {
        dataToSave.schedule_id = editingSchedule.schedule_id;
      }

      await onSave(dataToSave);

      // Reset form
      setFormData({ name: "", startTime: "", endTime: "", date: "" });
      setErrors({ name: "", startTime: "", endTime: "" });
      onClose();
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", startTime: "", endTime: "", date: "" });
    setErrors({ name: "", startTime: "", endTime: "" });
    onClose();
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingSchedule ? "Edit Scheduled Class" : "Schedule New Class"}
          </h2>
        </div>

        {/* Selected Date Summary */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-6 mt-4 rounded">
          <div className="text-blue-800">
            <p className="font-medium">Date: {formatDate(selectedDate)}</p>
            <p className="text-sm">
              Time:{" "}
              {formData.startTime && formData.endTime
                ? `${formatTimeForInput(formData.startTime)} - ${formatTimeForInput(formData.endTime)}`
                : "Select start and end time"}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <span
                className={`text-xs ${formData.name.length > 40 ? "text-red-500" : "text-gray-500"}`}
              >
                {formData.name.length}/40
              </span>
            </div>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter class name"
              maxLength={40}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Time Fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startTime ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.startTime && (
                <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
              )}
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange("endTime", e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endTime ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.endTime && (
                <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-200 space-y-3">
          <button
            onClick={handleSave}
            className="cursor-pointer w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="cursor-pointer w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleClassModal;
