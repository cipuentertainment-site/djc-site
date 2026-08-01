"use server";

import { revalidatePath } from "next/cache";

import { requireAdminAction } from "@/lib/auth/admin";
import { slugify } from "@/lib/slug";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  bookingStatusFormSchema,
  dateBlockFormSchema,
  eventTypeFormSchema,
  pricingFormSchema,
  serviceFormSchema,
  settingsFormSchema,
  type EventTypeFormInput,
  type PricingFormInput,
  type ServiceFormInput,
  type SettingsFormInput,
} from "@/lib/validations/admin";

export type AdminActionResult = {
  ok: boolean;
  message: string;
};

async function getActionClient(): Promise<
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>> }
  | { ok: false; result: AdminActionResult }
> {
  const supabase = await createSupabaseServerClient();

  const admin = await requireAdminAction();

  if (!admin.ok) {
    return { ok: false, result: admin };
  }

  if (!supabase) {
    return {
      ok: false,
      result: {
        ok: false,
        message: "Supabase environment variables are not configured.",
      },
    };
  }

  return { ok: true, supabase };
}

function friendlyError(message?: string) {
  const text = message?.toLowerCase() ?? "";

  if (
    text.includes("permission denied") ||
    text.includes("row-level security") ||
    text.includes("rls") ||
    text.includes("jwt")
  ) {
    return "Admin authentication must be connected before this action can be completed.";
  }

  if (text.includes("duplicate") || text.includes("unique")) {
    return "A record with these details already exists.";
  }

  if (text.includes("confirmed booking capacity reached")) {
    return "This date has reached its maximum booking capacity.";
  }

  if (text.includes("event date") && text.includes("blocked")) {
    return "This date is manually blocked.";
  }

  return message ?? "The action could not be completed.";
}

export async function saveEventTypeAction(
  input: EventTypeFormInput,
): Promise<AdminActionResult> {
  const parsed = eventTypeFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid event type." };
  }

  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const { supabase } = client;
  const slug = slugify(parsed.data.name);
  const eventTypePayload = {
    name: parsed.data.name.trim(),
    slug,
    description: parsed.data.description?.trim() || null,
    is_active: parsed.data.isActive,
  };

  const eventTypeResult = parsed.data.id
    ? await supabase
        .from("event_types")
        .update(eventTypePayload)
        .eq("id", parsed.data.id)
        .select("id")
        .single()
    : await supabase
        .from("event_types")
        .insert(eventTypePayload)
        .select("id")
        .single();

  if (eventTypeResult.error) {
    return { ok: false, message: friendlyError(eventTypeResult.error.message) };
  }

  const eventTypeId = eventTypeResult.data.id as string;
  const sizes = parsed.data.sizes.map((size, index) => ({
    event_type_id: eventTypeId,
    label: size.label,
    min_attendees: size.minAttendees,
    max_attendees: size.maxAttendees,
    is_active: true,
    sort_order: (index + 1) * 10,
  }));

  const sizeResult = await supabase
    .from("event_type_sizes")
    .upsert(sizes, { onConflict: "event_type_id,label" });

  if (sizeResult.error) {
    return { ok: false, message: friendlyError(sizeResult.error.message) };
  }

  const existingRelationships = await supabase
    .from("event_type_services")
    .select("service_id")
    .eq("event_type_id", eventTypeId);

  if (existingRelationships.error) {
    return { ok: false, message: friendlyError(existingRelationships.error.message) };
  }

  const existingIds =
    existingRelationships.data?.map((row: { service_id: string }) => row.service_id) ??
    [];

  const selectedIds = new Set(parsed.data.serviceIds);
  const relationshipUpdates = existingIds.map((serviceId) =>
    supabase
      .from("event_type_services")
      .update({ is_active: selectedIds.has(serviceId) })
      .eq("event_type_id", eventTypeId)
      .eq("service_id", serviceId),
  );
  const missingSelected = parsed.data.serviceIds.filter(
    (serviceId) => !existingIds.includes(serviceId),
  );

  if (missingSelected.length) {
    const insertResult = await supabase.from("event_type_services").insert(
      missingSelected.map((serviceId) => ({
        event_type_id: eventTypeId,
        service_id: serviceId,
        is_active: true,
      })),
    );

    if (insertResult.error) {
      return { ok: false, message: friendlyError(insertResult.error.message) };
    }
  }

  const relationshipResults = await Promise.all(relationshipUpdates);
  const relationshipError = relationshipResults.find((result) => result.error)?.error;

  if (relationshipError) {
    return { ok: false, message: friendlyError(relationshipError.message) };
  }

  revalidatePath("/");
  revalidatePath("/admin/event-types");
  revalidatePath("/admin/pricing");

  return { ok: true, message: "Event type saved." };
}

export async function setEventTypeActiveAction(
  eventTypeId: string,
  isActive: boolean,
): Promise<AdminActionResult> {
  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const result = await client.supabase
    .from("event_types")
    .update({ is_active: isActive })
    .eq("id", eventTypeId);

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/");
  revalidatePath("/admin/event-types");
  return { ok: true, message: isActive ? "Event type enabled." : "Event type disabled." };
}

export async function deleteEventTypeIfUnusedAction(
  eventTypeId: string,
): Promise<AdminActionResult> {
  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const { supabase } = client;
  const [bookings, prices] = await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("event_type_id", eventTypeId),
    supabase
      .from("service_prices")
      .select("id", { count: "exact", head: true })
      .eq("event_type_id", eventTypeId),
  ]);

  const error = bookings.error ?? prices.error;

  if (error) {
    return { ok: false, message: friendlyError(error.message) };
  }

  if ((bookings.count ?? 0) > 0 || (prices.count ?? 0) > 0) {
    return setEventTypeActiveAction(eventTypeId, false);
  }

  const result = await supabase.from("event_types").delete().eq("id", eventTypeId);

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/");
  revalidatePath("/admin/event-types");
  return { ok: true, message: "Unused event type deleted." };
}

export async function saveServiceAction(
  input: ServiceFormInput,
): Promise<AdminActionResult> {
  const parsed = serviceFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid service." };
  }

  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const payload = {
    name: parsed.data.name.trim(),
    slug: slugify(parsed.data.name),
    description: parsed.data.description?.trim() || null,
    image_path: parsed.data.imagePath || null,
    is_active: parsed.data.isActive,
  };

  const result = parsed.data.id
    ? await client.supabase.from("services").update(payload).eq("id", parsed.data.id)
    : await client.supabase.from("services").insert(payload);

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/");
  revalidatePath("/admin/services");
  revalidatePath("/admin/pricing");

  return { ok: true, message: "Service saved." };
}

export async function reorderServicesAction(
  serviceIds: string[],
): Promise<AdminActionResult> {
  const ids = serviceIds.filter(Boolean);

  if (!ids.length || ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
    return { ok: false, message: "Invalid service order." };
  }

  if (new Set(ids).size !== ids.length) {
    return { ok: false, message: "Service order contains duplicates." };
  }

  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const results = await Promise.all(
    ids.map((id, index) =>
      client.supabase
        .from("services")
        .update({ sort_order: (index + 1) * 10 })
        .eq("id", id),
    ),
  );
  const error = results.find((result) => result.error)?.error;

  if (error) {
    return { ok: false, message: friendlyError(error.message) };
  }

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/admin/services");

  return { ok: true, message: "Homepage service order saved." };
}

export async function setServiceActiveAction(
  serviceId: string,
  isActive: boolean,
): Promise<AdminActionResult> {
  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const result = await client.supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", serviceId);

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/");
  revalidatePath("/admin/services");
  return { ok: true, message: isActive ? "Service enabled." : "Service disabled." };
}

export async function deleteServiceIfUnusedAction(
  serviceId: string,
): Promise<AdminActionResult> {
  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const { supabase } = client;
  const [bookings, prices] = await Promise.all([
    supabase
      .from("booking_services")
      .select("id", { count: "exact", head: true })
      .eq("service_id", serviceId),
    supabase
      .from("service_prices")
      .select("id", { count: "exact", head: true })
      .eq("service_id", serviceId),
  ]);

  const error = bookings.error ?? prices.error;

  if (error) {
    return { ok: false, message: friendlyError(error.message) };
  }

  if ((bookings.count ?? 0) > 0 || (prices.count ?? 0) > 0) {
    return setServiceActiveAction(serviceId, false);
  }

  const result = await supabase.from("services").delete().eq("id", serviceId);

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/");
  revalidatePath("/admin/services");
  return { ok: true, message: "Unused service deleted." };
}

export async function savePricingAction(
  input: PricingFormInput,
): Promise<AdminActionResult> {
  const parsed = pricingFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "Check the pricing values." };
  }

  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const configuredPrices = parsed.data.prices.filter(
    (price) => price.priceAmount !== null,
  );

  if (!configuredPrices.length) {
    return { ok: false, message: "Enter at least one price to save." };
  }

  const result = await client.supabase.from("service_prices").upsert(
    configuredPrices.map((price) => ({
      event_type_id: parsed.data.eventTypeId,
      event_type_size_id: price.eventTypeSizeId,
      service_id: price.serviceId,
      price_amount: price.priceAmount,
      currency: "KES",
      is_active: price.isActive,
    })),
    { onConflict: "event_type_id,event_type_size_id,service_id" },
  );

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/");
  revalidatePath("/admin/pricing");
  return { ok: true, message: "Pricing saved." };
}

export async function changeBookingStatusAction(
  bookingId: string,
  nextStatus: string,
): Promise<AdminActionResult> {
  const parsed = bookingStatusFormSchema.safeParse({ bookingId, nextStatus });

  if (!parsed.success) {
    return { ok: false, message: "Invalid status change." };
  }

  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const booking = await client.supabase
    .from("bookings")
    .select("id,status,event_date")
    .eq("id", parsed.data.bookingId)
    .single();

  if (booking.error) {
    return { ok: false, message: friendlyError(booking.error.message) };
  }

  const currentStatus = booking.data.status as string;
  const allowedTransitions: Record<string, string[]> = {
    pending: ["confirmed", "rejected"],
    confirmed: ["completed"],
  };

  if (!allowedTransitions[currentStatus]?.includes(parsed.data.nextStatus)) {
    return { ok: false, message: "This status transition is not allowed." };
  }

  if (parsed.data.nextStatus === "confirmed") {
    const availability = await client.supabase.rpc("get_booking_date_availability", {
      from_date: booking.data.event_date,
      to_date: booking.data.event_date,
    });

    if (availability.error) {
      return { ok: false, message: friendlyError(availability.error.message) };
    }

    if (!availability.data?.[0]?.is_available) {
      return {
        ok: false,
        message: "This date has reached its maximum booking capacity.",
      };
    }
  }

  const result = await client.supabase
    .from("bookings")
    .update({ status: parsed.data.nextStatus })
    .eq("id", parsed.data.bookingId);

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${parsed.data.bookingId}`);
  revalidatePath("/admin/calendar");

  return { ok: true, message: "Booking status updated." };
}

export async function saveSettingsAction(
  input: SettingsFormInput,
): Promise<AdminActionResult> {
  const parsed = settingsFormSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid settings." };
  }

  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const result = await client.supabase
    .from("global_settings")
    .upsert({
      id: "default",
      business_name: parsed.data.businessName,
      business_phone: parsed.data.businessPhone || null,
      business_whatsapp: parsed.data.businessWhatsapp || null,
      business_email: parsed.data.businessEmail || null,
      business_logo_url: parsed.data.businessLogoUrl || null,
      business_location: parsed.data.businessLocation || null,
      business_description: parsed.data.businessDescription || null,
      currency: parsed.data.currency,
      reservation_fee_amount: parsed.data.reservationFeeAmount,
      maximum_events_per_day: parsed.data.maximumEventsPerDay,
      transport_disclaimer: parsed.data.transportDisclaimer,
    });

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true, message: "Settings saved." };
}

export async function blockDateAction(
  eventDate: string,
  reason: string,
): Promise<AdminActionResult> {
  const parsed = dateBlockFormSchema.safeParse({ eventDate, reason });

  if (!parsed.success) {
    return { ok: false, message: "Enter a valid date to block." };
  }

  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const existing = await client.supabase
    .from("date_blocks")
    .select("id")
    .eq("event_date", parsed.data.eventDate)
    .eq("is_active", true)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, message: friendlyError(existing.error.message) };
  }

  const result = existing.data?.id
    ? await client.supabase
        .from("date_blocks")
        .update({ reason: parsed.data.reason || null })
        .eq("id", existing.data.id)
    : await client.supabase.from("date_blocks").insert({
        event_date: parsed.data.eventDate,
        reason: parsed.data.reason || null,
        is_active: true,
      });

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/admin/calendar");
  return { ok: true, message: "Date blocked." };
}

export async function unblockDateAction(blockId: string): Promise<AdminActionResult> {
  const client = await getActionClient();

  if (!client.ok) {
    return client.result;
  }

  const result = await client.supabase
    .from("date_blocks")
    .update({ is_active: false })
    .eq("id", blockId);

  if (result.error) {
    return { ok: false, message: friendlyError(result.error.message) };
  }

  revalidatePath("/admin/calendar");
  return { ok: true, message: "Date unblocked." };
}
