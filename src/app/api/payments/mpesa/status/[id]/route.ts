import { NextResponse } from "next/server";

import { queryStkPush } from "@/lib/mpesa/daraja";
import { finalizeBookingFromPayment } from "@/lib/payments/booking-payload";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

type StatusRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

function isStillProcessing(resultCode: number, resultDescription: string) {
  return (
    resultCode === 4999 ||
    resultDescription.toLowerCase().includes("still under processing") ||
    resultDescription.toLowerCase().includes("being processed")
  );
}

export async function GET(_request: Request, { params }: StatusRouteProps) {
  const { id } = await params;
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Payment server is not configured." },
      { status: 500 },
    );
  }

  const payment = await supabase
    .from("reservation_payments")
    .select("id,status,booking_id,result_code,result_description,checkout_request_id,merchant_request_id,internal_reference,mpesa_receipt_number")
    .eq("id", id)
    .single();

  if (payment.error || !payment.data) {
    return NextResponse.json({ ok: false, message: "Payment not found." }, { status: 404 });
  }

  const canReconcile =
    payment.data.status === "pending" ||
    (payment.data.status === "failed" && payment.data.result_code === 4999);

  if (canReconcile && payment.data.checkout_request_id) {
    const mpesaStatus = await queryStkPush(payment.data.checkout_request_id);

    if (mpesaStatus.ok && mpesaStatus.resultCode === 0) {
      const update = await supabase
        .from("reservation_payments")
        .update({
          status: "success",
          merchant_request_id:
            mpesaStatus.merchantRequestId ?? payment.data.merchant_request_id,
          checkout_request_id:
            mpesaStatus.checkoutRequestId ?? payment.data.checkout_request_id,
          result_code: mpesaStatus.resultCode,
          result_description: mpesaStatus.resultDescription,
          paid_at: new Date().toISOString(),
        })
        .eq("id", payment.data.id);

      if (!update.error) {
        const finalized = await finalizeBookingFromPayment(payment.data.id);

        return NextResponse.json({
          ok: true,
          status: "success",
          bookingId: finalized.ok ? finalized.bookingId : null,
          paymentReference: payment.data.internal_reference,
          paymentReceipt: payment.data.mpesa_receipt_number,
          message: finalized.ok
            ? "Payment confirmed."
            : "Payment confirmed, but booking finalization needs attention.",
        });
      }
    }

    if (mpesaStatus.ok && mpesaStatus.resultCode !== 0) {
      if (isStillProcessing(mpesaStatus.resultCode, mpesaStatus.resultDescription)) {
        if (payment.data.status !== "pending") {
          await supabase
            .from("reservation_payments")
            .update({
              status: "pending",
              result_code: mpesaStatus.resultCode,
              result_description: mpesaStatus.resultDescription,
            })
            .eq("id", payment.data.id);
        }

        return NextResponse.json({
          ok: true,
          status: "pending",
          bookingId: payment.data.booking_id,
          paymentReference: payment.data.internal_reference,
          paymentReceipt: payment.data.mpesa_receipt_number,
          message: "Transaction is still being processed by M-Pesa.",
        });
      }

      const update = await supabase
        .from("reservation_payments")
        .update({
          status: "failed",
          result_code: mpesaStatus.resultCode,
          result_description: mpesaStatus.resultDescription,
        })
        .eq("id", payment.data.id)
        .select("id,status,booking_id,result_description")
        .single();

      if (!update.error && update.data) {
        return NextResponse.json({
          ok: true,
          status: update.data.status,
          bookingId: update.data.booking_id,
          paymentReference: payment.data.internal_reference,
          paymentReceipt: payment.data.mpesa_receipt_number,
          message: update.data.result_description,
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    status: payment.data.status,
    bookingId: payment.data.booking_id,
    paymentReference: payment.data.internal_reference,
    paymentReceipt: payment.data.mpesa_receipt_number,
    message: payment.data.result_description,
  });
}
