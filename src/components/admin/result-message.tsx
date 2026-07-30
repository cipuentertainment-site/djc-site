"use client";

import type { AdminActionResult } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type ResultMessageProps = {
  result?: AdminActionResult;
};

export function ResultMessage({ result }: ResultMessageProps) {
  if (!result) {
    return null;
  }

  return (
    <p
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        result.ok
          ? "bg-primary/10 text-primary"
          : "bg-destructive/10 text-destructive",
      )}
    >
      {result.message}
    </p>
  );
}
