import { z } from "zod";

export const instructorSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Instructor Name is required" })
      .regex(/^[a-zA-Z\s]+$/, {
        message: "Instructor Name can only contain letters and spaces",
      }),
    email: z
      .string()
      .email({ message: "Instructor Email must be a valid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters long" })
      .optional()
      .or(z.literal("")),
    profilePhotoUrl: z
      .string()
      .url({ message: "Profile Photo URL must be a valid URL" })
      .optional(),
    profilePhoto: z
      .instanceof(File)
      .refine((file) => file.size <= 2 * 1024 * 1024, {
        message: "Profile photo file size must be less than 2MB",
      })
      .refine(
        (file) => ["image/jpeg", "image/png", "image/jpg"].includes(file.type),
        {
          message: "Profile photo must be a PNG, JPG, or JPEG file",
        },
      )
      .optional(),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, {
        message:
          "Phone Number must be a valid international format (e.g., +1234567890)",
      })
      .optional(),
    autoGeneratePassword: z.boolean().optional(),
    classes: z
      .array(z.string())
      .min(1, { message: "Please select at least one class" }),
  })
  .superRefine((data, ctx) => {
    if (
      !data.autoGeneratePassword &&
      (!data.password || data.password.length < 8)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Password is required and must be at least 8 characters long, or enable auto-generate",
        path: ["password"],
      });
    }

    if (!data.profilePhoto && !data.profilePhotoUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Profile photo is required. Please upload a photo.",
        path: ["profilePhoto"],
      });
    }
  });

export type InstructorSchema = z.infer<typeof instructorSchema>;
