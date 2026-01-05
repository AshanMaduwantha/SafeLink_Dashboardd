"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { VideoCameraIcon } from "@heroicons/react/24/outline";
import {
  UseFormRegister,
  UseFormSetValue,
  FieldError,
  Merge,
  FieldErrorsImpl,
} from "react-hook-form";
import { ThumbnailAndOverviewFormData } from "@/lib/validations/classes/create-classes/ThumbnailAndOverview.schema";
import Alert from "@/components/dashboard/common/Alert";

interface OverviewVideoProps {
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

const MAX_OVERVIEW_VIDEO_SIZE = 500 * 1024 * 1024;
const ACCEPTED_OVERVIEW_VIDEO_TYPES = ["video/mp4"];

const OverviewVideo: React.FC<OverviewVideoProps> = ({
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

  const getOriginalFileName = (url: string): string => {
    try {
      const urlParts = url.split("/");
      const fileName = urlParts[urlParts.length - 1];
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
    if (!ACCEPTED_OVERVIEW_VIDEO_TYPES.includes(file.type)) {
      setAlertContent({
        type: "error",
        title: "Validation Failed",
        message: "Invalid file type. Only MP4 format is allowed.",
      });
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 6000);
      return false;
    }

    if (file.size > MAX_OVERVIEW_VIDEO_SIZE) {
      setAlertContent({
        type: "error",
        title: "Validation Failed",
        message: "File size exceeds 500MB limit.",
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
      console.warn("New video selected:", file.name);
      if (handleFileValidation(file)) {
        onFileSelect(file);
        setValue("overviewVideo", file, { shouldValidate: true });
      } else {
        onFileSelect(null);
        setValue("overviewVideo", null as any, { shouldValidate: true });
      }
      // Clear the input so the same file can be selected again
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
        setValue("overviewVideo", file, { shouldValidate: true });
      } else {
        onFileSelect(null);
        setValue("overviewVideo", null as any, { shouldValidate: true });
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

  // Get the video source URL - prioritize preview over uploaded
  const videoSrc = useMemo(() => {
    if (previewUrl) return previewUrl;
    if (uploadedUrl && uploadedUrl.trim()) return uploadedUrl;
    return null;
  }, [previewUrl, uploadedUrl]);

  useEffect(() => {
    register("overviewVideo");
  }, [register]);

  return (
    <div className="mt-10">
      <h3 className="text-lg font-medium text-gray-900">
        Overview Video <span className="text-red-500">*</span>
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
          <div className="relative w-full max-w-lg">
            <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
              {videoSrc ? (
                <video
                  key={videoSrc}
                  src={videoSrc}
                  controls
                  className="w-full h-56 object-cover"
                  preload="metadata"
                  onError={(e) => {
                    const videoElement = e.currentTarget;
                    const src = videoElement.src;
                    // Only log warning for uploaded URLs (not preview URLs which are temporary)
                    // Preview URL failures are usually expected during file switching
                    if (uploadedUrl && src === uploadedUrl) {
                      console.warn(
                        "Uploaded video failed to load. Please check the URL:",
                        {
                          src: src.substring(0, 100),
                          selectedFile: selectedFile?.name,
                        },
                      );
                    }
                    // Keep the element visible so user can see there's an issue
                  }}
                  onLoadStart={() => {
                    // Silently handle load start - video is attempting to load
                  }}
                />
              ) : (
                <div className="w-full h-56 bg-gray-100 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">
                    No video source available
                  </p>
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    console.warn("Change video button clicked");
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
                accept={ACCEPTED_OVERVIEW_VIDEO_TYPES.join(",")}
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
            <VideoCameraIcon
              className="mx-auto h-12 w-12 text-gray-300"
              aria-hidden="true"
            />
            <div className="mt-4 flex w-full justify-center text-sm leading-6 text-gray-500">
              <label
                htmlFor="file-upload-overview"
                className="relative rounded-md bg-white font-normal text-gray-500 pointer-events-none select-none text-center"
              >
                <span>Upload an overview video for the class</span>
                <input
                  id="file-upload-overview"
                  type="file"
                  className="sr-only"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  disabled={disabled}
                  accept={ACCEPTED_OVERVIEW_VIDEO_TYPES.join(",")}
                />
              </label>
            </div>
            <p className="text-xs leading-5 text-gray-600">
              MP4 only, up to {MAX_OVERVIEW_VIDEO_SIZE / (1024 * 1024)}MB
            </p>
            <button
              type="button"
              onClick={handleButtonClick}
              className="mt-4 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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

export default OverviewVideo;
