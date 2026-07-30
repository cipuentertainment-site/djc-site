import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BookingOptions,
  DateAvailability,
  PublicBookingSettings,
  PublicEventType,
  PublicEventTypeSize,
  PublicEventTypeService,
  PublicService,
  PublicServicePrice,
} from "@/types/booking";

type PublicDataResult =
  | { status: "ready"; data: BookingOptions }
  | { status: "not_configured"; data: BookingOptions }
  | { status: "error"; message: string; data: BookingOptions };

const emptyOptions: BookingOptions = {
  settings: null,
  eventTypes: [],
  eventTypeSizes: [],
  eventTypeServices: [],
  services: [],
  servicePrices: [],
};

export async function getPublicBookingOptions(): Promise<PublicDataResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "not_configured", data: emptyOptions };
  }

  const [settings, eventTypes, eventTypeSizes, eventTypeServices, services, servicePrices] =
    await Promise.all([
      supabase
        .from("global_settings")
        .select(
          "business_name,business_phone,business_whatsapp,business_email,business_logo_url,business_location,business_description,currency,reservation_fee_amount,maximum_events_per_day,transport_disclaimer",
        )
        .eq("id", "default")
        .maybeSingle(),
      supabase
        .from("event_types")
        .select("id,name,slug,description")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("event_type_sizes")
        .select("id,event_type_id,label,min_attendees,max_attendees")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("event_type_services")
        .select("event_type_id,service_id")
        .eq("is_active", true),
      supabase
        .from("services")
        .select("id,name,slug,description")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("service_prices")
        .select("id,event_type_id,event_type_size_id,service_id,price_amount,currency")
        .eq("is_active", true),
    ]);

  const firstError =
    settings.error ??
    eventTypes.error ??
    eventTypeSizes.error ??
    eventTypeServices.error ??
    services.error ??
    servicePrices.error;

  const data: BookingOptions = {
    settings: (settings.data as PublicBookingSettings | null) ?? null,
    eventTypes: (eventTypes.data as PublicEventType[] | null) ?? [],
    eventTypeSizes: (eventTypeSizes.data as PublicEventTypeSize[] | null) ?? [],
    eventTypeServices:
      (eventTypeServices.data as PublicEventTypeService[] | null) ?? [],
    services: (services.data as PublicService[] | null) ?? [],
    servicePrices: (servicePrices.data as PublicServicePrice[] | null) ?? [],
  };

  if (firstError) {
    return { status: "error", message: firstError.message, data };
  }

  return { status: "ready", data };
}

export async function getDateAvailability(
  eventDate: string,
): Promise<DateAvailability | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_booking_date_availability", {
    from_date: eventDate,
    to_date: eventDate,
  });

  if (error || !data?.length) {
    return null;
  }

  return data[0] as DateAvailability;
}
