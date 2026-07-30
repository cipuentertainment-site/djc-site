import { redirect } from "next/navigation";

import { getAdminVerifiedSession } from "@/lib/auth/admin-session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthorizedAdmin = {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
};

export async function getAuthenticatedAdmin() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "not_configured" as const };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { status: "no_session" as const };
  }

  const profile = await supabase.rpc("get_current_admin_profile");

  if (profile.error || !profile.data?.length) {
    return { status: "unauthorized" as const, email: user.email };
  }

  const adminProfile = profile.data[0] as {
    user_id: string;
    email: string;
    display_name: string | null;
    role: string;
  };

  return {
    status: "authorized" as const,
    admin: {
      userId: adminProfile.user_id,
      email: adminProfile.email,
      displayName: adminProfile.display_name,
      role: adminProfile.role,
    } satisfies AuthorizedAdmin,
  };
}

export async function requireAdmin() {
  const auth = await getAuthenticatedAdmin();

  if (auth.status === "not_configured" || auth.status === "no_session") {
    redirect("/admin/login");
  }

  if (auth.status === "unauthorized") {
    redirect("/admin/access-denied");
  }

  const verified = await getAdminVerifiedSession();

  if (
    !verified ||
    verified.userId !== auth.admin.userId ||
    verified.email.toLowerCase() !== auth.admin.email.toLowerCase()
  ) {
    redirect("/admin/verify");
  }

  return auth.admin;
}

export async function requireAdminAction() {
  const auth = await getAuthenticatedAdmin();

  if (auth.status === "not_configured") {
    return {
      ok: false as const,
      message: "Supabase environment variables are not configured.",
    };
  }

  if (auth.status === "no_session") {
    return { ok: false as const, message: "Admin login is required." };
  }

  if (auth.status === "unauthorized") {
    return {
      ok: false as const,
      message: "You are not authorized to access the admin portal.",
    };
  }

  const verified = await getAdminVerifiedSession();

  if (
    !verified ||
    verified.userId !== auth.admin.userId ||
    verified.email.toLowerCase() !== auth.admin.email.toLowerCase()
  ) {
    return {
      ok: false as const,
      message: "Admin password verification is required.",
    };
  }

  return { ok: true as const, admin: auth.admin };
}
