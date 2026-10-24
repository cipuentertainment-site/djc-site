"use client";

import { useEffect } from "react";

export function VisitorTracker() {
  useEffect(() => {
    void fetch("/api/visitor", {
      method: "POST",
      cache: "no-store",
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
