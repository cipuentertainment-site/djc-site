import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function DateInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  return <Input type="date" className={cn("min-w-40", className)} {...props} />;
}
