import { z } from "zod";

import { KENYAN_COUNTIES } from "@/lib/counties";

const sizeRangeSchema = z.object({
  label: z.enum(["small", "medium", "large"]),
  minAttendees: z.coerce.number().int().min(0),
  maxAttendees: z.coerce.number().int().min(1),
});

function validateSizeRanges(
  sizes: Array<{ minAttendees: number; maxAttendees: number }>,
) {
  return sizes.every((size, index) => {
    if (size.maxAttendees <= size.minAttendees) {
      return false;
    }

    const previous = sizes[index - 1];

    if (!previous) {
      return true;
    }

    return size.minAttendees > previous.maxAttendees;
  });
}

export const eventTypeFormSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Enter an event type name."),
    description: z.string().trim().optional(),
    isActive: z.boolean(),
    serviceIds: z.array(z.string().uuid()),
    sizes: z
      .array(sizeRangeSchema)
      .length(3)
      .refine(validateSizeRanges, "Size ranges must be ordered and cannot overlap."),
  })
  .refine(
    (value) => value.sizes.map((size) => size.label).join(",") === "small,medium,large",
    "Configure Small, Medium, and Large in order.",
  );

export const serviceFormSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Enter a service name."),
  description: z.string().trim().optional(),
  isActive: z.boolean(),
});

export const pricingFormSchema = z.object({
  eventTypeId: z.string().uuid(),
  prices: z.array(
    z.object({
      eventTypeSizeId: z.string().uuid(),
      serviceId: z.string().uuid(),
      priceAmount: z.coerce.number().int().min(0).nullable(),
      isActive: z.boolean(),
    }),
  ),
});

export const bookingStatusFormSchema = z.object({
  bookingId: z.string().uuid(),
  nextStatus: z.enum(["confirmed", "completed", "rejected"]),
});

export const settingsFormSchema = z.object({
  businessName: z.string().trim().min(2),
  businessPhone: z.string().trim().optional(),
  businessWhatsapp: z.string().trim().optional(),
  businessEmail: z.string().trim().email().optional().or(z.literal("")),
  businessLogoUrl: z.string().trim().url().optional().or(z.literal("")),
  businessLocation: z.string().trim().optional(),
  businessDescription: z.string().trim().optional(),
  currency: z.string().trim().min(3).max(12),
  reservationFeeAmount: z.coerce.number().int().min(0),
  maximumEventsPerDay: z.coerce.number().int().min(1),
  transportDisclaimer: z.string().trim().min(5),
});

export const dateBlockFormSchema = z.object({
  eventDate: z.string().date(),
  reason: z.string().trim().optional(),
});

export const bookingFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  status: z
    .enum(["pending", "confirmed", "completed", "rejected", "cancelled", "all"])
    .default("pending"),
  search: z.string().trim().optional(),
  eventTypeId: z.string().uuid().optional(),
  county: z.enum(KENYAN_COUNTIES).optional(),
  serviceId: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export type EventTypeFormInput = z.infer<typeof eventTypeFormSchema>;
export type ServiceFormInput = z.infer<typeof serviceFormSchema>;
export type PricingFormInput = z.infer<typeof pricingFormSchema>;
export type SettingsFormInput = z.infer<typeof settingsFormSchema>;
