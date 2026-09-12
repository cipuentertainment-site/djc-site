import { z } from "zod";

import { MERCHANDISE_SIZE_OPTIONS } from "@/types/merchandise-media";

const merchandiseSizeSchema = z.enum(
  MERCHANDISE_SIZE_OPTIONS.map((option) => option.value) as [string, ...string[]],
);

export const merchandiseRequestSchema = z.object({
  productId: z.string().uuid(),
  selectedColour: z.string().trim().max(40).optional().or(z.literal("")),
  selectedSize: merchandiseSizeSchema.optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(1, "Select at least one item.").max(50),
  customerName: z.string().trim().min(2, "Enter your name."),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(?:\+254|254|0)?[17]\d{8}$/, "Enter a valid Kenyan phone number."),
});

export type MerchandiseRequestInput = z.infer<typeof merchandiseRequestSchema>;
