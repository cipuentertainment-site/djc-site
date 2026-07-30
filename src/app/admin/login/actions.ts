"use server";

import { appUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionResult = {
  ok: boolean;
  message: string;
};

export async function sendAdminMagicLinkAction(
  email: string,
): Promise<LoginActionResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      ok: false,
      message: "Supabase environment variables are not configured.",
    };
  }

  const authorization = await supabase.rpc("is_authorized_admin_email", {
    candidate_email: cleanEmail,
  });

  if (authorization.error || authorization.data !== true) {
    return {
      ok: false,
      message: "You are not authorized to access the admin portal.",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/admin/verify`,
      shouldCreateUser: false,
    },
  });

  if (error) {
    return {
      ok: false,
      message: "Unable to send the magic link. Check the email and try again.",
    };
  }

  return {
    ok: true,
    message: "Check your email for the admin magic link.",
  };
}
