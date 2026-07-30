import {
  CalendarDays,
  Gauge,
  ListChecks,
  Music2,
  Settings,
  SlidersHorizontal,
  Tags,
} from "lucide-react";

import type { AdminNavItem } from "@/types/admin";

export const adminNavItems: AdminNavItem[] = [
  { title: "Dashboard", href: "/admin", icon: Gauge },
  { title: "Bookings", href: "/admin/bookings", icon: ListChecks },
  { title: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { title: "Event Types", href: "/admin/event-types", icon: Tags },
  { title: "Services", href: "/admin/services", icon: Music2 },
  { title: "Pricing", href: "/admin/pricing", icon: SlidersHorizontal },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];
