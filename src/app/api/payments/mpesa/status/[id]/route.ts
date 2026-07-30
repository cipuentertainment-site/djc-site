import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

type StatusRouteProps = {
  params: Promise<{
    id: string;
  }>;
};

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
    .select("id,status,booking_id,result_description")
    .eq("id", id)
    .single();

  if (payment.error || !payment.data) {
    return NextResponse.json({ ok: false, message: "Payment not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: payment.data.status,
    bookingId: payment.data.booking_id,
    message: payment.data.result_description,
  });
}
