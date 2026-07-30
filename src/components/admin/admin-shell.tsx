"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, UserCircle } from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";
import { adminNavItems } from "@/components/admin/nav-items";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { AuthorizedAdmin } from "@/lib/auth/admin";

type AdminShellProps = {
  children: React.ReactNode;
  admin: AuthorizedAdmin;
};

export function AdminShell({ children, admin }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card lg:flex lg:flex-col">
        <div className="border-b px-6 py-5">
          <Link href="/admin" className="text-lg font-semibold">
            DJC Admin
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">Event services</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="mb-2 flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            <UserCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="truncate">{admin.displayName ?? admin.email}</span>
          </div>
          <LogoutButton />
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:px-8">
          <div>
            <p className="text-sm font-semibold lg:hidden">DJC Admin</p>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Admin workspace foundation
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                  Menu
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <UserCircle className="h-4 w-4" />
              <span className="max-w-56 truncate">{admin.email}</span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
