import { NextResponse } from "next/server";

import {
  createBookingFromPayload,
  type ValidatedBookingPayload,
  validateBookingForManualSubmission,
} from "@/lib/payments/booking-payload";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const submissionBuckets = new Map<string, RateLimitBucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const existing = submissionBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    submissionBuckets.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return true;
  }

  if (existing.count >= MAX_SUBMISSIONS_PER_WINDOW) {
    return false;
  }

  existing.count += 1;
  return true;
}

async function hasRecentDuplicate(
  payload: ValidatedBookingPayload["bookingPayload"],
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return { ok: false, message: "Booking server is not configured." };
  }

  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const duplicate = await supabase
    .from("bookings")
    .select("id")
    .eq("customer_phone", payload.customerPhone)
    .eq("event_date", payload.eventDate)
    .eq("event_type_id", payload.eventTypeId)
    .gte("created_at", since)
    .limit(1);

  if (duplicate.error) {
    return { ok: false, message: "Could not verify recent submissions." };
  }

  return { ok: true, duplicate: Boolean(duplicate.data?.length) };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (!checkRateLimit(`ip:${ip}`)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many booking requests. Please wait a few minutes and try again.",
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const validated = await validateBookingForManualSubmission(body);

  if (!validated.ok) {
    return NextResponse.json({ ok: false, message: validated.message }, { status: 400 });
  }

  if (!checkRateLimit(`phone:${validated.data.bookingPayload.customerPhone}`)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many booking requests for this phone number. Please try again later.",
      },
      { status: 429 },
    );
  }

  const duplicate = await hasRecentDuplicate(validated.data.bookingPayload);

  if (!duplicate.ok) {
    return NextResponse.json(
      { ok: false, message: duplicate.message },
      { status: 500 },
    );
  }

  if (duplicate.duplicate) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "This booking request was already submitted recently. Please wait before sending it again.",
      },
      { status: 409 },
    );
  }

  const created = await createBookingFromPayload(validated.data.bookingPayload, {
    reservationFeePaymentStatus: "pending",
  });

  if (!created.ok) {
    return NextResponse.json(
      { ok: false, message: "Could not submit the booking request." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    bookingId: created.bookingId,
    message: "Booking request received. DJC Entertainment will contact you to confirm.",
  });
}
