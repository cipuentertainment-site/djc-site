"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

const BOOKING_RESTORE_INTENT_STORAGE_KEY = "djc-entertainment-booking-restore-intent-v1";

export function ClearBookingRestoreIntentLink({
  href = "/",
  children = "Home",
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        window.localStorage.removeItem(BOOKING_RESTORE_INTENT_STORAGE_KEY);
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
