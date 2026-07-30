import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminVerifyForm } from "@/components/admin/admin-verify-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedAdmin } from "@/lib/auth/admin";
import { getAdminVerifiedSession } from "@/lib/auth/admin-session";

export default async function AdminVerifyPage() {
  const auth = await getAuthenticatedAdmin();

  if (auth.status === "not_configured" || auth.status === "no_session") {
    redirect("/admin/login");
  }

  if (auth.status === "unauthorized") {
    redirect("/admin/access-denied");
  }

  const verified = await getAdminVerifiedSession();

  if (
    verified &&
    verified.userId === auth.admin.userId &&
    verified.email.toLowerCase() === auth.admin.email.toLowerCase()
  ) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Verification</CardTitle>
          <CardDescription>
            Email identity verified for {auth.admin.email}. Enter your admin password
            to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminVerifyForm />
          <Link
            href="/admin/login"
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Use another email
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
