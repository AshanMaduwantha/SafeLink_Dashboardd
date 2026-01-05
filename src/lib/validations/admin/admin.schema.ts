import { z } from "zod";

export const adminSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone_number: z
    .string()
    .min(10, "Phone number is required")
    .max(15, "Phone number is too long"),
  role: z
    .enum(["admin", "super_admin"], { message: "Role is required" })
    .optional(),
  status: z.enum(["active", "inactive"]),
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 6,
      "Password must be at least 6 characters long",
    ),
});

export type AdminSchema = z.infer<typeof adminSchema>;
