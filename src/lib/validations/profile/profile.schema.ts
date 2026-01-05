import { z } from "zod";

export const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be at most 50 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be at most 50 characters"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be at most 15 digits")
    .regex(/^\+?[0-9]{10,15}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
});

export type ProfileSchema = z.infer<typeof profileSchema>;
