import { z } from "zod";

export const promotionSchema = z.object({
  promotionName: z.string().min(1, "Promotion Name is required"),
  discount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?%?$/, "Invalid discount format")
    .min(1, "Discount is required"),
  startDate: z
    .string()
    .min(1, "Start Date is required")
    .refine(
      (date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
      "Start Date cannot be in the past",
    ),
  endDate: z
    .string()
    .min(1, "End Date is required")
    .refine(
      (date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)),
      "End Date cannot be in the past",
    ),
  enablePromotion: z.boolean(),
});

export type PromotionSchema = z.infer<typeof promotionSchema>;
