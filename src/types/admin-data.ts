import type {
  DateAvailability,
  BookingDuration,
  EventSizeLabel,
  PublicBookingSettings,
  PublicEventType,
  PublicEventTypeService,
  PublicEventTypeSize,
  PublicService,
  PublicServicePrice,
} from "@/types/booking";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "rejected"
  | "cancelled";

export type AdminDataResult<T> =
  | { status: "ready"; data: T }
  | { status: "not_configured"; data: T }
  | { status: "unauthorized"; data: T; message: string }
  | { status: "error"; data: T; message: string };

export type AdminBookingListItem = {
  id: string;
  customer_name: string;
  customer_phone: string;
  event_type_name_snapshot: string;
  event_size_label_snapshot: EventSizeLabel;
  duration: BookingDuration;
  attendee_count: number;
  event_date: string;
  county: string;
  location_text: string;
  estimated_service_total_amount: number;
  reservation_fee_amount: number;
  reservation_fee_payment_status: string;
  currency: string;
  status: BookingStatus;
  created_at: string;
  booking_services: Array<{
    service_name_snapshot: string;
    price_amount_snapshot: number;
    currency: string;
  }>;
};

export type AdminBookingDetail = AdminBookingListItem & {
  event_size_min_attendees_snapshot: number;
  event_size_max_attendees_snapshot: number;
  transport_disclaimer_snapshot: string;
  reservation_fee_payment_reference: string | null;
  reservation_fee_paid_at: string | null;
  notes: string | null;
};

export type DashboardChartPoint = {
  label: string;
  value: number;
};

export type DashboardData = {
  stats: {
    pending: number;
    confirmed: number;
    completed: number;
    rejected: number;
    upcoming: number;
    today: number;
  };
  recentBookings: AdminBookingListItem[];
  bookingsOverTime: DashboardChartPoint[];
  eventTypes: DashboardChartPoint[];
  servicesRequested: DashboardChartPoint[];
  bookingStatuses: DashboardChartPoint[];
};

export type AdminConfigData = {
  settings: PublicBookingSettings | null;
  eventTypes: PublicEventType[];
  eventTypeSizes: PublicEventTypeSize[];
  eventTypeServices: PublicEventTypeService[];
  services: PublicService[];
  servicePrices: PublicServicePrice[];
};

export type BookingListData = {
  bookings: AdminBookingListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type CalendarData = {
  availability: DateAvailability[];
  confirmedBookings: AdminBookingListItem[];
};

export type DateBlock = {
  id: string;
  event_date: string;
  reason: string | null;
  is_active: boolean;
};
