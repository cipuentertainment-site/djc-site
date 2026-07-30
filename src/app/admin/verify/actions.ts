"use server";

import { redirect } from "next/navigation";

import {
  clearAdminVerifiedSession,
  setAdminVerifiedSession,
} from "@/lib/auth/admin-session";
import { getAuthenticatedAdmin } from "@/lib/auth/admin";
import { adminSessionSecret } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VerifyActionResult = {
  ok: false;
  message: string;
};

export async function verifyAdminPasswordAction(
  password: string,
): Promise<VerifyActionResult> {
  if (!password) {
    return { ok: false, message: "Enter your admin password." };
  }

  if (!adminSessionSecret) {
    return {
      ok: false,
      message: "ADMIN_SESSION_SECRET is not configured.",
    };
  }

  const auth = await getAuthenticatedAdmin();

  if (auth.status === "not_configured") {
    return { ok: false, message: "Supabase environment variables are not configured." };
  }

  if (auth.status === "no_session") {
    redirect("/admin/login?error=session-expired");
  }

  if (auth.status === "unauthorized") {
    redirect("/admin/access-denied");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { ok: false, message: "Supabase environment variables are not configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: auth.admin.email,
    password,
  });

  if (error) {
    await clearAdminVerifiedSession();
    return { ok: false, message: "The password was not accepted." };
  }

  await setAdminVerifiedSession({
    userId: auth.admin.userId,
    email: auth.admin.email,
    verifiedAt: Date.now(),
  });

  redirect("/admin");
}
