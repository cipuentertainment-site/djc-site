import { format, subDays } from "date-fns";

import { requireAdmin } from "@/lib/auth/admin";
import { calculateBookingFinancials } from "@/lib/bookings/financials";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdminBookingDetail,
  AdminBookingAgreement,
  AdminBookingFinalService,
  AdminBookingListItem,
  AdminBookingPayment,
  AdminServiceCatalogueItem,
  AdminConfigData,
  AdminDataResult,
  AdminMerchandiseMediaData,
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
import type {
  MerchandiseProduct,
  MerchandiseProductImage,
  MerchandiseRequest,
  PortfolioItem,
} from "@/types/merchandise-media";

const bookingListSelect = `
  id,
  event_type_id,
  event_type_size_id,
  booking_reference,
  customer_name,
  customer_phone,
  event_type_name_snapshot,
  event_size_label_snapshot,
  duration,
  attendee_count,
  event_date,
  county,
  location_text,
  estimated_service_total_amount,
  agreed_total_amount,
  reservation_fee_amount,
  reservation_fee_payment_status,
  currency,
  status,
  created_at,
  booking_services (
    id,
    service_id,
    service_name_snapshot,
    price_amount_snapshot,
    currency
  )
`;

const bookingDetailSelect = `
  ${bookingListSelect},
  confirmed_at,
  confirmed_by,
  event_size_min_attendees_snapshot,
  event_size_max_attendees_snapshot,
  transport_disclaimer_snapshot,
  reservation_fee_payment_reference,
  reservation_fee_paid_at,
  notes
`;

const legacyBookingListSelect = `
  id,
  event_type_id,
  event_type_size_id,
  customer_name,
  customer_phone,
  event_type_name_snapshot,
  event_size_label_snapshot,
  duration,
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
    id,
    service_id,
    service_name_snapshot,
    price_amount_snapshot,
    currency
  )
`;

const legacyBookingDetailSelect = `
  ${legacyBookingListSelect},
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
    websiteVisitors: 0,
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

function isBookingPaymentSchemaMissing(error: { code?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42703" || (error.code === "42P01" && message.includes("booking_"));
}

function fallbackBookingReference(id: string) {
  return `DJC-${id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function normalizeBookingRows(rows: unknown[] | null) {
  return (rows ?? []).map((row) => {
    const item = row as AdminBookingListItem & {
      booking_reference?: string | null;
      agreed_total_amount?: number | null;
    };

    return {
      ...item,
      booking_reference: item.booking_reference ?? fallbackBookingReference(item.id),
      agreed_total_amount: item.agreed_total_amount ?? null,
    } as AdminBookingListItem;
  });
}

function normalizeLegacyPayments(rows: Array<{
  id: string;
  booking_id: string | null;
  amount: number;
  currency: string;
  internal_reference: string;
  mpesa_receipt_number: string | null;
  paid_at: string | null;
  created_at: string;
  status: string;
}> | null): AdminBookingPayment[] {
  return (rows ?? [])
    .filter((row) => row.status === "success" && row.booking_id)
    .map((row) => ({
      id: row.id,
      booking_id: row.booking_id as string,
      amount: row.amount,
      currency: row.currency,
      method: "mpesa" as const,
      transaction_reference: row.mpesa_receipt_number ?? row.internal_reference ?? null,
      paid_at: row.paid_at ?? row.created_at,
      created_at: row.created_at,
    }));
}

function normalizeRequestedFinalServices(
  booking: AdminBookingListItem,
): AdminBookingFinalService[] {
  return booking.booking_services.map((service, index) => ({
    id: service.id ?? `${booking.id}-requested-${index}`,
    booking_id: booking.id,
    agreement_id: null,
    service_id: service.service_id,
    service_name_snapshot: service.service_name_snapshot,
    description_snapshot: null,
    quantity: 1,
    unit_price_amount: service.price_amount_snapshot,
    line_total_amount: service.price_amount_snapshot,
    currency: service.currency,
    sort_order: index + 1,
  }));
}

function buildServiceCatalogue(
  booking: AdminBookingListItem,
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    supports_half_day: boolean | null;
  }> | null,
  prices: Array<{
    service_id: string;
    event_type_id: string;
    event_type_size_id: string;
    duration: string;
    price_amount: number;
    currency: string;
    is_active: boolean;
  }> | null,
): AdminServiceCatalogueItem[] {
  return (services ?? []).map((service) => {
    const price = (prices ?? []).find(
      (candidate) =>
        candidate.service_id === service.id &&
        candidate.event_type_id === booking.event_type_id &&
        candidate.event_type_size_id === booking.event_type_size_id &&
        candidate.duration === booking.duration &&
        candidate.is_active,
    );

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      supports_half_day: service.supports_half_day ?? false,
      default_price_amount: price?.price_amount ?? null,
      currency: price?.currency ?? booking.currency,
    };
  });
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
          "business_name,business_phone,business_whatsapp,business_email,business_logo_url,business_location,business_description,currency,reservation_fee_amount,maximum_events_per_day,transport_disclaimer,homepage_service_ids",
        )
        .eq("id", "default")
        .maybeSingle(),
      supabase
        .from("event_types")
        .select("id,name,slug,description,supports_half_day,is_active,sort_order")
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
        .select("id,name,slug,description,image_path,supports_half_day,is_active,sort_order")
        .order("sort_order")
        .order("name"),
      supabase
        .from("service_prices")
        .select("id,event_type_id,event_type_size_id,service_id,duration,price_amount,currency,is_active"),
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
    websiteVisitors,
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
    supabase.from("website_visitors").select("visitor_id", { count: "exact", head: true }),
  ]);

  let recentBookingRows = recentBookings.data as unknown[] | null;
  if (recentBookings.error && isBookingPaymentSchemaMissing(recentBookings.error)) {
    const legacyRecentBookings = await supabase
      .from("bookings")
      .select(legacyBookingListSelect)
      .order("created_at", { ascending: false })
      .limit(8);

    if (legacyRecentBookings.error) {
      return classifyError(legacyRecentBookings.error.message, emptyDashboard);
    }

    recentBookingRows = legacyRecentBookings.data as unknown[] | null;
  }

  const firstError =
    pending.error ??
    confirmed.error ??
    completed.error ??
    rejected.error ??
    upcoming.error ??
    todaysEvents.error ??
    (recentBookings.error && !isBookingPaymentSchemaMissing(recentBookings.error)
      ? recentBookings.error
      : null) ??
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
      websiteVisitors: websiteVisitors.count ?? 0,
    },
    recentBookings: normalizeBookingRows(recentBookingRows),
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
    if (isBookingPaymentSchemaMissing(result.error)) {
      let legacyQuery = supabase
        .from("bookings")
        .select(legacyBookingListSelect, { count: "exact" })
        .order("created_at", { ascending: false });

      if (searchParams.status && searchParams.status !== "all") {
        legacyQuery = legacyQuery.eq("status", searchParams.status);
      }
      if (searchParams.search) {
        const search = searchParams.search.replace(/[%_,]/g, "");
        legacyQuery = legacyQuery.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
      }
      if (searchParams.eventTypeId) {
        legacyQuery = legacyQuery.eq("event_type_id", searchParams.eventTypeId);
      }
      if (searchParams.county) {
        legacyQuery = legacyQuery.eq("county", searchParams.county);
      }
      if (searchParams.dateFrom) {
        legacyQuery = legacyQuery.gte("event_date", searchParams.dateFrom);
      }
      if (searchParams.dateTo) {
        legacyQuery = legacyQuery.lte("event_date", searchParams.dateTo);
      }
      if (bookingIdsForService) {
        legacyQuery = legacyQuery.in("id", bookingIdsForService);
      }

      const legacyResult = await legacyQuery.range(from, to);
      if (legacyResult.error) {
        return classifyError(legacyResult.error.message, empty);
      }

      return toReady({
        bookings: normalizeBookingRows(legacyResult.data as unknown[] | null),
        total: legacyResult.count ?? 0,
        page,
        pageSize,
      });
    }

    return classifyError(result.error.message, empty);
  }

  return toReady({
    bookings: normalizeBookingRows(result.data as unknown[] | null),
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

  const [result, payments, documents, agreements, finalServices, catalogueServices, cataloguePrices] = await Promise.all([
    client.supabase
      .from("bookings")
      .select(bookingDetailSelect)
      .eq("id", id)
      .maybeSingle(),
    client.supabase
      .from("booking_payments")
      .select(
        "id,booking_id,amount,currency,method,transaction_reference,paid_at,created_at",
      )
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
    client.supabase
      .from("booking_documents")
      .select(
        "id,booking_id,payment_id,agreement_id,agreement_version,document_type,document_number,generation_key,status,issue_date,storage_path,error_message,created_at",
      )
      .eq("booking_id", id)
      .order("created_at", { ascending: false }),
    client.supabase
      .from("booking_final_agreements")
      .select("id,booking_id,version,agreed_total_amount,amendment_reason,is_current,created_at")
      .eq("booking_id", id)
      .order("version", { ascending: false }),
    client.supabase
      .from("booking_final_services")
      .select("id,booking_id,agreement_id,service_id,service_name_snapshot,description_snapshot,quantity,unit_price_amount,line_total_amount,currency,sort_order")
      .eq("booking_id", id)
      .order("sort_order", { ascending: true }),
    client.supabase
      .from("services")
      .select("id,name,description,supports_half_day")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    client.supabase
      .from("service_prices")
      .select("service_id,event_type_id,event_type_size_id,duration,price_amount,currency,is_active")
      .eq("is_active", true),
  ]);

  const error = result.error ?? payments.error ?? documents.error ?? agreements.error ?? finalServices.error ?? catalogueServices.error ?? cataloguePrices.error;

  if (error) {
    if (isBookingPaymentSchemaMissing(error)) {
      const [legacyBooking, legacyPayments] = await Promise.all([
        client.supabase
          .from("bookings")
          .select(legacyBookingDetailSelect)
          .eq("id", id)
          .maybeSingle(),
        client.supabase
          .from("reservation_payments")
          .select("id,booking_id,amount,currency,internal_reference,mpesa_receipt_number,paid_at,created_at,status")
          .eq("booking_id", id)
          .order("created_at", { ascending: true }),
      ]);

      const legacyError = legacyBooking.error ?? legacyPayments.error;
      if (legacyError) {
        return classifyError(legacyError.message, null);
      }

      if (!legacyBooking.data) {
        return toReady(null);
      }

      const legacyRow = legacyBooking.data as Omit<
        AdminBookingDetail,
        "payments" | "documents" | "financials" | "payment_workflow_ready"
      >;
      const paymentRows = normalizeLegacyPayments(legacyPayments.data as Array<{
        id: string;
        booking_id: string | null;
        amount: number;
        currency: string;
        internal_reference: string;
        mpesa_receipt_number: string | null;
        paid_at: string | null;
        created_at: string;
        status: string;
      }> | null);

      return toReady({
        ...legacyRow,
        booking_reference: fallbackBookingReference(legacyRow.id),
        agreed_total_amount: null,
        confirmed_at: null,
        confirmed_by: null,
        payments: paymentRows,
        documents: [],
        financials: calculateBookingFinancials(null, paymentRows),
        payment_workflow_ready: false,
        final_agreement_id: null,
        final_agreement_version: null,
        final_agreement_history: [],
        final_services: normalizeRequestedFinalServices(legacyRow),
        service_catalogue: [],
      });
    }

    return classifyError(error.message, null);
  }

  if (!result.data) {
    return toReady(null);
  }

  const paymentRows = (payments.data ?? []) as AdminBookingDetail["payments"];
  const bookingRow = result.data as Omit<
    AdminBookingDetail,
    "payments" | "documents" | "financials"
  >;
  const agreementHistory = (agreements.data ?? []) as AdminBookingAgreement[];
  const agreement = agreementHistory.find((item) => item.is_current) ?? agreementHistory[0] ?? null;
  const requestedServices = normalizeRequestedFinalServices(bookingRow);
  const savedFinalServices = (finalServices.data ?? []) as AdminBookingFinalService[];

  return toReady({
    ...bookingRow,
    payments: paymentRows,
    documents: (documents.data ?? []) as AdminBookingDetail["documents"],
    financials: calculateBookingFinancials(bookingRow.agreed_total_amount, paymentRows),
    payment_workflow_ready: true,
    final_agreement_id: agreement?.id ?? null,
    final_agreement_version: agreement?.version ?? null,
    final_agreement_history: agreementHistory,
    final_services: savedFinalServices.length ? savedFinalServices : requestedServices,
    service_catalogue: buildServiceCatalogue(
      bookingRow,
      catalogueServices.data as Array<{
        id: string;
        name: string;
        description: string | null;
        supports_half_day: boolean | null;
      }> | null,
      cataloguePrices.data as Array<{
        service_id: string;
        event_type_id: string;
        event_type_size_id: string;
        duration: string;
        price_amount: number;
        currency: string;
        is_active: boolean;
      }> | null,
    ),
  });
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

  let confirmedBookingRows = bookings.data as unknown[] | null;
  let bookingsError = bookings.error;

  if (bookings.error && isBookingPaymentSchemaMissing(bookings.error)) {
    const legacyBookings = await client.supabase
      .from("bookings")
      .select(legacyBookingListSelect)
      .eq("status", "confirmed")
      .gte("event_date", fromDate)
      .lte("event_date", toDate)
      .order("event_date", { ascending: true });

    confirmedBookingRows = legacyBookings.data as unknown[] | null;
    bookingsError = legacyBookings.error;
  }

  const error = availability.error ?? bookingsError;

  if (error) {
    return classifyError(error.message, empty);
  }

  return toReady({
    availability: (availability.data as DateAvailability[] | null) ?? [],
    confirmedBookings: normalizeBookingRows(confirmedBookingRows),
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

export async function getAdminMerchandiseMediaData(): Promise<
  AdminDataResult<AdminMerchandiseMediaData>
> {
  const empty: AdminMerchandiseMediaData = {
    portfolioItems: [],
    merchandiseProducts: [],
    merchandiseRequests: [],
  };
  const client = await getAdminClient(empty);

  if (!client.ok) {
    return client.result;
  }

  const [portfolio, merchandise, requests] = await Promise.all([
    client.supabase
      .from("portfolio_items")
      .select("id,title,slug,description,thumbnail_path,external_url,is_active,sort_order,created_at,updated_at")
      .order("sort_order")
      .order("created_at", { ascending: false }),
    client.supabase
      .from("merchandise_products")
      .select("id,name,slug,description,price_amount,currency,image_path,available_colours,available_sizes,is_active,sort_order,created_at,updated_at")
      .order("sort_order")
      .order("name"),
    client.supabase
      .from("merchandise_requests")
      .select("id,product_id,product_name_snapshot,product_price_amount_snapshot,currency,selected_colour,selected_size,quantity,customer_name,customer_phone,status,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const error = portfolio.error ?? merchandise.error ?? requests.error;

  if (error) {
    return classifyError(error.message, empty);
  }

  const merchandiseProducts = (merchandise.data as MerchandiseProduct[] | null) ?? [];
  const productImages = await getAdminMerchandiseProductImages(
    client.supabase,
    merchandiseProducts.map((product) => product.id),
  );

  return toReady({
    portfolioItems: (portfolio.data as PortfolioItem[] | null) ?? [],
    merchandiseProducts: attachMerchandiseImages(merchandiseProducts, productImages),
    merchandiseRequests: (requests.data as MerchandiseRequest[] | null) ?? [],
  });
}

async function getAdminMerchandiseProductImages(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  productIds: string[],
) {
  if (!supabase || !productIds.length) {
    return [];
  }

  const result = await supabase
    .from("merchandise_product_images")
    .select("id,product_id,colour,image_path,is_active,sort_order,created_at,updated_at")
    .in("product_id", productIds)
    .order("sort_order");

  if (result.error) {
    return [];
  }

  return (result.data as MerchandiseProductImage[] | null) ?? [];
}

function attachMerchandiseImages(
  products: MerchandiseProduct[],
  images: MerchandiseProductImage[],
) {
  return products.map((product) => ({
    ...product,
    images: images.filter((image) => image.product_id === product.id),
  }));
}
