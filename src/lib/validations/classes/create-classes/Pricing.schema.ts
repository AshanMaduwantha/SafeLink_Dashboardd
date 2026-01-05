import { z } from "zod";

export const PricingSchema = z.object({
  classPrice: z
    .union([z.number(), z.undefined()])
    .refine((val) => val !== undefined && val !== null && val > 0, {
      message: "Class price is required and must be a positive number.",
    }),
  promotionId: z
    .union([
      z.string().uuid("Invalid promotion ID format"),
      z.literal(""),
      z.null(),
      z.undefined(),
    ])
    .optional(),
  membershipIds: z
    .array(z.string().uuid("Invalid membership ID format"))
    .min(1, "At least one membership tier must be selected."),
  classPackIds: z
    .array(z.string().uuid("Invalid class pack ID format"))
    .optional(),
});

export type PricingFormData = z.infer<typeof PricingSchema>;
