"use client";

import { Check, X } from "lucide-react";

import { changeBookingStatusAction } from "@/app/admin/actions";
import { ActionButton } from "@/components/admin/action-button";
import type { BookingStatus } from "@/types/admin-data";

type BookingStatusActionsProps = {
  bookingId: string;
  status: BookingStatus;
};

export function BookingStatusActions({ bookingId, status }: BookingStatusActionsProps) {
  if (status === "pending") {
    return (
      <div className="flex flex-wrap gap-2">
        <ActionButton
          size="sm"
          action={() => changeBookingStatusAction(bookingId, "confirmed")}
        >
          <Check className="h-4 w-4" />
          Confirm
        </ActionButton>
        <ActionButton
          size="sm"
          variant="outline"
          action={() => changeBookingStatusAction(bookingId, "rejected")}
        >
          <X className="h-4 w-4" />
          Reject
        </ActionButton>
      </div>
    );
  }

  if (status === "confirmed") {
    return (
      <ActionButton
        size="sm"
        variant="secondary"
        action={() => changeBookingStatusAction(bookingId, "completed")}
      >
        <Check className="h-4 w-4" />
        Complete
      </ActionButton>
    );
  }

  return <p className="text-sm text-muted-foreground">No actions available.</p>;
}
