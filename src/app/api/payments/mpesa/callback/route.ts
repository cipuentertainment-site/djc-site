import { NextResponse } from "next/server";

import { finalizeBookingFromPayment } from "@/lib/payments/booking-payload";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

type DarajaCallback = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: {
        Item?: Array<{
          Name?: string;
          Value?: string | number;
        }>;
      };
    };
  };
};

function getMetadataValue(callback: NonNullable<DarajaCallback["Body"]>["stkCallback"], name: string) {
  return callback?.CallbackMetadata?.Item?.find((item) => item.Name === name)?.Value;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as DarajaCallback | null;
  const callback = payload?.Body?.stkCallback;

  if (!callback?.CheckoutRequestID) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const payment = await supabase
    .from("reservation_payments")
    .select("id,status,booking_id")
    .eq("checkout_request_id", callback.CheckoutRequestID)
    .maybeSingle();

  if (payment.error || !payment.data) {
    console.warn("M-Pesa callback received for unknown checkout request.", {
      checkoutRequestId: callback.CheckoutRequestID,
      hasError: Boolean(payment.error),
    });

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const receipt = getMetadataValue(callback, "MpesaReceiptNumber");
  const status = callback.ResultCode === 0 ? "success" : "failed";
  const update = await supabase
    .from("reservation_payments")
    .update({
      status,
      merchant_request_id: callback.MerchantRequestID,
      checkout_request_id: callback.CheckoutRequestID,
      mpesa_receipt_number: receipt ? String(receipt) : null,
      result_code: callback.ResultCode,
      result_description: callback.ResultDesc,
      callback_payload: payload,
      paid_at:
        callback.ResultCode === 0
          ? new Date().toISOString()
          : null,
    })
    .eq("id", payment.data.id);

  if (update.error) {
    console.error("M-Pesa callback could not update payment record.", {
      paymentId: payment.data.id,
      checkoutRequestId: callback.CheckoutRequestID,
      message: update.error.message,
    });
  }

  if (!update.error && callback.ResultCode === 0 && !payment.data.booking_id) {
    const finalized = await finalizeBookingFromPayment(payment.data.id);

    if (!finalized.ok) {
      console.error("M-Pesa callback payment succeeded but booking was not finalized.", {
        paymentId: payment.data.id,
        message: finalized.message,
      });
    }
  }

  if (!update.error && callback.ResultCode === 0 && payment.data.booking_id && receipt) {
    await supabase
      .from("bookings")
      .update({ reservation_fee_payment_reference: String(receipt) })
      .eq("id", payment.data.booking_id);
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
