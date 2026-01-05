// Upload-related interfaces
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.NEXT_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.NEXT_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_AWS_SECRET_ACCESS_KEY!,
  },
});

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  url: string;
  fileName: string;
  success?: boolean; // Re-add success property
  error?: string; // Re-add error property
}

export interface UploadOptions {
  onProgress?: (event: UploadProgressEvent) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

// S3 Configuration interfaces
export interface S3Config {
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface S3PathConfig {
  imagesPath: string;
  videosPath: string;
  newsImagesPath: string;
}

export const uploadFileToS3 = (
  file: File,
  uploadUrl: string,
  options?: UploadOptions,
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        options?.onProgress?.({
          loaded: event.loaded,
          total: event.total,
          percent,
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          const result: UploadResult = { url: data.url, fileName: file.name };
          options?.onSuccess?.(result);
          resolve(result);
        } catch (_e) {
          const error = new Error("Invalid server response");
          options?.onError?.(error);
          reject(error);
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText);
          const error = new Error(parsed.error || "Failed to upload file");
          options?.onError?.(error);
          reject(error);
        } catch (_e) {
          const error = new Error("Failed to upload file");
          options?.onError?.(error);
          reject(error);
        }
      }
    };

    xhr.onerror = () => {
      const error = new Error("Network error during upload");
      options?.onError?.(error);
      reject(error);
    };

    xhr.send(formData);
  });
};

/**
 * Upload file directly to S3 using pre-signed URL
 */
export const uploadFileToS3WithPresignedUrl = (
  file: File,
  presignedUrlEndpoint: string,
  options?: UploadOptions,
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    // Step 1: Get pre-signed URL from API
    fetch(presignedUrlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to get pre-signed URL");
        }
        return response.json();
      })
      .then((data) => {
        const { presignedUrl, finalUrl } = data;

        // Step 2: Upload directly to S3 using pre-signed URL
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            options?.onProgress?.({
              loaded: event.loaded,
              total: event.total,
              percent,
            });
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result: UploadResult = { url: finalUrl, fileName: file.name };
            options?.onSuccess?.(result);
            resolve(result);
          } else {
            const error = new Error("Failed to upload file to S3");
            options?.onError?.(error);
            reject(error);
          }
        };

        xhr.onerror = () => {
          const error = new Error("Network error during upload");
          options?.onError?.(error);
          reject(error);
        };

        xhr.send(file);
      })
      .catch((error) => {
        const uploadError =
          error instanceof Error ? error : new Error("Unknown error");
        options?.onError?.(uploadError);
        reject(uploadError);
      });
  });
};

// S3 Configuration functions
/**
 * Get the S3 configuration for the dancey-main bucket
 */
export function getS3Config(): S3Config {
  return {
    bucketName: process.env.S3_DANCEY_MAIN_BUCKET_NAME || "",
    region: process.env.NEXT_AWS_REGION || "",
    accessKeyId: process.env.NEXT_AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.NEXT_AWS_SECRET_ACCESS_KEY || "",
  };
}

/**
 * Get the S3 path configuration
 */
export function getS3PathConfig(): S3PathConfig {
  return {
    imagesPath:
      process.env.S3_DANCEY_MAIN_IMAGES_PATH ||
      "web-admin/uploads/classes/images/",
    videosPath:
      process.env.S3_DANCEY_MAIN_VIDEOS_PATH ||
      "web-admin/uploads/classes/videos/",
    newsImagesPath:
      process.env.S3_NEWS_IMAGE_UPLOAD_PATH || "web-admin/uploads/news/images/",
  };
}

/**
 * Generate S3 URL for a given bucket, path, and filename
 */
export function generateS3Url(
  bucketName: string,
  region: string,
  path: string,
  fileName: string,
): string {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${path}${fileName}`;
}

/**
 * Get the bucket name for deletion operations
 */
export function getBucketForDeletion(): string {
  return process.env.S3_DANCEY_MAIN_BUCKET_NAME || "";
}

/**
 * Delete files from S3 given their URLs or keys
 */
export async function deleteFilesFromS3(
  urlsOrKeys: string[],
): Promise<{ success: boolean; deletedCount: number; failedCount: number }> {
  if (!urlsOrKeys || urlsOrKeys.length === 0) {
    return { success: true, deletedCount: 0, failedCount: 0 };
  }

  const bucketName = getBucketForDeletion();
  let deletedCount = 0;
  let failedCount = 0;

  for (const item of urlsOrKeys) {
    try {
      let key = item;
      // If it's a full URL, extract the key
      if (item.startsWith("http")) {
        try {
          const urlObj = new URL(item);
          // Remove the leading slash from pathname to get the key
          key = urlObj.pathname.substring(1);
        } catch (_e) {
          // If URL parsing fails, assume it might be a key or invalid
          console.warn(`Failed to parse URL: ${item}, treating as key`);
        }
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      await s3Client.send(deleteCommand);
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete file from S3: ${item}`, error);
      failedCount++;
    }
  }

  return {
    success: failedCount === 0,
    deletedCount,
    failedCount,
  };
}
