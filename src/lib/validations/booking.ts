import { z } from "zod";

import { KENYAN_COUNTIES } from "@/lib/counties";

const dateStringSchema = z.string().refine((value) => {
  const timestamp = Date.parse(`${value}T00:00:00`);

  if (Number.isNaN(timestamp)) {
    return false;
  }

  const selected = new Date(timestamp);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return selected >= today;
}, "Select today or a future date.");

export const bookingQuoteSchema = z.object({
  eventTypeId: z.string().uuid("Select an event type."),
  eventSizeId: z.string().uuid("Select an event size."),
  serviceIds: z.array(z.string().uuid()).min(1, "Select at least one service."),
  attendeeCount: z.coerce.number().int().min(0, "Attendee count cannot be negative."),
  eventDate: dateStringSchema,
  county: z.enum(KENYAN_COUNTIES, {
    errorMap: () => ({ message: "Select a Kenyan county." }),
  }),
  locationText: z.string().trim().min(3, "Enter the town, centre, or exact location."),
  customerName: z.string().trim().min(2, "Enter the customer name."),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(?:\+254|254|0)?[17]\d{8}$/, "Enter a valid Kenyan phone number."),
});

export type BookingQuoteInput = z.infer<typeof bookingQuoteSchema>;
