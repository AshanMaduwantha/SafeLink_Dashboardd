import { z } from "zod";

const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_THUMBNAIL_TYPES = ["image/jpeg", "image/jpg", "image/png"];

const MAX_OVERVIEW_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const ACCEPTED_OVERVIEW_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/avi",
  "video/mov",
];

export const ThumbnailAndOverviewSchema = z.object({
  thumbnail: z.union([
    z
      .any()
      .refine((file) => file instanceof File, "Thumbnail image is required.")
      .refine(
        (file) => file && file.size <= MAX_THUMBNAIL_SIZE,
        `Thumbnail image must be less than ${MAX_THUMBNAIL_SIZE / (1024 * 1024)}MB.`,
      )
      .refine(
        (file) => file && ACCEPTED_THUMBNAIL_TYPES.includes(file.type),
        "Only .jpg, .jpeg, and .png formats are supported for thumbnail image.",
      ),
    z.string().url("Invalid URL format for thumbnail."),
  ]),
  thumbnailUrl: z.string().url("Invalid URL format for thumbnail.").optional(),
  overviewVideo: z.union([
    z
      .any()
      .refine((file) => file instanceof File, "Overview video is required.")
      .refine(
        (file) => file && file.size <= MAX_OVERVIEW_VIDEO_SIZE,
        `Overview video must be less than ${MAX_OVERVIEW_VIDEO_SIZE / (1024 * 1024)}MB.`,
      )
      .refine(
        (file) => file && ACCEPTED_OVERVIEW_VIDEO_TYPES.includes(file.type),
        "Only .mp4, .mov, and .avi formats are supported for overview video.",
      ),
    z.string().url("Invalid URL format for overview video."),
  ]),
});

export type ThumbnailAndOverviewFormData = z.infer<
  typeof ThumbnailAndOverviewSchema
>;
