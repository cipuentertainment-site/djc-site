"use client";

import { Check, X } from "lucide-react";

import { changeBookingStatusAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import { BookingConfirmationDialog } from "@/components/admin/booking-confirmation-dialog";
import type { AdminBookingDetail } from "@/types/admin-data";

type BookingStatusActionsProps = {
  booking: AdminBookingDetail;
};

export function BookingStatusActions({ booking }: BookingStatusActionsProps) {
  if (booking.status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <BookingConfirmationDialog booking={booking} />
        <ActionButton
          size="sm"
          variant="outline"
          action={() => changeBookingStatusAction(booking.id, "rejected")}
        >
          <X className="h-4 w-4" />
          Reject
        </ActionButton>
      </div>
    );
  }

  if (booking.status === "confirmed") {
    return (
      <ActionButton
        size="sm"
        variant="secondary"
        action={() => changeBookingStatusAction(booking.id, "completed")}
      >
        <Check className="h-4 w-4" />
        Complete
      </ActionButton>
    );
  }

  return <p className="text-sm text-muted-foreground">No actions available.</p>;
}
