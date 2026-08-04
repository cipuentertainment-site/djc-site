import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { initiateStkPush } from "@/lib/mpesa/daraja";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { validateBookingForPayment } from "@/lib/payments/booking-payload";

function getInternalReference(body: unknown) {
  const attemptKey =
    typeof body === "object" &&
    body !== null &&
    "attemptKey" in body &&
    typeof body.attemptKey === "string" &&
    /^[a-zA-Z0-9-]{8,80}$/.test(body.attemptKey)
      ? body.attemptKey
      : randomUUID();

  return `DJC-${attemptKey}`;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const validated = await validateBookingForPayment(body);

  if (!validated.ok) {
    return NextResponse.json({ ok: false, message: validated.message }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const internalReference = getInternalReference(body);

  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Payment server is not configured." },
      { status: 500 },
    );
  }

  const payment = await supabase
    .from("reservation_payments")
    .insert({
      amount: validated.data.amount,
      currency: validated.data.currency,
      phone_number: validated.data.mpesaPhone,
      internal_reference: internalReference,
      booking_payload: validated.data.bookingPayload,
      terms_accepted_at: validated.data.bookingPayload.termsAcceptedAt,
      terms_version: validated.data.bookingPayload.termsVersion,
      privacy_notice_version: validated.data.bookingPayload.privacyNoticeVersion,
      status: "pending",
    })
    .select("id,internal_reference")
    .single();

  if (payment.error) {
    if (payment.error.code === "23505") {
      const existing = await supabase
        .from("reservation_payments")
        .select("id,status,result_description")
        .eq("internal_reference", internalReference)
        .single();

      if (!existing.error && existing.data) {
        return NextResponse.json({
          ok: true,
          paymentId: existing.data.id,
          status: existing.data.status,
          message:
            existing.data.result_description ??
            "Payment request already exists. Check your phone to complete it.",
        });
      }
    }

    return NextResponse.json(
      { ok: false, message: "Could not create payment request." },
      { status: 500 },
    );
  }

  const stk = await initiateStkPush({
    amount: validated.data.amount,
    phoneNumber: validated.data.mpesaPhone,
    accountReference: internalReference,
    transactionDescription: "Event reservation fee",
  });

  if (!stk.ok) {
    await supabase
      .from("reservation_payments")
      .update({ status: "failed", result_description: stk.message })
      .eq("id", payment.data.id);

    return NextResponse.json({ ok: false, message: stk.message }, { status: 502 });
  }

  const update = await supabase
    .from("reservation_payments")
    .update({
      merchant_request_id: stk.merchantRequestId,
      checkout_request_id: stk.checkoutRequestId,
      result_description: stk.responseDescription,
    })
    .eq("id", payment.data.id);

  if (update.error) {
    return NextResponse.json(
      { ok: false, message: "Could not store M-Pesa request details." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    paymentId: payment.data.id,
    status: "pending",
    message: stk.customerMessage,
  });
}
