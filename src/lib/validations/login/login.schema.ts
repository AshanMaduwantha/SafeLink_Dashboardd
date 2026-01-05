import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is Required" })
    .email({ message: "Invalid Email" }),
  password: z
    .string()
    .min(1, { message: "Password is Required" })
    .min(6, { message: "Password must be at least 6 characters" }),
});

export type LoginSchema = z.infer<typeof loginSchema>;
