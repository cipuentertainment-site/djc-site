import { NextResponse } from "next/server";

import { normalizeKenyanPhone } from "@/lib/mpesa/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { merchandiseRequestSchema } from "@/lib/validations/merchandise";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const requestBuckets = new Map<string, RateLimitBucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 6;

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const existing = requestBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  existing.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!checkRateLimit(`ip:${getClientIp(request)}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests. Please wait a few minutes." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = merchandiseRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Check the request details and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const phone = normalizeKenyanPhone(parsed.data.customerPhone);

  if (!phone) {
    return NextResponse.json(
      { ok: false, message: "Enter a valid Phone / WhatsApp number." },
      { status: 400 },
    );
  }

  if (!checkRateLimit(`phone:${phone}`)) {
    return NextResponse.json(
      { ok: false, message: "Too many requests for this phone number." },
      { status: 429 },
    );
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, message: "Request server is not configured." },
      { status: 500 },
    );
  }

  const product = await supabase
    .from("merchandise_products")
    .select("id,name,price_amount,currency,available_colours,is_active")
    .eq("id", parsed.data.productId)
    .single();

  if (product.error || !product.data || !product.data.is_active) {
    return NextResponse.json(
      { ok: false, message: "This merchandise item is not available." },
      { status: 404 },
    );
  }

  const selectedColour = parsed.data.selectedColour?.trim() || null;
  const colours = (product.data.available_colours ?? []) as string[];

  if (colours.length && (!selectedColour || !colours.includes(selectedColour))) {
    return NextResponse.json(
      { ok: false, message: "Select an available colour." },
      { status: 400 },
    );
  }

  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const duplicate = await supabase
    .from("merchandise_requests")
    .select("id")
    .eq("product_id", product.data.id)
    .eq("customer_phone", phone)
    .gte("created_at", since)
    .limit(1);

  if (duplicate.error) {
    return NextResponse.json(
      { ok: false, message: "Could not verify recent requests." },
      { status: 500 },
    );
  }

  if (duplicate.data?.length) {
    return NextResponse.json(
      { ok: false, message: "This request was already sent recently." },
      { status: 409 },
    );
  }

  const result = await supabase
    .from("merchandise_requests")
    .insert({
      product_id: product.data.id,
      product_name_snapshot: product.data.name,
      product_price_amount_snapshot: product.data.price_amount,
      currency: product.data.currency,
      selected_colour: selectedColour,
      quantity: parsed.data.quantity,
      customer_name: parsed.data.customerName.trim(),
      customer_phone: phone,
      status: "new",
    })
    .select("id")
    .single();

  if (result.error) {
    return NextResponse.json(
      { ok: false, message: "Could not submit the merchandise request." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    requestId: result.data.id,
    message: "Request received. DJC Entertainment will contact you.",
  });
}
