import { randomUUID } from "crypto";

import { normalizeKenyanPhone } from "@/lib/mpesa/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { getDateAvailability } from "@/lib/supabase/public-data";
import { bookingQuoteSchema, type BookingQuoteInput } from "@/lib/validations/booking";

export type ValidatedBookingPayload = {
  internalReference: string;
  amount: number;
  currency: string;
  mpesaPhone: string;
  bookingPayload: {
    eventTypeId: string;
    eventTypeName: string;
    eventSizeId: string;
    eventSizeLabel: "small" | "medium" | "large";
    eventSizeMin: number;
    eventSizeMax: number;
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
  };
};

type ValidationResult =
  | { ok: true; data: ValidatedBookingPayload }
  | { ok: false; message: string };

export async function validateBookingForPayment(
  input: BookingQuoteInput,
): Promise<ValidationResult> {
  const parsed = bookingQuoteSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Check the booking details and try again." };
  }

  const mpesaPhone = normalizeKenyanPhone(parsed.data.mpesaPhone || parsed.data.customerPhone);

  if (!mpesaPhone) {
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
      .select("id,name,is_active")
      .eq("id", parsed.data.eventTypeId)
      .single(),
    supabase
      .from("event_type_sizes")
      .select("id,event_type_id,label,min_attendees,max_attendees,is_active")
      .eq("id", parsed.data.eventSizeId)
      .single(),
    supabase
      .from("services")
      .select("id,name,is_active")
      .in("id", parsed.data.serviceIds),
    supabase
      .from("service_prices")
      .select("event_type_id,event_type_size_id,service_id,price_amount,currency,is_active")
      .eq("event_type_id", parsed.data.eventTypeId)
      .eq("event_type_size_id", parsed.data.eventSizeId)
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
      },
    },
  };
}

export async function finalizeBookingFromPayment(paymentId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, message: "Server Supabase configuration is incomplete." };
  }

  const payment = await supabase
    .from("reservation_payments")
    .select("id,booking_id,status,booking_payload,mpesa_receipt_number,paid_at")
    .eq("id", paymentId)
    .single();

  if (payment.error || !payment.data) {
    return { ok: false, message: "Payment record not found." };
  }

  if (payment.data.booking_id) {
    return { ok: true, bookingId: payment.data.booking_id as string };
  }

  if (payment.data.status !== "success") {
    return { ok: false, message: "Payment is not successful." };
  }

  const payload = payment.data.booking_payload as ValidatedBookingPayload["bookingPayload"];
  const booking = await supabase
    .from("bookings")
    .insert({
      event_type_id: payload.eventTypeId,
      event_type_name_snapshot: payload.eventTypeName,
      event_type_size_id: payload.eventSizeId,
      event_size_label_snapshot: payload.eventSizeLabel,
      event_size_min_attendees_snapshot: payload.eventSizeMin,
      event_size_max_attendees_snapshot: payload.eventSizeMax,
      attendee_count: payload.eventSizeMin,
      event_date: payload.eventDate,
      county: payload.county,
      location_text: `${payload.townCentre} - ${payload.exactLocation}`,
      customer_name: payload.customerName,
      customer_phone: payload.customerPhone,
      estimated_service_total_amount: payload.estimatedServiceTotal,
      currency: payload.currency,
      transport_disclaimer_snapshot: payload.transportDisclaimer,
      reservation_fee_amount: payload.reservationFeeAmount,
      reservation_fee_payment_status: "paid",
      reservation_fee_payment_reference: payment.data.mpesa_receipt_number,
      reservation_fee_paid_at: payment.data.paid_at,
      status: "pending",
      notes: payload.customerEmail ? `Customer email: ${payload.customerEmail}` : null,
    })
    .select("id")
    .single();

  if (booking.error) {
    return { ok: false, message: booking.error.message };
  }

  const serviceInsert = await supabase.from("booking_services").insert(
    payload.services.map((service) => ({
      booking_id: booking.data.id,
      service_id: service.serviceId,
      service_name_snapshot: service.serviceName,
      price_amount_snapshot: service.priceAmount,
      currency: service.currency,
    })),
  );

  if (serviceInsert.error) {
    return { ok: false, message: serviceInsert.error.message };
  }

  await supabase
    .from("reservation_payments")
    .update({ booking_id: booking.data.id })
    .eq("id", paymentId)
    .is("booking_id", null);

  return { ok: true, bookingId: booking.data.id as string };
}
