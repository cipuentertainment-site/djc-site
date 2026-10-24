import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

const visitorCookieName = "djc_visitor_id";
const visitorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST() {
  const cookieStore = await cookies();
  const existingVisitorId = cookieStore.get(visitorCookieName)?.value;
  const visitorId = existingVisitorId && visitorIdPattern.test(existingVisitorId)
    ? existingVisitorId
    : randomUUID();
  const supabase = createSupabaseAdminClient();

  if (supabase) {
    const { error } = await supabase.from("website_visitors").upsert(
      {
        visitor_id: visitorId,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "visitor_id" },
    );

    if (error) {
      console.error("Unable to record website visitor:", error.message);
    }
  }

  const response = new NextResponse(null, { status: 204 });

  if (!existingVisitorId || !visitorIdPattern.test(existingVisitorId)) {
    response.cookies.set(visitorCookieName, visitorId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return response;
}
