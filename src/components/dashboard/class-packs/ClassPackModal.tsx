"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ClassPack, ClassPackFormData } from "@/types/classPacks";
import { Class } from "@/types/classes";

interface ClassPackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClassPackFormData) => Promise<void>;
  classPack?: ClassPack | null;
  isEditMode?: boolean;
}

export default function ClassPackModal({
  isOpen,
  onClose,
  onSubmit,
  classPack,
  isEditMode = false,
}: ClassPackModalProps) {
  const [formData, setFormData] = useState<ClassPackFormData>({
    packName: "",
    classIds: [],
    isActive: true,
    isDiscountEnabled: false,
    discountPercent: 0,
  });
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [errors, setErrors] = useState<Partial<ClassPackFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [isDiscountEnabled, setIsDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Calculate total price of selected classes
  const totalSelectedPrice = (formData.classIds || []).reduce(
    (sum, classId) => {
      const match = availableClasses.find((c) => c.id === classId);
      return sum + (typeof match?.price === "number" ? match.price : 0);
    },
    0,
  );
  const discountedTotal = Math.max(
    0,
    totalSelectedPrice *
      (1 - Math.min(Math.max(discountPercent, 0), 100) / 100),
  );
  const displayTotal = isDiscountEnabled ? discountedTotal : totalSelectedPrice;

  // Fetch available classes
  useEffect(() => {
    if (isOpen) {
      fetchAvailableClasses();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && classPack) {
        setFormData({
          packName: classPack.packName,
          classIds: classPack.classes?.map((c) => c.id) || [],
          isActive: classPack.isActive,
          isDiscountEnabled: false,
          discountPercent: 0,
        });
      } else {
        setFormData({
          packName: "",
          classIds: [],
          isActive: true,
          isDiscountEnabled: false,
          discountPercent: 0,
        });
      }
      setErrors({});
    }
  }, [isOpen, isEditMode, classPack]);

  const fetchAvailableClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await fetch("/api/classes/available");
      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }
      const data = await response.json();
      setAvailableClasses(data.classes || []);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleInputChange = (
    field: keyof ClassPackFormData,
    value: string | boolean | string[],
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleClassToggle = (classId: string) => {
    setFormData((prev) => {
      const currentIds = prev.classIds || [];
      const newIds = currentIds.includes(classId)
        ? currentIds.filter((id) => id !== classId)
        : [...currentIds, classId];
      return {
        ...prev,
        classIds: newIds,
      };
    });

    // Clear error
    if (errors.classIds) {
      setErrors((prev) => ({
        ...prev,
        classIds: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ClassPackFormData> = {};

    if (!formData.packName.trim()) {
      newErrors.packName = "Pack name is required";
    }

    if (!formData.classIds || formData.classIds.length === 0) {
      newErrors.classIds = ["At least one class must be selected"];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        isDiscountEnabled,
        discountPercent,
      });
      handleClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        packName: "",
        classIds: [],
        isActive: true,
        isDiscountEnabled: false,
        discountPercent: 0,
      });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-gray-900/50"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in my-8 w-full max-w-2xl mx-auto sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-800 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <DialogTitle
                as="h3"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {isEditMode ? "Edit Class Pack" : "Create Class Pack"}
              </DialogTitle>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="cursor-pointer rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pack Name */}
              <div>
                <label
                  htmlFor="packName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Pack Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="packName"
                  value={formData.packName}
                  onChange={(e) =>
                    handleInputChange("packName", e.target.value)
                  }
                  placeholder="Enter pack name"
                  disabled={isLoading}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.packName ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {errors.packName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.packName as string}
                  </p>
                )}
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Classes <span className="text-red-500">*</span>
                </label>
                {loadingClasses ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">
                      Loading classes...
                    </span>
                  </div>
                ) : availableClasses.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">
                    No active classes available
                  </p>
                ) : (
                  <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                    <div className="p-3 space-y-2">
                      {availableClasses.map((cls) => (
                        <label
                          key={cls.id}
                          className="flex items-start p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={
                              formData.classIds?.includes(cls.id) || false
                            }
                            onChange={() => handleClassToggle(cls.id)}
                            disabled={isLoading}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <div className="ml-3 flex-1">
                            <div className="text-sm font-medium text-gray-900 flex items-center justify-between">
                              <span className="truncate pr-3">{cls.name}</span>
                              {typeof cls.price === "number" && (
                                <span className="text-gray-700">
                                  ${cls.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {errors.classIds && (
                  <p className="mt-1 text-sm text-red-600">
                    At least one class must be selected
                  </p>
                )}
                {formData.classIds && formData.classIds.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-600">
                      {formData.classIds.length} class
                      {formData.classIds.length > 1 ? "es" : ""} selected
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-900 font-semibold">
                        Total Price: ${displayTotal.toFixed(2)}
                      </span>
                      {isDiscountEnabled && (
                        <span className="text-xs text-gray-500 line-through">
                          ${totalSelectedPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = !isDiscountEnabled;
                          setIsDiscountEnabled(next);
                          setFormData((prev) => ({
                            ...prev,
                            isDiscountEnabled: next,
                          }));
                        }}
                        disabled={isLoading}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDiscountEnabled ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            isDiscountEnabled
                              ? "translate-x-5"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                      <label className="text-sm font-medium text-gray-700 cursor-pointer">
                        Enable Discount
                      </label>
                      {isDiscountEnabled && (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.01}
                            value={
                              isDiscountEnabled && discountPercent > 0
                                ? discountPercent
                                : ""
                            }
                            onChange={(e) => {
                              const val = isNaN(parseFloat(e.target.value))
                                ? 0
                                : Math.min(
                                    100,
                                    Math.max(0, parseFloat(e.target.value)),
                                  );
                              setDiscountPercent(val);
                              setFormData((prev) => ({
                                ...prev,
                                discountPercent: val,
                              }));
                            }}
                            disabled={isLoading}
                            className="w-24 px-2 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-600">% off</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Is Active Toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    handleInputChange("isActive", !formData.isActive)
                  }
                  disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    formData.isActive ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      formData.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                  Active Status
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full inline-flex justify-center items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-xs hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {isEditMode ? "Updating..." : "Creating..."}
                    </>
                  ) : isEditMode ? (
                    "Update Pack"
                  ) : (
                    "Create Pack"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="w-full cursor-pointer inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg:white/10 dark:text-white dark:shadow-none dark:ring-white/5 dark:hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
