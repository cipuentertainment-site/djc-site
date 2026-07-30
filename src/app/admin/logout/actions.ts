"use server";

import { redirect } from "next/navigation";

import { clearAdminVerifiedSession } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logoutAdminAction() {
  const supabase = await createSupabaseServerClient();

  await clearAdminVerifiedSession();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/admin/login");
}
