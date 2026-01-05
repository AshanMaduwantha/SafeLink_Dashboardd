"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

import {
  instructorSchema,
  InstructorSchema,
} from "@/lib/validations/instructor/instructor.schema";
import { UploadResult } from "@/lib/utils/s3-upload";
import Alert from "@/components/dashboard/common/Alert";

interface Class {
  id: string;
  name: string;
  description: string;
}

interface AddInstructorProps {
  instructorId?: string;
}

function AddInstructor({ instructorId }: AddInstructorProps) {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [classesError, setClassesError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isEditMode = !!instructorId;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<InstructorSchema>({
    resolver: zodResolver(instructorSchema),
    defaultValues: {
      autoGeneratePassword: true,
      classes: [],
    },
  });

  const autoGeneratePassword = watch("autoGeneratePassword");
  const formSelectedClasses = watch("classes");
  const profilePhoto = watch("profilePhoto");

  // Fetch Instructor Data for Edit Mode
  useEffect(() => {
    if (isEditMode && instructorId) {
      const fetchInstructor = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/instructor/${instructorId}`);
          if (!response.ok) {
            throw new Error("Failed to fetch instructor details");
          }
          const data = await response.json();
          const instructor = data.instructor;

          // Populate form
          setValue("name", instructor.name);
          setValue("email", instructor.email);
          setValue("phoneNumber", instructor.phoneNumber || "");

          if (isEditMode) {
            setValue("password", "********");
            setValue("autoGeneratePassword", false);
          }

          if (instructor.profilePhotoUrl) {
            setPreviewUrl(instructor.profilePhotoUrl);
            setValue("profilePhotoUrl", instructor.profilePhotoUrl);
          }

          if (instructor.classes && Array.isArray(instructor.classes)) {
            setSelectedClasses(instructor.classes);
          }
        } catch (err: any) {
          setError(err.message || "Error fetching instructor details");
        } finally {
          setLoading(false);
        }
      };
      fetchInstructor();
    }
  }, [isEditMode, instructorId, setValue]);

  useEffect(() => {
    setValue("classes", selectedClasses);
  }, [selectedClasses, setValue]);

  useEffect(() => {
    if (profilePhoto && typeof profilePhoto !== "string") {
      setPreviewUrl(URL.createObjectURL(profilePhoto));
    } else if (!profilePhoto && !isEditMode) {
      setPreviewUrl(null);
    }
  }, [profilePhoto, isEditMode]);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      setClassesError(null);
      try {
        const response = await fetch("/api/classes/available");

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Failed to fetch classes:", errorData);
          throw new Error(errorData.message || "Failed to fetch classes");
        }
        const responseData = await response.json();

        if (responseData.success && Array.isArray(responseData.classes)) {
          setAvailableClasses(responseData.classes);
        } else {
          throw new Error(
            responseData.message || "Invalid classes data received",
          );
        }
      } catch (err: any) {
        console.error("Error fetching classes:", err);
        setClassesError(err.message || "Error fetching classes");
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const generateRandomPassword = () => {
    const newPassword =
      Math.random().toString(36).slice(-10) +
      Math.random().toString(36).slice(-10).toUpperCase() +
      "!@#$".charAt(Math.floor(Math.random() * 4)) +
      Math.floor(Math.random() * 100);
    setGeneratedPassword(newPassword);
    setValue("password", newPassword, { shouldValidate: true });
    return newPassword;
  };

  useEffect(() => {
    if (!isEditMode && autoGeneratePassword) {
      generateRandomPassword();
    } else if (!isEditMode) {
      setGeneratedPassword("");
      setValue("password", "", { shouldValidate: true });
    }
  }, [autoGeneratePassword, isEditMode]);

  const processFile = (file: File | undefined) => {
    if (file) {
      setValue("profilePhoto", file, { shouldValidate: true });
    } else {
      setValue("profilePhoto", undefined, { shouldValidate: true });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditMode) return;
    processFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (isEditMode) return;
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (isEditMode) return;
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (isEditMode) return;
    event.preventDefault();
    setIsDragging(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setShowDropdown(true);
  };

  const handleClassSelect = (classId: string) => {
    setSelectedClasses((prevSelected) => {
      if (prevSelected.includes(classId)) {
        return prevSelected.filter((id) => id !== classId);
      } else {
        return [...prevSelected, classId];
      }
    });
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleRemoveSelectedClass = (classId: string) => {
    setSelectedClasses((prevSelected) =>
      prevSelected.filter((id) => id !== classId),
    );
  };

  const filteredClasses = Array.isArray(availableClasses)
    ? availableClasses.filter(
        (cls) =>
          cls.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !selectedClasses.includes(cls.id),
      )
    : [];

  const getSelectedClassDetails = (classId: string) => {
    return availableClasses.find((cls) => cls.id === classId);
  };

  const onSubmit: SubmitHandler<InstructorSchema> = async (data) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isEditMode && instructorId) {
        // UPDATE Logic
        const response = await fetch(`/api/instructor/${instructorId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ classes: selectedClasses }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message || "Failed to update instructor");
        }

        router.push(
          "/dashboard/instructor?success=true&message=Instructor updated successfully!",
        );
      } else {
        // CREATE Logic
        const passwordToUse = data.autoGeneratePassword
          ? generatedPassword
          : data.password;

        let profilePhotoUrl: string | undefined;
        if (profilePhoto && typeof profilePhoto !== "string") {
          const formData = new FormData();
          formData.append("file", profilePhoto);

          const uploadResponse = await fetch("/api/s3-upload/profile", {
            method: "POST",
            body: formData,
          });

          const uploadData: UploadResult = await uploadResponse.json();

          if (!uploadResponse.ok) {
            throw new Error(
              uploadData.error || "Failed to upload profile photo to S3",
            );
          }
          profilePhotoUrl = uploadData.url;
        }

        const instructorData = {
          name: data.name,
          email: data.email,
          phoneNumber: data.phoneNumber,
          password: passwordToUse,
          autoGeneratePassword: data.autoGeneratePassword,
          profilePhotoUrl: profilePhotoUrl,
          classes: data.classes,
        };

        const response = await fetch("/api/instructor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(instructorData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to create instructor");
        }

        // Navigate to instructor table with success message
        router.push(
          "/dashboard/instructor?success=true&message=Instructor created successfully!",
        );
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-white p-8 rounded-lg  w-full max-w-2xl mx-auto"
    >
      <div>
        <div className="mb-6">
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Instructor Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            {...register("name")}
            placeholder="Enter instructor name"
            disabled={isEditMode}
            className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Instructor Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            {...register("email")}
            placeholder="Enter instructor email"
            disabled={isEditMode}
            className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="phoneNumber"
            {...register("phoneNumber")}
            placeholder="Enter instructor phone number"
            disabled={isEditMode}
            className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEditMode ? "bg-gray-100 cursor-not-allowed" : ""}`}
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">
              {errors.phoneNumber.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Instructor Profile photo <span className="text-red-500">*</span>
          </label>
          <div
            className={`border-2 border-dashed rounded-md p-6 text-center transition-all duration-200 ease-in-out ${
              isEditMode
                ? "border-gray-200 bg-gray-50 cursor-not-allowed"
                : isDragging
                  ? "border-blue-500 bg-blue-50 cursor-pointer"
                  : "border-gray-300 hover:border-blue-500 cursor-pointer"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              className="hidden"
              id="profilePhoto"
              accept="image/png, image/jpeg, image/jpg"
              onChange={handleFileChange}
              disabled={isEditMode}
            />
            <label
              htmlFor="profilePhoto"
              className={`block ${isEditMode ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile Preview"
                  className="mx-auto h-24 w-24 object-cover rounded-full"
                />
              ) : (
                <ArrowUpTrayIcon
                  className={`mx-auto h-12 w-12 ${isEditMode ? "text-gray-300" : "text-gray-400"}`}
                />
              )}
              {!isEditMode && (
                <>
                  <p className="mt-2 text-sm text-gray-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, JPEG (max. 2MB)
                  </p>
                </>
              )}
            </label>
          </div>
          {errors.profilePhoto && (
            <p className="text-red-500 text-sm mt-1">
              {errors.profilePhoto.message}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Password <span className="text-red-500">*</span>
          </label>
          {!isEditMode && (
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="autoGenerate"
                {...register("autoGeneratePassword")}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="autoGenerate"
                className="ml-2 block text-sm text-gray-900"
              >
                Auto-generate password
              </label>
            </div>
          )}
          <div className="relative flex items-center mb-2">
            <input
              type="text" // Kept as text per original, might want type="password" usually but leaving as is to match style
              id="password"
              {...register("password")}
              value={
                autoGeneratePassword ? generatedPassword : watch("password")
              }
              onChange={(e) => {
                if (!autoGeneratePassword) {
                  setValue("password", e.target.value, {
                    shouldValidate: true,
                  });
                }
              }}
              disabled={autoGeneratePassword || isEditMode}
              className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 pr-12 ${isEditMode ? "cursor-not-allowed text-gray-500" : ""}`}
            />
            {autoGeneratePassword && !isEditMode && (
              <button
                type="button"
                onClick={generateRandomPassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Generate new password"
              >
                <ArrowPathIcon className="w-5 h-5" />
              </button>
            )}
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm ">{errors.password.message}</p>
          )}
        </div>

        <div className="mb-6" ref={dropdownRef}>
          <label
            htmlFor="selectClasses"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Select Classes <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              id="selectClasses"
              placeholder="Search and select classes"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => setShowDropdown(true)}
            />
            {showDropdown &&
              (searchTerm.length > 0 || availableClasses.length > 0) && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                  {loadingClasses && (
                    <p className="p-2 text-sm text-gray-500">
                      Loading classes...
                    </p>
                  )}
                  {classesError && (
                    <p className="p-2 text-sm text-red-500">{classesError}</p>
                  )}
                  {!loadingClasses &&
                    !classesError &&
                    filteredClasses.length === 0 && (
                      <p className="p-2 text-sm text-gray-500">
                        No classes found.
                      </p>
                    )}
                  {!loadingClasses &&
                    !classesError &&
                    filteredClasses.length > 0 &&
                    filteredClasses.map((cls) => (
                      <div
                        key={cls.id}
                        className="flex items-center justify-between p-2 cursor-pointer hover:bg-blue-50"
                        onClick={() => handleClassSelect(cls.id)}
                      >
                        <div>
                          <p className="font-semibold text-sm text-gray-800">
                            {cls.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {cls.description}
                          </p>
                        </div>
                        {selectedClasses.includes(cls.id) && (
                          <XMarkIcon className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                    ))}
                </div>
              )}
          </div>
          <div className="mt-2 space-y-2">
            {formSelectedClasses && formSelectedClasses.length > 0 ? (
              formSelectedClasses.map((classId) => {
                const cls = getSelectedClassDetails(classId);
                return cls ? (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between border border-blue-500 rounded-md p-4 bg-blue-50"
                  >
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {cls.name}
                      </p>
                      <p className="text-xs text-gray-600">{cls.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedClass(cls.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                ) : null;
              })
            ) : (
              <p className="text-sm text-gray-500">No classes selected.</p>
            )}
          </div>
          {errors.classes && (
            <p className="text-red-500 text-sm mt-1">
              {errors.classes.message}
            </p>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-between gap-x-4 mt-8  mx-auto">
        <button
          type="button"
          onClick={() => router.push("/dashboard/instructor")}
          className="w-1/2 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-black bg-white hover:bg-gray-50 focus:outline-none"
        >
          Back
        </button>
        <button
          type="submit"
          className="w-1/2 py-2 border-none rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          disabled={loading}
        >
          {loading
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
              ? "Update Instructor"
              : "Create Instructor"}
        </button>
      </div>
      {error && (
        <div className="mt-4 text-red-600 text-sm text-center">{error}</div>
      )}
      {successMessage && (
        <div className="fixed top-20 right-4 z-50">
          <Alert
            type="success"
            title="Success"
            message={successMessage}
            onDismiss={() => setSuccessMessage(null)}
          />
        </div>
      )}
    </form>
  );
}

export default AddInstructor;
