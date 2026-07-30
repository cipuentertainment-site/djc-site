import Link from "next/link";
import { format } from "date-fns";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { BookingStatusActions } from "@/components/admin/booking-status-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { getAdminBookingDetail } from "@/lib/supabase/admin-data";

type BookingDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;
  const booking = await getAdminBookingDetail(id);

  if (booking.status !== "ready") {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Booking details"
          description="Detailed booking view with historical price snapshots."
        />
        <AdminAlert
          title="Booking data is protected"
          message={
            booking.status === "not_configured"
              ? "Add Supabase environment variables first."
              : booking.message
          }
        />
      </div>
    );
  }

  if (!booking.data) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Booking not found" description="No matching booking record exists." />
        <Button asChild variant="outline">
          <Link href="/admin/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }

  const item = booking.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${item.customer_name} booking`}
        description="Historical pricing shown here is the snapshot saved at booking time."
        actions={<StatusBadge status={item.status} />}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{item.customer_name}</p>
            <p className="text-muted-foreground">{item.customer_phone}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{item.event_type_name_snapshot}</p>
            <p className="capitalize text-muted-foreground">
              {item.event_size_label_snapshot} · {item.attendee_count} attendees
            </p>
            <p>{format(new Date(item.event_date), "MMMM d, yyyy")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{item.county}</p>
            <p className="text-muted-foreground">{item.location_text}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services and price snapshot</CardTitle>
          <CardDescription>These values are not recalculated from current pricing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Price at booking time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.booking_services.map((service) => (
                <TableRow key={service.service_name_snapshot}>
                  <TableCell>{service.service_name_snapshot}</TableCell>
                  <TableCell>
                    {formatMoney(service.price_amount_snapshot, service.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Estimated service total:{" "}
              <span className="font-medium">
                {formatMoney(item.estimated_service_total_amount, item.currency)}
              </span>
            </p>
            <p>
              Reservation fee:{" "}
              <span className="font-medium">
                {formatMoney(item.reservation_fee_amount, item.currency)}
              </span>
            </p>
            <p>Transport: Quoted separately</p>
            <p className="text-muted-foreground">{item.transport_disclaimer_snapshot}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status management</CardTitle>
            <CardDescription>Only valid workflow transitions are shown.</CardDescription>
          </CardHeader>
          <CardContent>
            <BookingStatusActions bookingId={item.id} status={item.status} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
