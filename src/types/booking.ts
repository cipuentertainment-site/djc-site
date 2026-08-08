export type EventSizeLabel = "small" | "medium" | "large";
export type BookingDuration = "full_day" | "half_day";

export type PublicEventType = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  supports_half_day?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

export type PublicEventTypeSize = {
  id: string;
  event_type_id: string;
  label: EventSizeLabel;
  min_attendees: number;
  max_attendees: number;
  is_active?: boolean;
  sort_order?: number;
};

export type PublicService = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  supports_half_day?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

export type PublicEventTypeService = {
  event_type_id: string;
  service_id: string;
  is_active?: boolean;
};

export type PublicServicePrice = {
  id: string;
  event_type_id: string;
  event_type_size_id: string;
  service_id: string;
  duration: BookingDuration;
  price_amount: number;
  currency: string;
  is_active?: boolean;
};

export type PublicBookingSettings = {
  business_name: string;
  business_phone: string | null;
  business_whatsapp: string | null;
  business_email: string | null;
  business_logo_url: string | null;
  business_location: string | null;
  business_description: string | null;
  currency: string;
  reservation_fee_amount: number;
  maximum_events_per_day: number;
  transport_disclaimer: string;
};

export type DateAvailability = {
  event_date: string;
  confirmed_count: number;
  maximum_events_per_day: number;
  is_blocked: boolean;
  block_reason: string | null;
  is_available: boolean;
};

export type BookingOptions = {
  settings: PublicBookingSettings | null;
  eventTypes: PublicEventType[];
  eventTypeSizes: PublicEventTypeSize[];
  eventTypeServices: PublicEventTypeService[];
  services: PublicService[];
  servicePrices: PublicServicePrice[];
};
