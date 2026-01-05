"use client";

import { useState, useEffect } from "react";

interface AddMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (membership: any) => void;
  editMembership?: Membership | null;
  isEditMode?: boolean;
}

interface Membership {
  id: string;
  name: string;
  pricePerMonth: string;
  status: "Active" | "Inactive";
  enabled: boolean;
  isPromotionEnabled?: boolean;
}

interface CreateMembershipData {
  name: string;
  pricePerMonth: string;
  enableMembership: boolean;
}

export default function AddMembershipModal({
  isOpen,
  onClose,
  onSubmit,
  editMembership,
  isEditMode = false,
}: AddMembershipModalProps) {
  const [formData, setFormData] = useState<CreateMembershipData>({
    name: "",
    pricePerMonth: "",
    enableMembership: false,
  });

  const [errors, setErrors] = useState<Partial<CreateMembershipData>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && editMembership) {
      // Extract numeric value from price string (e.g., "$9.99/month" -> "9.99")
      const numericPrice = editMembership.pricePerMonth.replace(/[^0-9.]/g, "");

      setFormData({
        name: editMembership.name,
        pricePerMonth: numericPrice,
        enableMembership: editMembership.status === "Active",
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: "",
        pricePerMonth: "",
        enableMembership: false,
      });
    }
    setErrors({});
  }, [isEditMode, editMembership]);

  const handleInputChange = (
    field: keyof CreateMembershipData,
    value: string | boolean,
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

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateMembershipData> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Membership name is required";
    }

    if (!formData.pricePerMonth.trim()) {
      newErrors.pricePerMonth = "Price is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setIsLoading(true);
      try {
        const url =
          isEditMode && editMembership
            ? `/api/memberships/${editMembership.id}`
            : "/api/memberships";

        const method = isEditMode ? "PUT" : "POST";

        const requestBody = isEditMode
          ? {
              ...formData,
              enablePromotion: formData.enableMembership,
              status: formData.enableMembership ? "Active" : "Inactive",
            }
          : {
              ...formData,
              enablePromotion: formData.enableMembership,
              status: formData.enableMembership ? "Active" : "Inactive",
            };

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to ${isEditMode ? "update" : "create"} membership`,
          );
        }

        const result = await response.json();
        onSubmit(result.membership);

        // Reset form
        setFormData({
          name: "",
          pricePerMonth: "",
          enableMembership: false,
        });
        setErrors({});
        onClose();
      } catch (error) {
        console.error(
          `Error ${isEditMode ? "updating" : "creating"} membership:`,
          error,
        );
        setErrors({
          name:
            error instanceof Error
              ? error.message
              : `Failed to ${isEditMode ? "update" : "create"} membership`,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      pricePerMonth: "",
      enableMembership: false,
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex min-h-full items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-md bg-black/30 transition-opacity" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white shadow-xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditMode ? "Edit Membership" : "Add New Membership"}
          </h3>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Membership Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Membership Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Enter name"
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          {/* Price Per Month */}
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Price Per Month
            </label>
            <input
              type="number"
              id="price"
              inputMode="numeric"
              value={formData.pricePerMonth}
              onChange={(e) =>
                handleInputChange("pricePerMonth", e.target.value)
              }
              placeholder="Enter price"
              className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.pricePerMonth ? "border-red-300" : "border-gray-300"
              }`}
            />
            {errors.pricePerMonth && (
              <p className="mt-1 text-sm text-red-600">
                {errors.pricePerMonth}
              </p>
            )}
          </div>

          {/* Enable Membership Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                handleInputChange(
                  "enableMembership",
                  !formData.enableMembership,
                )
              }
              className={`cursor-pointer relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                formData.enableMembership ? "bg-black" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  formData.enableMembership ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <label
              htmlFor="membership"
              className="text-sm font-medium text-gray-700"
            >
              Enable Membership
            </label>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className={`cursor-pointer w-full text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center ${
                isLoading
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                "Update Membership"
              ) : (
                "Create Membership"
              )}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="cursor-pointer w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md border border-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
