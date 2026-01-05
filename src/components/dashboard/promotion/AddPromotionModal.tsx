"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  promotionSchema,
  PromotionSchema,
} from "@/lib/validations/promotion/promotion.schema";
import { Promotion } from "@/types/promotion";

interface AddPromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionToEdit: Promotion | null;
}

const AddPromotionModal: React.FC<AddPromotionModalProps> = ({
  isOpen,
  onClose,
  promotionToEdit,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PromotionSchema>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      promotionName: "",
      discount: "",
      startDate: "",
      endDate: "",
      enablePromotion: false,
    },
  });

  useEffect(() => {
    if (promotionToEdit) {
      setValue("promotionName", promotionToEdit.promotion_name);
      setValue("discount", promotionToEdit.discount.toString());
      setValue("startDate", promotionToEdit.start_date.split("T")[0]);
      setValue("endDate", promotionToEdit.end_date.split("T")[0]);
      setValue("enablePromotion", promotionToEdit.is_enabled);
    } else {
      reset();
    }
  }, [promotionToEdit, reset, setValue]);

  const enablePromotionValue = watch("enablePromotion");
  const startDateValue = watch("startDate");

  if (!isOpen) return null;

  const onSubmit = async (data: PromotionSchema) => {
    setIsLoading(true);
    try {
      const method = promotionToEdit ? "PUT" : "POST";
      const url = promotionToEdit
        ? `/api/promotion/${promotionToEdit.id}`
        : "/api/promotion";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promotion_name: data.promotionName,
          discount: parseFloat(data.discount),
          start_date: data.startDate,
          end_date: data.endDate,
          status: data.enablePromotion ? "Active" : "Inactive",
          is_enabled: data.enablePromotion,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      // Promotion saved successfully
      reset();
      onClose();
    } catch (error) {
      console.error("Error saving promotion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {promotionToEdit ? "Edit Promotion" : "Add New Promotion"}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label
              htmlFor="promotionName"
              className="block text-sm font-medium text-gray-700"
            >
              Promotion Name
            </label>
            <input
              type="text"
              id="promotionName"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter name"
              {...register("promotionName")}
            />
            {errors.promotionName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.promotionName.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="discount"
              className="block text-sm font-medium text-gray-700"
            >
              Discount%
            </label>
            <input
              type="number"
              id="discount"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter discount"
              min="0"
              {...register("discount")}
            />
            {errors.discount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.discount.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700"
            >
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              min={new Date().toISOString().split("T")[0]}
              {...register("startDate")}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.startDate.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700"
            >
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              min={startDateValue || new Date().toISOString().split("T")[0]}
              {...register("endDate")}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.endDate.message}
              </p>
            )}
          </div>
          <div className="flex items-center mb-6">
            <label
              htmlFor="enablePromotion"
              className="flex items-center cursor-pointer"
            >
              <div className="relative mr-3">
                <input
                  type="checkbox"
                  id="enablePromotion"
                  className="sr-only"
                  {...register("enablePromotion")}
                />
                <div
                  className={`block w-10 h-6 rounded-full transition ${enablePromotionValue ? "bg-black" : "bg-gray-300"}`}
                ></div>
                <div
                  className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${enablePromotionValue ? "translate-x-full" : ""}`}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-700">
                Enable Promotion
              </span>
            </label>
            {errors.enablePromotion && (
              <p className="mt-1 text-sm text-red-600">
                {errors.enablePromotion.message}
              </p>
            )}
          </div>
          <div className="flex flex-col space-y-3">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 flex items-center justify-center"
              disabled={isLoading}
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
                  {promotionToEdit ? "Updating..." : "Creating..."}
                </>
              ) : promotionToEdit ? (
                "Update Promotion"
              ) : (
                "Create Promotion"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPromotionModal;
