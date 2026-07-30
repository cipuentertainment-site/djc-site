import { format, subDays } from "date-fns";

import { requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdminBookingDetail,
  AdminBookingListItem,
  AdminConfigData,
  AdminDataResult,
  BookingListData,
  BookingStatus,
  CalendarData,
  DashboardChartPoint,
  DashboardData,
  DateBlock,
} from "@/types/admin-data";
import type {
  DateAvailability,
  PublicBookingSettings,
  PublicEventType,
  PublicEventTypeService,
  PublicEventTypeSize,
  PublicService,
  PublicServicePrice,
} from "@/types/booking";

const bookingListSelect = `
  id,
  customer_name,
  customer_phone,
  event_type_name_snapshot,
  event_size_label_snapshot,
  attendee_count,
  event_date,
  county,
  location_text,
  estimated_service_total_amount,
  reservation_fee_amount,
  reservation_fee_payment_status,
  currency,
  status,
  created_at,
  booking_services (
    service_name_snapshot,
    price_amount_snapshot,
    currency
  )
`;

const bookingDetailSelect = `
  ${bookingListSelect},
  event_size_min_attendees_snapshot,
  event_size_max_attendees_snapshot,
  transport_disclaimer_snapshot,
  reservation_fee_payment_reference,
  reservation_fee_paid_at,
  notes
`;

const emptyConfig: AdminConfigData = {
  settings: null,
  eventTypes: [],
  eventTypeSizes: [],
  eventTypeServices: [],
  services: [],
  servicePrices: [],
};

const emptyDashboard: DashboardData = {
  stats: {
    pending: 0,
    confirmed: 0,
    completed: 0,
    rejected: 0,
    upcoming: 0,
    today: 0,
  },
  recentBookings: [],
  bookingsOverTime: [],
  eventTypes: [],
  servicesRequested: [],
  bookingStatuses: [],
};

function classifyError<T>(message: string, data: T): AdminDataResult<T> {
  const lower = message.toLowerCase();

  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("rls") ||
    lower.includes("jwt")
  ) {
    return {
      status: "unauthorized",
      message: "Admin authentication is required before this data can be loaded.",
      data,
    };
  }

  return { status: "error", message, data };
}

function toReady<T>(data: T): AdminDataResult<T> {
  return { status: "ready", data };
}

async function getAdminClient<T>(emptyData: T): Promise<
  | {
      ok: true;
      supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
    }
  | { ok: false; result: AdminDataResult<T> }
> {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { ok: false, result: { status: "not_configured", data: emptyData } };
  }

  return { ok: true, supabase };
}

function countBy<T extends string>(items: T[]) {
  return items.reduce<Record<T, number>>(
    (acc, item) => {
      acc[item] = (acc[item] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

export async function getAdminConfigData(): Promise<AdminDataResult<AdminConfigData>> {
  const client = await getAdminClient(emptyConfig);

  if (!client.ok) {
    return client.result;
  }

  const { supabase } = client;
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
        .select("id,name,slug,description,is_active,sort_order")
        .order("sort_order")
        .order("name"),
      supabase
        .from("event_type_sizes")
        .select("id,event_type_id,label,min_attendees,max_attendees,is_active,sort_order")
        .order("sort_order"),
      supabase
        .from("event_type_services")
        .select("event_type_id,service_id,is_active"),
      supabase
        .from("services")
        .select("id,name,slug,description,image_path,is_active,sort_order")
        .order("sort_order")
        .order("name"),
      supabase
        .from("service_prices")
        .select("id,event_type_id,event_type_size_id,service_id,price_amount,currency,is_active"),
    ]);

  const error =
    settings.error ??
    eventTypes.error ??
    eventTypeSizes.error ??
    eventTypeServices.error ??
    services.error ??
    servicePrices.error;

  const data: AdminConfigData = {
    settings: (settings.data as PublicBookingSettings | null) ?? null,
    eventTypes: (eventTypes.data as PublicEventType[] | null) ?? [],
    eventTypeSizes: (eventTypeSizes.data as PublicEventTypeSize[] | null) ?? [],
    eventTypeServices:
      (eventTypeServices.data as PublicEventTypeService[] | null) ?? [],
    services: (services.data as PublicService[] | null) ?? [],
    servicePrices: (servicePrices.data as PublicServicePrice[] | null) ?? [],
  };

  if (error) {
    return classifyError(error.message, data);
  }

  return toReady(data);
}

export async function getAdminDashboardData(
  rangeDays = 30,
): Promise<AdminDataResult<DashboardData>> {
  const client = await getAdminClient(emptyDashboard);

  if (!client.ok) {
    return client.result;
  }

  const { supabase } = client;
  const today = format(new Date(), "yyyy-MM-dd");
  const rangeStart = format(subDays(new Date(), rangeDays - 1), "yyyy-MM-dd");

  const [
    pending,
    confirmed,
    completed,
    rejected,
    upcoming,
    todaysEvents,
    recentBookings,
    chartBookings,
    serviceRows,
  ] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("event_date", today),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .eq("event_date", today),
    supabase
      .from("bookings")
      .select(bookingListSelect)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("bookings")
      .select("created_at,event_type_name_snapshot,status")
      .gte("created_at", `${rangeStart}T00:00:00`)
      .order("created_at", { ascending: true })
      .limit(500),
    supabase
      .from("booking_services")
      .select("service_name_snapshot,created_at")
      .gte("created_at", `${rangeStart}T00:00:00`)
      .limit(500),
  ]);

  const firstError =
    pending.error ??
    confirmed.error ??
    completed.error ??
    rejected.error ??
    upcoming.error ??
    todaysEvents.error ??
    recentBookings.error ??
    chartBookings.error ??
    serviceRows.error;

  if (firstError) {
    return classifyError(firstError.message, emptyDashboard);
  }

  const bookingRows =
    (chartBookings.data as Array<{
      created_at: string;
      event_type_name_snapshot: string;
      status: BookingStatus;
    }> | null) ?? [];
  const days = Array.from({ length: rangeDays }, (_, index) => {
    const date = subDays(new Date(), rangeDays - 1 - index);
    return format(date, "yyyy-MM-dd");
  });
  const bookingCounts = new Map(days.map((day) => [day, 0]));
  const eventTypeCounts = new Map<string, number>();
  const statusCounts = countBy<BookingStatus>(["pending", "confirmed", "completed", "rejected"]);

  bookingRows.forEach((booking) => {
    const day = booking.created_at.slice(0, 10);
    bookingCounts.set(day, (bookingCounts.get(day) ?? 0) + 1);
    eventTypeCounts.set(
      booking.event_type_name_snapshot,
      (eventTypeCounts.get(booking.event_type_name_snapshot) ?? 0) + 1,
    );
  });

  statusCounts.pending = pending.count ?? 0;
  statusCounts.confirmed = confirmed.count ?? 0;
  statusCounts.completed = completed.count ?? 0;
  statusCounts.rejected = rejected.count ?? 0;

  const serviceCounts = new Map<string, number>();
  ((serviceRows.data as Array<{ service_name_snapshot: string }> | null) ?? []).forEach(
    (row) => {
      serviceCounts.set(
        row.service_name_snapshot,
        (serviceCounts.get(row.service_name_snapshot) ?? 0) + 1,
      );
    },
  );

  const toPoints = (entries: Iterable<[string, number]>): DashboardChartPoint[] =>
    Array.from(entries).map(([label, value]) => ({ label, value }));

  return toReady({
    stats: {
      pending: pending.count ?? 0,
      confirmed: confirmed.count ?? 0,
      completed: completed.count ?? 0,
      rejected: rejected.count ?? 0,
      upcoming: upcoming.count ?? 0,
      today: todaysEvents.count ?? 0,
    },
    recentBookings:
      (recentBookings.data as AdminBookingListItem[] | null) ?? [],
    bookingsOverTime: toPoints(bookingCounts),
    eventTypes: toPoints(eventTypeCounts),
    servicesRequested: toPoints(serviceCounts),
    bookingStatuses: [
      { label: "Pending", value: statusCounts.pending },
      { label: "Confirmed", value: statusCounts.confirmed },
      { label: "Completed", value: statusCounts.completed },
      { label: "Rejected", value: statusCounts.rejected },
    ],
  });
}

export async function getAdminBookings(searchParams: {
  page?: string;
  status?: string;
  search?: string;
  eventTypeId?: string;
  county?: string;
  serviceId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<AdminDataResult<BookingListData>> {
  const page = Math.max(Number(searchParams.page ?? 1), 1);
  const pageSize = 20;
  const empty: BookingListData = { bookings: [], total: 0, page, pageSize };
  const client = await getAdminClient(empty);

  if (!client.ok) {
    return client.result;
  }

  const { supabase } = client;
  let bookingIdsForService: string[] | null = null;

  if (searchParams.serviceId) {
    const serviceMatches = await supabase
      .from("booking_services")
      .select("booking_id")
      .eq("service_id", searchParams.serviceId);

    if (serviceMatches.error) {
      return classifyError(serviceMatches.error.message, empty);
    }

    bookingIdsForService =
      serviceMatches.data?.map((row: { booking_id: string }) => row.booking_id) ?? [];
  }

  let query = supabase
    .from("bookings")
    .select(bookingListSelect, { count: "exact" })
    .order("created_at", { ascending: false });

  if (searchParams.status && searchParams.status !== "all") {
    query = query.eq("status", searchParams.status);
  }

  if (searchParams.search) {
    const search = searchParams.search.replace(/[%_,]/g, "");
    query = query.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
  }

  if (searchParams.eventTypeId) {
    query = query.eq("event_type_id", searchParams.eventTypeId);
  }

  if (searchParams.county) {
    query = query.eq("county", searchParams.county);
  }

  if (searchParams.dateFrom) {
    query = query.gte("event_date", searchParams.dateFrom);
  }

  if (searchParams.dateTo) {
    query = query.lte("event_date", searchParams.dateTo);
  }

  if (bookingIdsForService) {
    if (!bookingIdsForService.length) {
      return toReady(empty);
    }
    query = query.in("id", bookingIdsForService);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const result = await query.range(from, to);

  if (result.error) {
    return classifyError(result.error.message, empty);
  }

  return toReady({
    bookings: (result.data as AdminBookingListItem[] | null) ?? [],
    total: result.count ?? 0,
    page,
    pageSize,
  });
}

export async function getAdminBookingDetail(
  id: string,
): Promise<AdminDataResult<AdminBookingDetail | null>> {
  const client = await getAdminClient<AdminBookingDetail | null>(null);

  if (!client.ok) {
    return client.result;
  }

  const result = await client.supabase
    .from("bookings")
    .select(bookingDetailSelect)
    .eq("id", id)
    .maybeSingle();

  if (result.error) {
    return classifyError(result.error.message, null);
  }

  return toReady((result.data as AdminBookingDetail | null) ?? null);
}

export async function getAdminCalendarData(
  fromDate: string,
  toDate: string,
): Promise<AdminDataResult<CalendarData>> {
  const empty: CalendarData = { availability: [], confirmedBookings: [] };
  const client = await getAdminClient(empty);

  if (!client.ok) {
    return client.result;
  }

  const [availability, bookings] = await Promise.all([
    client.supabase.rpc("get_booking_date_availability", {
      from_date: fromDate,
      to_date: toDate,
    }),
    client.supabase
      .from("bookings")
      .select(bookingListSelect)
      .eq("status", "confirmed")
      .gte("event_date", fromDate)
      .lte("event_date", toDate)
      .order("event_date", { ascending: true }),
  ]);

  const error = availability.error ?? bookings.error;

  if (error) {
    return classifyError(error.message, empty);
  }

  return toReady({
    availability: (availability.data as DateAvailability[] | null) ?? [],
    confirmedBookings: (bookings.data as AdminBookingListItem[] | null) ?? [],
  });
}

export async function getActiveDateBlocks(): Promise<AdminDataResult<DateBlock[]>> {
  const client = await getAdminClient<DateBlock[]>([]);

  if (!client.ok) {
    return client.result;
  }

  const result = await client.supabase
    .from("date_blocks")
    .select("id,event_date,reason,is_active")
    .eq("is_active", true)
    .order("event_date", { ascending: true });

  if (result.error) {
    return classifyError(result.error.message, []);
  }

  return toReady((result.data as DateBlock[] | null) ?? []);
}
