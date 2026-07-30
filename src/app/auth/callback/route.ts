import { NextResponse, type NextRequest } from "next/server";

import { clearAdminVerifiedSession } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/admin/verify";
  const baseUrl = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/admin/login?error=missing-code`);
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(`${baseUrl}/admin/login?error=missing-config`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${baseUrl}/admin/login?error=callback`);
  }

  await clearAdminVerifiedSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(`${baseUrl}/admin/login?error=session`);
  }

  const profile = await supabase.rpc("get_current_admin_profile");

  if (profile.error || !profile.data?.length) {
    return NextResponse.redirect(`${baseUrl}/admin/access-denied`);
  }

  return NextResponse.redirect(`${baseUrl}${next}`);
}
