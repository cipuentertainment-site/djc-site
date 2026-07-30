"use client";

import { useState, useTransition } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import type { AdminActionResult } from "@/app/admin/actions";

type ActionButtonProps = ButtonProps & {
  action: () => Promise<AdminActionResult>;
  pendingLabel?: string;
};

export function ActionButton({
  action,
  children,
  pendingLabel = "Working...",
  ...props
}: ActionButtonProps) {
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-1">
      <Button
        {...props}
        disabled={isPending || props.disabled}
        onClick={() => {
          setMessage(undefined);
          startTransition(async () => {
            const result = await action();
            setMessage(result.message);
          });
        }}
      >
        {isPending ? pendingLabel : children}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
