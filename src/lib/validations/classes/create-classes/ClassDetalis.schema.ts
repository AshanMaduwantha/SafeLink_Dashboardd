import { z } from "zod";

export const classDetailsSchema = z.object({
  className: z
    .string()
    .min(1, "Class Name is required")
    .regex(/^[a-zA-Z0-9 ]+$/, "Class Name cannot contain special characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters long")
    .max(2000, "Description must not exceed 2000 characters"),
  instructorName: z
    .string()
    .min(1, "Instructor Name is required")
    .regex(
      /^[a-zA-Z\s]+$/,
      "Instructor Name can only contain letters and spaces",
    ),
  // category: z
  //   .string()
  //   .min(1, "Category is required")
  //   .refine(
  //     (value) => value !== "Select category",
  //     "Please select a valid category",
  //   ),
});

export type ClassDetailsFormValues = z.infer<typeof classDetailsSchema>;
