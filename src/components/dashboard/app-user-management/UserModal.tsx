"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { CreateUserData, User } from "@/types/user";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserData | User) => void;
  user?: User | null;
  isEdit?: boolean;
}

export default function UserModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  isEdit = false,
}: UserModalProps) {
  const [formData, setFormData] = useState<CreateUserData>({
    name: "",
    email: "",
    phone: "",
    title: "",
  });
  const [errors, setErrors] = useState<Partial<CreateUserData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && isEdit) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        title: user.title,
      });
    } else {
      setFormData({ name: "", email: "", phone: "", title: "" });
    }
    setErrors({});
  }, [user, isEdit, isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof CreateUserData])
      setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateUserData> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      newErrors.email = "Invalid email";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.title.trim()) newErrors.title = "Title is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setIsSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSubmit(isEdit && user ? { ...user, ...formData } : formData);
      handleClose();
    } catch (err) {
      console.error("Error saving user:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: "", email: "", phone: "", title: "" });
    setErrors({});
    onClose();
  };

  const fields = [
    { name: "name", label: "Full Name", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "tel" },
    {
      name: "title",
      label: "Title",
      type: "select",
      options: ["Student", "Instructor", "Admin", "Manager"],
    },
  ];

  const renderField = (field: any) => {
    const hasError = errors[field.name as keyof CreateUserData];
    const inputClass = `mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm ${hasError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"}`;
    return (
      <div key={field.name}>
        <label
          htmlFor={field.name}
          className="block text-sm font-medium text-gray-700"
        >
          {field.label}
        </label>
        {field.type === "select" ? (
          <select
            name={field.name}
            id={field.name}
            value={formData[field.name as keyof CreateUserData]}
            onChange={handleInputChange}
            className={inputClass}
          >
            <option value="">Select a title</option>
            {field.options.map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type}
            name={field.name}
            id={field.name}
            value={formData[field.name as keyof CreateUserData]}
            onChange={handleInputChange}
            className={inputClass}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        )}
        {hasError && <p className="mt-1 text-sm text-red-600">{hasError}</p>}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 backdrop-blur-md bg-black/30 transition-opacity" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 text-center sm:items-center sm:p-4">
          <DialogPanel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 w-full max-w-md sm:max-w-sm sm:p-6">
            <div className="w-full">
              <div className="mt-3 text-center sm:text-left w-full">
                <DialogTitle
                  as="h3"
                  className="text-lg font-semibold leading-6 text-gray-900 mb-6"
                >
                  {isEdit ? "Edit User" : "Add New User"}
                </DialogTitle>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {fields.map(renderField)}
                  <div className="mt-6 space-y-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="cursor-pointer w-full inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {isEdit ? "Updating..." : "Adding..."}
                        </>
                      ) : isEdit ? (
                        "Update User"
                      ) : (
                        "Add New User"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="cursor-pointer w-full inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
