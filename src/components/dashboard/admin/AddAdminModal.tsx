"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminSchema, AdminSchema } from "@/lib/validations/admin/admin.schema";

import { Admin } from "@/types/admin";

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminToEdit: Admin | null;
}

const AddAdminModal: React.FC<AddAdminModalProps> = ({
  isOpen,
  onClose,
  adminToEdit,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AdminSchema>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      name: "",
      email: "",
      phone_number: "",
      role: undefined,
      status:
        adminToEdit &&
        (adminToEdit.status === "active" || adminToEdit.status === "inactive")
          ? adminToEdit.status
          : "inactive",
      password: "",
    },
  });

  const adminStatusValue = watch("status");

  useEffect(() => {
    if (adminToEdit) {
      setValue("name", adminToEdit.name);
      setValue("email", adminToEdit.email);
      setValue("phone_number", adminToEdit.phone_number);
      setValue("role", adminToEdit.role);
      setValue("status", adminToEdit.status);
      setValue("password", "");
    } else {
      reset({
        name: "",
        email: "",
        phone_number: "",
        role: undefined,
        status: "inactive",
        password: "",
      });
    }
  }, [adminToEdit, reset, setValue]);

  if (!isOpen) return null;

  const onSubmit = async (data: AdminSchema) => {
    setIsLoading(true);
    try {
      const method = adminToEdit ? "PUT" : "POST";
      const url = adminToEdit ? `/api/admin/${adminToEdit.id}` : "/api/admin";

      const bodyData: Partial<AdminSchema> = {
        name: data.name,
        email: data.email,
        phone_number: data.phone_number,
        role: data.role,
        status: data.status,
      };

      if (data.password) {
        bodyData.password = data.password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();

      reset();
      onClose();
    } catch (error) {
      console.error("Error saving admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {adminToEdit ? "Edit Administrator" : "Add New Administrator"}
        </h3>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter name"
              {...register("name")}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter email"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="phone_number"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="phone_number"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter phone number"
              {...register("phone_number")}
            />
            {errors.phone_number && (
              <p className="mt-1 text-sm text-red-600">
                {errors.phone_number.message}
              </p>
            )}
          </div>
          <div className="mb-4">
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              {...register("role")}
            >
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
          </div>
          {!adminToEdit && (
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter password"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center mb-6">
            <label
              htmlFor="status"
              className="flex items-center cursor-pointer"
            >
              <div className="relative mr-3">
                <input
                  type="checkbox"
                  id="status"
                  className="sr-only"
                  checked={adminStatusValue === "active"}
                  onChange={(e) =>
                    setValue("status", e.target.checked ? "active" : "inactive")
                  }
                />
                <div
                  className={`block w-10 h-6 rounded-full transition ${adminStatusValue === "active" ? "bg-black" : "bg-gray-300"}`}
                ></div>
                <div
                  className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${adminStatusValue === "active" ? "translate-x-full" : ""}`}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-700">
                Admin Status: {adminStatusValue}
              </span>
            </label>
            {errors.status && (
              <p className="mt-1 text-sm text-red-600">
                {errors.status.message}
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
                  {adminToEdit ? "Updating..." : "Creating..."}
                </>
              ) : adminToEdit ? (
                "Update Administrator"
              ) : (
                "Add Administrator"
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

export default AddAdminModal;
