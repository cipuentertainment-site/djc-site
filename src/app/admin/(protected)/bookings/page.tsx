import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BookingsFilterForm } from "@/components/admin/bookings-filter-form";
import { BookingsTable } from "@/components/admin/bookings-table";
import { EmptyState } from "@/components/admin/empty-state";
import { Pagination } from "@/components/admin/pagination";
import { getAdminBookings, getAdminConfigData } from "@/lib/supabase/admin-data";

type BookingsPageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
    eventTypeId?: string;
    county?: string;
    serviceId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
};

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const params = await searchParams;
  const [bookings, config] = await Promise.all([
    getAdminBookings(params),
    getAdminConfigData(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bookings"
        description="Search, filter, review, and update real booking requests from the database."
      />
      {bookings.status !== "ready" ? (
        <AdminAlert
          title="Booking data is protected"
          message={
            bookings.status === "not_configured"
              ? "Add Supabase environment variables first."
              : bookings.message
          }
        />
      ) : null}
      <BookingsFilterForm config={config.data} values={params} />
      {bookings.data.bookings.length ? (
        <div className="space-y-4">
          <BookingsTable bookings={bookings.data.bookings} />
          <Pagination
            page={bookings.data.page}
            pageSize={bookings.data.pageSize}
            total={bookings.data.total}
            basePath="/admin/bookings"
            searchParams={params}
          />
        </div>
      ) : (
        <EmptyState
          title="No bookings yet"
          description="No real booking records matched the current filters."
        />
      )}
    </div>
  );
}
