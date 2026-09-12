import { randomUUID } from "crypto";

import { PRIVACY_NOTICE_VERSION, TERMS_VERSION } from "@/lib/legal-documents";
import { normalizeKenyanPhone } from "@/lib/mpesa/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { getDateAvailability } from "@/lib/supabase/public-data";
import { bookingQuoteSchema, type BookingQuoteInput } from "@/lib/validations/booking";

export type ValidatedBookingPayload = {
  internalReference: string;
  amount: number;
  currency: string;
  mpesaPhone: string | null;
  bookingPayload: {
    eventTypeId: string;
    eventTypeName: string;
    eventSizeId: string;
    eventSizeLabel: "small" | "medium" | "large";
    eventSizeMin: number;
    eventSizeMax: number;
    duration: "full_day" | "half_day";
    serviceIds: string[];
    services: Array<{
      serviceId: string;
      serviceName: string;
      priceAmount: number;
      currency: string;
    }>;
    eventDate: string;
    county: string;
    townCentre: string;
    exactLocation: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    estimatedServiceTotal: number;
    reservationFeeAmount: number;
    currency: string;
    transportDisclaimer: string;
    termsAcceptedAt: string;
    termsVersion: string;
    privacyNoticeVersion: string;
  };
};

type ValidationResult =
  | { ok: true; data: ValidatedBookingPayload }
  | { ok: false; message: string };

async function validateBookingPayload(
  input: BookingQuoteInput,
  options: { requireMpesaPhone: boolean },
): Promise<ValidationResult> {
  const parsed = bookingQuoteSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Check the booking details and try again." };
  }

  const mpesaPhone = normalizeKenyanPhone(parsed.data.mpesaPhone || parsed.data.customerPhone);

  if (options.requireMpesaPhone && !mpesaPhone) {
    return { ok: false, message: "Enter a valid M-Pesa phone number." };
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, message: "Server payment configuration is incomplete." };
  }

  const [settings, eventType, eventSize, services, prices] = await Promise.all([
    supabase
      .from("global_settings")
      .select("currency,reservation_fee_amount,transport_disclaimer")
      .eq("id", "default")
      .single(),
    supabase
      .from("event_types")
      .select("id,name,is_active,supports_half_day")
      .eq("id", parsed.data.eventTypeId)
      .single(),
    supabase
      .from("event_type_sizes")
      .select("id,event_type_id,label,min_attendees,max_attendees,is_active")
      .eq("id", parsed.data.eventSizeId)
      .single(),
    supabase
      .from("services")
      .select("id,name,is_active,supports_half_day")
      .in("id", parsed.data.serviceIds),
    supabase
      .from("service_prices")
      .select("event_type_id,event_type_size_id,service_id,duration,price_amount,currency,is_active")
      .eq("event_type_id", parsed.data.eventTypeId)
      .eq("event_type_size_id", parsed.data.eventSizeId)
      .eq("duration", parsed.data.duration)
      .in("service_id", parsed.data.serviceIds),
  ]);

  const error =
    settings.error ?? eventType.error ?? eventSize.error ?? services.error ?? prices.error;

  if (error || !settings.data || !eventType.data || !eventSize.data) {
    return { ok: false, message: "Booking configuration is unavailable." };
  }

  if (!eventType.data.is_active || !eventSize.data.is_active) {
    return { ok: false, message: "Selected event configuration is unavailable." };
  }

  if (eventSize.data.event_type_id !== eventType.data.id) {
    return { ok: false, message: "Selected event size does not match the event type." };
  }

  if (parsed.data.duration === "half_day" && !eventType.data.supports_half_day) {
    return { ok: false, message: "Half Day is not available for this event type." };
  }

  const relationships = await supabase
    .from("event_type_services")
    .select("service_id,is_active")
    .eq("event_type_id", eventType.data.id)
    .in("service_id", parsed.data.serviceIds);

  if (relationships.error) {
    return { ok: false, message: "Service availability could not be verified." };
  }

  const serviceRows = services.data ?? [];
  const priceRows = prices.data ?? [];

  if (
    parsed.data.duration === "half_day" &&
    serviceRows.some((service) => !service.supports_half_day)
  ) {
    return {
      ok: false,
      message: "Half Day is not available for one or more selected services.",
    };
  }

  if (
    serviceRows.length !== parsed.data.serviceIds.length ||
    priceRows.length !== parsed.data.serviceIds.length ||
    relationships.data?.filter((item) => item.is_active).length !==
      parsed.data.serviceIds.length
  ) {
    return { ok: false, message: "One or more selected services are unavailable." };
  }

  const availability = await getDateAvailability(parsed.data.eventDate);

  if (!availability?.is_available) {
    return { ok: false, message: "Selected date is no longer available." };
  }

  const selectedServices = parsed.data.serviceIds.map((serviceId) => {
    const service = serviceRows.find((item) => item.id === serviceId);
    const price = priceRows.find((item) => item.service_id === serviceId);

    if (!service || !price || !service.is_active || !price.is_active) {
      return null;
    }

    return {
      serviceId,
      serviceName: service.name,
      priceAmount: price.price_amount,
      currency: price.currency,
    };
  });

  if (selectedServices.some((item) => item === null)) {
    return { ok: false, message: "One or more selected services are unavailable." };
  }

  const serviceSnapshots = selectedServices as ValidatedBookingPayload["bookingPayload"]["services"];
  const estimatedServiceTotal = serviceSnapshots.reduce(
    (sum, service) => sum + service.priceAmount,
    0,
  );
  const termsAcceptedAt = new Date().toISOString();

  return {
    ok: true,
    data: {
      internalReference: `DJC-${Date.now()}-${randomUUID().slice(0, 8)}`,
      amount: settings.data.reservation_fee_amount,
      currency: settings.data.currency,
      mpesaPhone,
      bookingPayload: {
        eventTypeId: eventType.data.id,
        eventTypeName: eventType.data.name,
        eventSizeId: eventSize.data.id,
        eventSizeLabel: eventSize.data.label,
        eventSizeMin: eventSize.data.min_attendees,
        eventSizeMax: eventSize.data.max_attendees,
        duration: parsed.data.duration,
        serviceIds: parsed.data.serviceIds,
        services: serviceSnapshots,
        eventDate: parsed.data.eventDate,
        county: parsed.data.county,
        townCentre: parsed.data.townCentre,
        exactLocation: parsed.data.exactLocation,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        customerEmail: parsed.data.customerEmail || null,
        estimatedServiceTotal,
        reservationFeeAmount: settings.data.reservation_fee_amount,
        currency: settings.data.currency,
        transportDisclaimer: settings.data.transport_disclaimer,
        termsAcceptedAt,
        termsVersion: TERMS_VERSION,
        privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
      },
    },
  };
}

export async function validateBookingForPayment(
  input: BookingQuoteInput,
): Promise<ValidationResult> {
  return validateBookingPayload(input, { requireMpesaPhone: true });
}

export async function validateBookingForManualSubmission(
  input: BookingQuoteInput,
): Promise<ValidationResult> {
  return validateBookingPayload(input, { requireMpesaPhone: false });
}

export async function createBookingFromPayload(
  payload: ValidatedBookingPayload["bookingPayload"],
  payment: {
    reservationFeePaymentStatus: "pending" | "paid" | "failed" | "refunded";
    reservationFeePaymentReference?: string | null;
    reservationFeePaidAt?: string | null;
    rejectRecentDuplicate?: boolean;
  },
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, message: "Server Supabase configuration is incomplete." };
  }

  const result = await supabase.rpc("create_booking_from_payload", {
    p_payload: payload,
    p_payment_status: payment.reservationFeePaymentStatus,
    p_payment_reference: payment.reservationFeePaymentReference ?? null,
    p_payment_paid_at: payment.reservationFeePaidAt ?? null,
    p_reject_recent_duplicate: payment.rejectRecentDuplicate ?? false,
  });

  if (result.error || typeof result.data !== "string") {
    const message = result.error?.message.toLowerCase() ?? "";

    if (message.includes("recent booking request already submitted")) {
      return {
        ok: false,
        duplicate: true,
        message:
          "This booking request was already submitted recently. Please wait before sending it again.",
      };
    }

    console.error("Booking creation failed.", {
      code: result.error?.code,
      message: result.error?.message,
    });

    return { ok: false, message: "Could not create the booking record." };
  }

  return { ok: true, bookingId: result.data };
}

export async function finalizeBookingFromPayment(paymentId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, message: "Server Supabase configuration is incomplete." };
  }

  const result = await supabase.rpc("finalize_booking_from_payment", {
    p_payment_id: paymentId,
  });

  if (result.error || typeof result.data !== "string") {
    return { ok: false, message: result.error?.message ?? "Payment finalization failed." };
  }

  return { ok: true, bookingId: result.data };
}
