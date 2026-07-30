import Link from "next/link";
import { format } from "date-fns";
import { Eye } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import type { AdminBookingListItem } from "@/types/admin-data";

type BookingsTableProps = {
  bookings: AdminBookingListItem[];
  compact?: boolean;
};

export function BookingsTable({ bookings, compact = false }: BookingsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Customer</TableHead>
          {!compact ? <TableHead>Phone</TableHead> : null}
          <TableHead>Event</TableHead>
          <TableHead>Date</TableHead>
          {!compact ? <TableHead>Services</TableHead> : null}
          {!compact ? <TableHead>Location</TableHead> : null}
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((booking) => (
          <TableRow key={booking.id}>
            <TableCell>
              <div className="font-medium">{booking.customer_name}</div>
              {compact ? (
                <div className="text-xs text-muted-foreground">{booking.customer_phone}</div>
              ) : null}
            </TableCell>
            {!compact ? <TableCell>{booking.customer_phone}</TableCell> : null}
            <TableCell>
              <div>{booking.event_type_name_snapshot}</div>
              <div className="text-xs capitalize text-muted-foreground">
                {booking.event_size_label_snapshot} · {booking.attendee_count} attendees
              </div>
            </TableCell>
            <TableCell>{format(new Date(booking.event_date), "MMM d, yyyy")}</TableCell>
            {!compact ? (
              <TableCell>
                {booking.booking_services
                  .map((service) => service.service_name_snapshot)
                  .join(", ") || "None"}
              </TableCell>
            ) : null}
            {!compact ? (
              <TableCell>
                <div>{booking.county}</div>
                <div className="text-xs text-muted-foreground">{booking.location_text}</div>
              </TableCell>
            ) : null}
            <TableCell>
              <StatusBadge status={booking.status} />
            </TableCell>
            <TableCell>
              {formatMoney(booking.estimated_service_total_amount, booking.currency)}
            </TableCell>
            <TableCell>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/bookings/${booking.id}`}>
                  <Eye className="h-4 w-4" />
                  View
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
