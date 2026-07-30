import { Badge } from "@/components/ui/badge";
import type { BookingStatus } from "@/types/admin-data";

type StatusBadgeProps = {
  status: BookingStatus | string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === "confirmed"
      ? "default"
      : status === "pending"
        ? "secondary"
        : status === "completed"
          ? "outline"
          : "muted";

  return <Badge variant={variant}>{status}</Badge>;
}
