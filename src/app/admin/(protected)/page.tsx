import Link from "next/link";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BookingsTable } from "@/components/admin/bookings-table";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/supabase/admin-data";

type DashboardPageProps = {
  searchParams: Promise<{
    range?: string;
  }>;
};

export default async function AdminDashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const range = [7, 30, 90].includes(Number(params.range))
    ? Number(params.range)
    : 30;
  const dashboard = await getAdminDashboardData(range);
  const { data } = dashboard;
  const stats = [
    ["Pending Bookings", data.stats.pending],
    ["Confirmed Bookings", data.stats.confirmed],
    ["Completed Bookings", data.stats.completed],
    ["Rejected Bookings", data.stats.rejected],
    ["Upcoming Events", data.stats.upcoming],
    ["Today's Events", data.stats.today],
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Real booking counts, recent requests, and lightweight analytics from Supabase."
        actions={
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                asChild
                variant={range === days ? "default" : "outline"}
                size="sm"
              >
                <Link href={`/admin?range=${days}`}>{days} days</Link>
              </Button>
            ))}
          </div>
        }
      />

      {dashboard.status !== "ready" ? (
        <AdminAlert
          title={
            dashboard.status === "not_configured"
              ? "Supabase is not configured"
              : "Admin data is protected"
          }
          message={
            dashboard.status === "not_configured"
              ? "Add Supabase environment variables to load admin data."
              : dashboard.message
          }
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="p-4">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-3xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <DashboardCharts data={data} />

      <Card>
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
          <CardDescription>Latest real booking requests from the database.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentBookings.length ? (
            <BookingsTable bookings={data.recentBookings} compact />
          ) : (
            <EmptyState
              title="No bookings yet"
              description="Recent bookings will appear here after real customer requests exist."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
