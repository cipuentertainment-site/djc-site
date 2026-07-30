import Link from "next/link";
import { addDays, format } from "date-fns";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DateBlockForm } from "@/components/admin/date-block-form";
import { EmptyState } from "@/components/admin/empty-state";
import { UnblockDateButton } from "@/components/admin/unblock-date-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getActiveDateBlocks,
  getAdminCalendarData,
} from "@/lib/supabase/admin-data";

type CalendarPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const fromDate = params.from ?? format(new Date(), "yyyy-MM-dd");
  const toDate = params.to ?? format(addDays(new Date(fromDate), 29), "yyyy-MM-dd");
  const [calendar, blocks] = await Promise.all([
    getAdminCalendarData(fromDate, toDate),
    getActiveDateBlocks(),
  ]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Calendar"
        description="Capacity is based on confirmed bookings, not pending requests. Manual blocks are separate from full capacity."
      />

      {calendar.status !== "ready" ? (
        <AdminAlert
          title="Calendar booking details are protected"
          message={
            calendar.status === "not_configured"
              ? "Add Supabase environment variables first."
              : calendar.message
          }
        />
      ) : null}

      <DateBlockForm />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {calendar.data.availability.length ? (
          calendar.data.availability.map((day) => {
            const bookings = calendar.data.confirmedBookings.filter(
              (booking) => booking.event_date === day.event_date,
            );
            const remaining = Math.max(
              day.maximum_events_per_day - day.confirmed_count,
              0,
            );

            return (
              <Card key={day.event_date}>
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{format(new Date(day.event_date), "MMM d")}</CardTitle>
                      <CardDescription>
                        {day.confirmed_count} / {day.maximum_events_per_day} events
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        day.is_blocked
                          ? "destructive"
                          : day.is_available
                            ? "default"
                            : "muted"
                      }
                    >
                      {day.is_blocked ? "Blocked" : day.is_available ? "Available" : "Full"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4 pt-0 text-sm">
                  <p className="text-muted-foreground">Remaining: {remaining}</p>
                  {day.block_reason ? (
                    <p className="rounded-md bg-muted p-2">{day.block_reason}</p>
                  ) : null}
                  {bookings.length ? (
                    <ol className="space-y-2">
                      {bookings.map((booking) => (
                        <li key={booking.id}>
                          <Button asChild variant="ghost" className="h-auto justify-start px-0">
                            <Link href={`/admin/bookings/${booking.id}`}>
                              {booking.event_type_name_snapshot} - {booking.customer_name}
                            </Link>
                          </Button>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-muted-foreground">No confirmed bookings.</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <EmptyState
            title="No calendar data"
            description="Calendar availability will appear after Supabase is configured and reachable."
          />
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Active manual blocks</CardTitle>
          <CardDescription>Blocked dates are unavailable even when capacity remains.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {blocks.status !== "ready" ? (
            <AdminAlert
              title="Date blocks are protected"
              message={
                blocks.status === "not_configured"
                  ? "Add Supabase environment variables first."
                  : blocks.message
              }
            />
          ) : blocks.data.length ? (
            blocks.data.map((block) => (
              <div
                key={block.id}
                className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(block.event_date), "MMMM d, yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {block.reason || "No reason provided"}
                  </p>
                </div>
                <UnblockDateButton blockId={block.id} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No manually blocked dates.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
