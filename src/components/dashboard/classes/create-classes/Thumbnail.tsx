"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import {
  UseFormRegister,
  UseFormSetValue,
  FieldError,
  Merge,
  FieldErrorsImpl,
} from "react-hook-form";
import { ThumbnailAndOverviewFormData } from "@/lib/validations/classes/create-classes/ThumbnailAndOverview.schema";
import Alert from "@/components/dashboard/common/Alert";

interface ThumbnailProps {
  register: UseFormRegister<ThumbnailAndOverviewFormData>;
  setValue: UseFormSetValue<ThumbnailAndOverviewFormData>;
  error: FieldError | Merge<FieldError, FieldErrorsImpl> | undefined;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  uploadedUrl?: string | null;
  disabled?: boolean;
  onRemove?: () => void;
  validationError?: string | null;
}

const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const Thumbnail: React.FC<ThumbnailProps> = ({
  register,
  setValue,
  error,
  onFileSelect,
  selectedFile,
  uploadedUrl,
  disabled = false,

  validationError,
}) => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertContent, setAlertContent] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorMessage =
    typeof error?.message === "string" ? error.message : undefined;

  // Extract original filename from S3 URL
  const getOriginalFileName = (url: string): string => {
    try {
      const urlParts = url.split("/");
      const fileName = urlParts[urlParts.length - 1];
      // Remove timestamp prefix
      const parts = fileName.split("-");
      if (parts.length > 1) {
        return parts.slice(1).join("-");
      }
      return fileName;
    } catch {
      return "Uploaded File";
    }
  };

  const handleFileValidation = useCallback((file: File): boolean => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setAlertContent({
        type: "error",
        title: "Validation Failed",
        message: "Invalid file type. Only JPG, JPEG, PNG are allowed.",
      });
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 6000);
      return false;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setAlertContent({
        type: "error",
        title: "Validation Failed",
        message: "File size exceeds 10MB limit.",
      });
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 6000);
      return false;
    }
    return true;
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      console.warn("New file selected:", file.name);
      if (handleFileValidation(file)) {
        onFileSelect(file);
        setValue("thumbnail", file, { shouldValidate: true });
      } else {
        onFileSelect(null);
        setValue("thumbnail", null as any, { shouldValidate: true });
      }
      event.target.value = "";
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (handleFileValidation(file)) {
        onFileSelect(file);
        setValue("thumbnail", file, { shouldValidate: true });
      } else {
        onFileSelect(null);
        setValue("thumbnail", null as any, { shouldValidate: true });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
      event.dataTransfer.clearData();
    }
  };

  // Create object URL for selected file preview
  const previewUrl = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }
    return null;
  }, [selectedFile]);

  // Cleanup object URL when component unmounts or file changes
  useEffect(() => {
    const currentPreviewUrl = previewUrl;
    return () => {
      if (currentPreviewUrl) {
        URL.revokeObjectURL(currentPreviewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    register("thumbnail");
    register("thumbnailUrl");
  }, [register]);

  return (
    <div className="mt-10">
      <h3 className="text-lg font-medium text-gray-900">
        Class Thumbnail <span className="text-red-500">*</span>
      </h3>
      {showAlert && alertContent && (
        <div className="mt-4">
          <Alert
            type={alertContent.type}
            title={alertContent.title}
            message={alertContent.message}
            onDismiss={() => setShowAlert(false)}
          />
        </div>
      )}
      <div
        className={`mt-4 flex justify-center rounded-lg border border-dashed px-6 py-10 transition-colors duration-200 ease-in-out ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-900/25"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFile || uploadedUrl ? (
          <div className="relative w-full max-w-md">
            <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
              <img
                src={previewUrl || uploadedUrl || ""}
                alt="Thumbnail preview"
                className="w-full h-auto object-cover"
                onError={(e) => {
                  console.error("Image failed to load:", e);
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    console.warn("Change button clicked");
                    fileInputRef.current?.click();
                  }}
                  disabled={disabled}
                  className="bg-white text-gray-700 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Change
                </button>
              </div>
              {/* Hidden file input for change functionality */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
                disabled={disabled}
              />
            </div>
            <div className="mt-2 text-center">
              <p className="text-sm text-gray-600">
                {selectedFile?.name ||
                  (uploadedUrl
                    ? getOriginalFileName(uploadedUrl)
                    : "Uploaded File")}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <PhotoIcon
              className="mx-auto h-12 w-12 text-gray-300"
              aria-hidden="true"
            />
            <div className="mt-4 flex w-full justify-center text-sm leading-6 text-gray-500">
              <label
                htmlFor="file-upload-thumbnail"
                className="relative rounded-md bg-white font-normal text-gray-500 pointer-events-none select-none text-center"
              >
                <span>Upload a thumbnail image for the Class</span>
                <input
                  id="file-upload-thumbnail"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  disabled={disabled}
                  accept={ACCEPTED_IMAGE_TYPES.join(",")}
                />
              </label>
            </div>
            <p className="text-xs leading-5 text-gray-600">
              PNG, JPG up to {MAX_THUMBNAIL_SIZE / (1024 * 1024)}MB
            </p>
            <button
              type="button"
              onClick={handleButtonClick}
              className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2"
              disabled={disabled}
            >
              Choose File
            </button>
          </div>
        )}
      </div>
      {(errorMessage || validationError) && (
        <p className="mt-2 text-sm text-red-600">
          {validationError || errorMessage}
        </p>
      )}
    </div>
  );
};

export default Thumbnail;
