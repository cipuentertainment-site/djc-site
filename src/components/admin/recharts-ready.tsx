"use client";

import { ResponsiveContainer } from "recharts";

import { Badge } from "@/components/ui/badge";

export function RechartsReady() {
  const isAvailable = Boolean(ResponsiveContainer);

  return (
    <Badge variant={isAvailable ? "default" : "muted"}>
      Recharts {isAvailable ? "ready" : "unavailable"}
    </Badge>
  );
}
