"use server";

import { bookingQuoteSchema, type BookingQuoteInput } from "@/lib/validations/booking";
import { getDateAvailability, getPublicBookingOptions } from "@/lib/supabase/public-data";
import type { PublicService } from "@/types/booking";

export type BookingQuoteResult =
  | {
      ok: true;
      total: number;
      currency: string;
      reservationFeeAmount: number;
      transportDisclaimer: string;
      selectedServices: Array<{
        service: PublicService;
        price: number;
      }>;
      dateAvailabilityMessage: string;
      canSubmitBooking: false;
      submissionMessage: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export async function checkDateAvailabilityAction(eventDate: string) {
  return getDateAvailability(eventDate);
}

export async function prepareBookingQuoteAction(
  input: BookingQuoteInput,
): Promise<BookingQuoteResult> {
  const parsed = bookingQuoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the booking details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const optionsResult = await getPublicBookingOptions();

  if (optionsResult.status !== "ready") {
    return {
      ok: false,
      message: "Booking configuration is not available yet.",
    };
  }

  const { data } = optionsResult;
  const eventType = data.eventTypes.find((item) => item.id === parsed.data.eventTypeId);
  const eventSize = data.eventTypeSizes.find(
    (item) =>
      item.id === parsed.data.eventSizeId &&
      item.event_type_id === parsed.data.eventTypeId,
  );

  if (!eventType || !eventSize) {
    return { ok: false, message: "Selected event configuration is unavailable." };
  }

  if (
    parsed.data.attendeeCount < eventSize.min_attendees ||
    parsed.data.attendeeCount > eventSize.max_attendees
  ) {
    return {
      ok: false,
      message: "Attendee count does not match the selected event size.",
    };
  }

  const dateAvailability = await getDateAvailability(parsed.data.eventDate);

  if (!dateAvailability?.is_available) {
    return {
      ok: false,
      message: "Selected date is not available for new booking requests.",
    };
  }

  const selectedServices = parsed.data.serviceIds.map((serviceId) => {
    const isAvailableForEventType = data.eventTypeServices.some(
      (item) =>
        item.event_type_id === eventType.id && item.service_id === serviceId,
    );
    const service = data.services.find((item) => item.id === serviceId);
    const price = data.servicePrices.find(
      (item) =>
        item.service_id === serviceId &&
        item.event_type_id === eventType.id &&
        item.event_type_size_id === eventSize.id,
    );

    if (!isAvailableForEventType || !service || !price) {
      return null;
    }

    return {
      service,
      price: price.price_amount,
    };
  });

  if (selectedServices.some((item) => item === null)) {
    return {
      ok: false,
      message: "One or more selected services do not have active pricing.",
    };
  }

  const services = selectedServices as Array<{ service: PublicService; price: number }>;
  const total = services.reduce((sum, item) => sum + item.price, 0);
  const currency = data.settings?.currency ?? "KES";

  return {
    ok: true,
    total,
    currency,
    reservationFeeAmount: data.settings?.reservation_fee_amount ?? 0,
    transportDisclaimer:
      data.settings?.transport_disclaimer ?? "Transport charges are quoted separately.",
    selectedServices: services,
    dateAvailabilityMessage: `${dateAvailability.confirmed_count}/${dateAvailability.maximum_events_per_day} confirmed bookings on this date.`,
    canSubmitBooking: false,
    submissionMessage:
      "Payment integration is not connected yet, so this quote has not submitted a booking request.",
  };
}
