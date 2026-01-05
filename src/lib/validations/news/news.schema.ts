import { z } from "zod";

export const createNewsSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z.string().min(1, "Content is required"),
  image_url: z.string().optional(),
  publish_date: z.string().min(1, "Publish date is required"),
  status: z.enum(["published", "draft"]),
  category: z.string().min(1, "Category is required"),
  is_pinned: z.boolean().default(false),
});

export const updateNewsSchema = createNewsSchema.partial().extend({
  id: z.string().min(1, "News ID is required"),
});

export type CreateNewsFormData = z.infer<typeof createNewsSchema>;
export type UpdateNewsFormData = z.infer<typeof updateNewsSchema>;
