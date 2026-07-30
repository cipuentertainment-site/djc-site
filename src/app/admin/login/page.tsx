import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedAdmin } from "@/lib/auth/admin";
import { getAdminVerifiedSession } from "@/lib/auth/admin-session";

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  const auth = await getAuthenticatedAdmin();

  if (auth.status === "authorized") {
    const verified = await getAdminVerifiedSession();

    if (
      verified &&
      verified.userId === auth.admin.userId &&
      verified.email.toLowerCase() === auth.admin.email.toLowerCase()
    ) {
      redirect("/admin");
    }

    redirect("/admin/verify");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Portal</CardTitle>
          <CardDescription>
            Enter your authorized admin email to receive a magic link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Your session could not be verified. Please request a new magic link.
            </p>
          ) : null}
          <AdminLoginForm />
          <Link
            href="/"
            className="block text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Back to website
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
