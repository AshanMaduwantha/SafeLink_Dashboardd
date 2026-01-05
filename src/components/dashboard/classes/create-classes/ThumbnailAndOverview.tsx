import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
} from "react";
import Thumbnail from "./Thumbnail";
import OverviewVideo from "./OverviewVideo";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import {
  ThumbnailAndOverviewSchema,
  ThumbnailAndOverviewFormData,
} from "@/lib/validations/classes/create-classes/ThumbnailAndOverview.schema";
import {
  uploadFileToS3,
  uploadFileToS3WithPresignedUrl,
  UploadProgressEvent,
} from "@/lib/utils/s3-upload";
import UploadProgressModal from "@/components/dashboard/common/UploadProgressModal";
import Alert from "@/components/dashboard/common/Alert";

export interface ThumbnailAndOverviewFormRef {
  triggerValidation: () => Promise<boolean>;
  getValues: () => ThumbnailAndOverviewFormData;
  uploadFiles: () => Promise<boolean>;
}

interface ThumbnailAndOverviewProps {
  onLoadingChange?: (loading: boolean) => void;
}

const ThumbnailAndOverview = forwardRef<
  ThumbnailAndOverviewFormRef,
  ThumbnailAndOverviewProps
>(({ onLoadingChange }, ref) => {
  const searchParams = useSearchParams();
  const [classId, setClassId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ThumbnailAndOverviewFormData>({
    resolver: zodResolver(ThumbnailAndOverviewSchema),
    mode: "onBlur",
  });

  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [overviewVideoFile, setOverviewVideoFile] = useState<File | null>(null);
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState<
    string | null
  >(null);
  const [uploadedOverviewVideoUrl, setUploadedOverviewVideoUrl] = useState<
    string | null
  >(null);
  const [previousThumbnailUrl, setPreviousThumbnailUrl] = useState<
    string | null
  >(null);
  const [previousVideoUrl, setPreviousVideoUrl] = useState<string | null>(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertContent, setAlertContent] = useState<{
    type: "success" | "error";
    title: string;
    message: string;
  } | null>(null);
  const [thumbnailValidationError, setThumbnailValidationError] = useState<
    string | null
  >(null);
  const [videoValidationError, setVideoValidationError] = useState<
    string | null
  >(null);

  // Load existing media data when classId is available
  useEffect(() => {
    const urlClassId = searchParams.get("classId");
    if (urlClassId && urlClassId !== classId) {
      setClassId(urlClassId);
      loadExistingMedia(urlClassId);
    }
  }, [searchParams, classId]);

  const loadExistingMedia = async (id: string) => {
    try {
      onLoadingChange?.(true);
      const response = await fetch(`/api/classes/${id}/media`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.class) {
          const { image, overviewVideo } = data.class;
          if (image) {
            setUploadedThumbnailUrl(image);

            setValue("thumbnail", image, { shouldValidate: true });
            setValue("thumbnailUrl", image, { shouldValidate: true });
          }
          if (overviewVideo) {
            setUploadedOverviewVideoUrl(overviewVideo);
            setPreviousVideoUrl(overviewVideo);
            setValue("overviewVideo", overviewVideo, {
              shouldValidate: true,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error loading existing media:", error);
    } finally {
      onLoadingChange?.(false);
    }
  };

  const saveMediaToDatabase = async (
    thumbnailUrl: string | null,
    videoUrl: string | null,
  ) => {
    if (!classId) return false;

    try {
      const previousImageUrlForDeletion = thumbnailFile
        ? uploadedThumbnailUrl
        : previousThumbnailUrl;
      const previousVideoUrlForDeletion = overviewVideoFile
        ? uploadedOverviewVideoUrl
        : previousVideoUrl;

      const response = await fetch(`/api/classes/${classId}/media`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: thumbnailUrl,
          overviewVideoUrl: videoUrl,
          previousImageUrl: previousImageUrlForDeletion,
          previousVideoUrl: previousVideoUrlForDeletion,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (thumbnailUrl) {
            setPreviousThumbnailUrl(thumbnailUrl);
          }
          if (videoUrl) {
            setPreviousVideoUrl(videoUrl);
          }

          // Clear the file selection states after successful upload
          setThumbnailFile(null);
          setOverviewVideoFile(null);

          // Delete old files from S3 if there are any
          if (data.urlsToDelete && data.urlsToDelete.length > 0) {
            try {
              await fetch("/api/s3-upload/delete", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  urls: data.urlsToDelete,
                }),
              });
            } catch (deleteError) {
              console.error("Error deleting old files from S3:", deleteError);
            }
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error saving media to database:", error);
      return false;
    }
  };

  const handleThumbnailFileSelect = useCallback(
    (file: File | null) => {
      if (file && uploadedThumbnailUrl) {
        setPreviousThumbnailUrl(uploadedThumbnailUrl);
      }
      setThumbnailFile(file);
      setValue("thumbnail", file as any, { shouldValidate: true });
      setThumbnailValidationError(null);
    },
    [setValue, uploadedThumbnailUrl],
  );

  const handleOverviewVideoFileSelect = useCallback(
    (file: File | null) => {
      if (file && uploadedOverviewVideoUrl) {
        setPreviousVideoUrl(uploadedOverviewVideoUrl);
      }
      setOverviewVideoFile(file);
      setValue("overviewVideo", file as any, { shouldValidate: true });
      setVideoValidationError(null);
    },
    [setValue, uploadedOverviewVideoUrl],
  );

  const handleThumbnailRemove = useCallback(() => {
    setThumbnailFile(null);
    setUploadedThumbnailUrl(null);
    setValue("thumbnail", null as any, { shouldValidate: true });
    setValue("thumbnailUrl", "", { shouldValidate: true });
    setThumbnailValidationError(null);
  }, [setValue]);

  const handleOverviewVideoRemove = useCallback(() => {
    setOverviewVideoFile(null);
    setUploadedOverviewVideoUrl(null);
    setValue("overviewVideo", null as any, { shouldValidate: true });
    setVideoValidationError(null);
  }, [setValue]);

  const uploadFiles = useCallback(async () => {
    console.warn("uploadFiles called");

    const hasThumbnail = thumbnailFile || uploadedThumbnailUrl;
    const hasOverviewVideo = overviewVideoFile || uploadedOverviewVideoUrl;

    console.warn("Media check:", {
      hasThumbnail,
      hasOverviewVideo,
      thumbnailFile,
      uploadedThumbnailUrl,
      overviewVideoFile,
      uploadedOverviewVideoUrl,
    });

    if (!hasThumbnail) {
      console.warn("No thumbnail found");
      setAlertContent({
        type: "error",
        title: "Upload Error",
        message: "Thumbnail image is required.",
      });
      setShowAlert(true);
      return false;
    }

    if (!hasOverviewVideo) {
      console.warn("No overview video found");
      setAlertContent({
        type: "error",
        title: "Upload Error",
        message: "Overview video is required.",
      });
      setShowAlert(true);
      return false;
    }

    // If we have files to upload, validate them first
    if (thumbnailFile || overviewVideoFile) {
      console.warn("Validating files...");
      const isValid = await trigger();
      console.warn("Form validation result:", isValid);

      if (!isValid) {
        console.warn("Form validation failed");
        const formErrors = errors;
        console.warn("Form errors:", formErrors);
        setAlertContent({
          type: "error",
          title: "Validation Error",
          message: "Please correct the form errors before uploading.",
        });
        setShowAlert(true);
        return false;
      }
    }

    // Check if we have new files to upload
    const hasNewFiles = thumbnailFile || overviewVideoFile;

    if (hasNewFiles) {
      setShowUploadModal(true);
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      setUploadMessage("Starting upload...");
    }
    setShowAlert(false);

    let thumbnailUploadSuccess = false;
    let videoUploadSuccess = false;
    let _finalThumbnailUrl: string | null = uploadedThumbnailUrl;
    let _finalOverviewVideoUrl: string | null = uploadedOverviewVideoUrl;

    try {
      // Upload Thumbnail
      if (thumbnailFile) {
        setUploadMessage(`Uploading thumbnail: ${thumbnailFile.name}`);
        const thumbnailResult = await uploadFileToS3(
          thumbnailFile,
          "/api/s3-upload/thumbnail",
          {
            onProgress: (event: UploadProgressEvent) =>
              setUploadProgress(event.percent),
          },
        );
        _finalThumbnailUrl = thumbnailResult.url;
        setValue("thumbnailUrl", thumbnailResult.url, {
          shouldValidate: true,
        });
        thumbnailUploadSuccess = true;
      } else {
        thumbnailUploadSuccess = true;
      }

      if (overviewVideoFile) {
        setUploadMessage(`Uploading video: ${overviewVideoFile.name}`);
        setUploadProgress(0);
        // Use pre-signed URL for video uploads
        const videoResult = await uploadFileToS3WithPresignedUrl(
          overviewVideoFile,
          "/api/s3-upload/video/presigned-url",
          {
            onProgress: (event: UploadProgressEvent) =>
              setUploadProgress(event.percent),
          },
        );
        _finalOverviewVideoUrl = videoResult.url;
        setValue("overviewVideo", videoResult.url, { shouldValidate: true });
        videoUploadSuccess = true;
      } else {
        videoUploadSuccess = true;
      }

      if (thumbnailUploadSuccess && videoUploadSuccess) {
        const saveSuccess = await saveMediaToDatabase(
          _finalThumbnailUrl,
          _finalOverviewVideoUrl,
        );

        if (saveSuccess) {
          setAlertContent({
            type: "success",
            title: hasNewFiles ? "Upload Complete" : "Media Saved",
            message: hasNewFiles
              ? "All files uploaded and saved successfully!"
              : "Media information saved successfully!",
          });
          setShowAlert(true);
          return true;
        } else {
          setAlertContent({
            type: "error",
            title: "Save Failed",
            message: hasNewFiles
              ? "Files uploaded but failed to save to database."
              : "Failed to save media information to database.",
          });
          setShowAlert(true);
          return false;
        }
      } else {
        throw new Error("One or more files failed to upload.");
      }
    } catch (err: any) {
      console.error("Combined upload error:", err);
      setUploadError(err.message || "An unknown error occurred during upload.");
      setAlertContent({
        type: "error",
        title: "Upload Failed",
        message: err.message || "Failed to upload one or more files.",
      });
      setShowAlert(true);
      return false;
    } finally {
      if (hasNewFiles) {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [
    thumbnailFile,
    overviewVideoFile,
    uploadedThumbnailUrl,
    uploadedOverviewVideoUrl,
    previousThumbnailUrl,
    previousVideoUrl,
    setValue,
    trigger,
    saveMediaToDatabase,
  ]);

  useImperativeHandle(ref, () => ({
    triggerValidation: async () => {
      console.warn("Triggering validation...");
      const formValues = getValues();
      console.warn("Current form values:", formValues);
      console.warn("Thumbnail file:", thumbnailFile);
      console.warn("Uploaded thumbnail URL:", uploadedThumbnailUrl);
      console.warn("Overview video file:", overviewVideoFile);
      console.warn("Uploaded video URL:", uploadedOverviewVideoUrl);

      // Clear previous validation errors
      setThumbnailValidationError(null);
      setVideoValidationError(null);

      // Check if we have the required media (either files or URLs)
      const hasThumbnail = thumbnailFile || uploadedThumbnailUrl;
      const hasOverviewVideo = overviewVideoFile || uploadedOverviewVideoUrl;

      let hasErrors = false;

      if (!hasThumbnail) {
        console.warn("Missing thumbnail");
        setThumbnailValidationError("Thumbnail image is required");
        hasErrors = true;
      }

      if (!hasOverviewVideo) {
        console.warn("Missing overview video");
        setVideoValidationError("Overview video is required");
        hasErrors = true;
      }

      if (hasErrors) {
        return false;
      }

      // If we have files, validate them
      if (thumbnailFile || overviewVideoFile) {
        const isValid = await trigger();
        console.warn("Validation result:", isValid);
        return isValid;
      }

      // If we only have URLs, that's fine
      console.warn("Only URLs present, validation passed");
      return true;
    },
    getValues: () => getValues(),
    uploadFiles: uploadFiles, // Expose the upload function
  }));

  const onSubmit: SubmitHandler<ThumbnailAndOverviewFormData> = (data) => {
    console.warn("Thumbnail & Overview Form Data:", data);
    // This onSubmit will not be directly called by ActionButtons
    // Validation will be triggered by triggerValidation from parent
    // Upload will be triggered by uploadFiles from parent
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    setUploadError(null); // Clear error when modal closes
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full px-2 sm:px-4 lg:px-8 py-4 sm:py-8"
    >
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
          Thumbnail & Overview Video
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Upload class thumbnail image and class overview video
        </p>
      </div>
      {showAlert && alertContent && (
        <div className="mb-4">
          <Alert
            type={alertContent.type}
            title={alertContent.title}
            message={alertContent.message}
            onDismiss={() => setShowAlert(false)}
          />
        </div>
      )}
      <Thumbnail
        register={register}
        setValue={setValue}
        error={errors.thumbnail}
        onFileSelect={handleThumbnailFileSelect}
        selectedFile={thumbnailFile}
        uploadedUrl={uploadedThumbnailUrl}
        disabled={isUploading}
        onRemove={handleThumbnailRemove}
        validationError={thumbnailValidationError}
      />
      <OverviewVideo
        register={register}
        setValue={setValue}
        error={errors.overviewVideo}
        onFileSelect={handleOverviewVideoFileSelect}
        selectedFile={overviewVideoFile}
        uploadedUrl={uploadedOverviewVideoUrl}
        disabled={isUploading}
        onRemove={handleOverviewVideoRemove}
        validationError={videoValidationError}
      />

      <UploadProgressModal
        isOpen={showUploadModal}
        onClose={handleCloseUploadModal}
        progress={uploadProgress}
        isUploading={isUploading}
        uploadMessage={uploadMessage}
        error={uploadError}
        fileNames={[
          thumbnailFile?.name || "",
          overviewVideoFile?.name || "",
        ].filter(Boolean)}
      />
    </form>
  );
});

ThumbnailAndOverview.displayName = "ThumbnailAndOverview";

export default ThumbnailAndOverview;
