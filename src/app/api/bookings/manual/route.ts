import { NextResponse } from "next/server";

import {
  createBookingFromPayload,
  validateBookingForManualSubmission,
} from "@/lib/payments/booking-payload";

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

  const created = await createBookingFromPayload(validated.data.bookingPayload, {
    reservationFeePaymentStatus: "pending",
    rejectRecentDuplicate: true,
  });

  if (!created.ok) {
    if ("duplicate" in created && created.duplicate) {
      return NextResponse.json(
        { ok: false, message: created.message },
        { status: 409 },
      );
    }

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
