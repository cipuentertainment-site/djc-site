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
import type {
  MerchandiseProduct,
  MerchandiseRequest,
  PortfolioItem,
} from "@/types/merchandise-media";
import type { BookingFinancialSummary } from "@/lib/bookings/financials";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "rejected"
  | "cancelled";

export type ManualPaymentMethod = "mpesa" | "bank_transfer" | "cash";

export type AdminBookingPayment = {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  method: ManualPaymentMethod;
  transaction_reference: string | null;
  paid_at: string;
  created_at: string;
};

export type AdminBookingDocument = {
  id: string;
  booking_id: string;
  payment_id: string | null;
  document_type: "booking_confirmation" | "payment_statement" | "payment_receipt" | "appreciation";
  document_number: string;
  generation_key: string;
  status: "generating" | "generated" | "failed";
  issue_date: string;
  storage_path: string;
  error_message: string | null;
  created_at: string;
};

export type AdminDataResult<T> =
  | { status: "ready"; data: T }
  | { status: "not_configured"; data: T }
  | { status: "unauthorized"; data: T; message: string }
  | { status: "error"; data: T; message: string };

export type AdminBookingListItem = {
  id: string;
  booking_reference: string;
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
  agreed_total_amount: number | null;
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
  booking_reference: string;
  agreed_total_amount: number | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  event_size_min_attendees_snapshot: number;
  event_size_max_attendees_snapshot: number;
  transport_disclaimer_snapshot: string;
  reservation_fee_payment_reference: string | null;
  reservation_fee_paid_at: string | null;
  notes: string | null;
  payments: AdminBookingPayment[];
  documents: AdminBookingDocument[];
  financials: BookingFinancialSummary;
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
    websiteVisitors: number;
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

export type AdminMerchandiseMediaData = {
  portfolioItems: PortfolioItem[];
  merchandiseProducts: MerchandiseProduct[];
  merchandiseRequests: MerchandiseRequest[];
};
