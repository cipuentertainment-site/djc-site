import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type AdminAlertProps = {
  title: string;
  message?: string;
};

export function AdminAlert({ title, message }: AdminAlertProps) {
  return (
    <Card>
      <CardContent className="flex gap-3 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
        <div>
          <p className="font-medium">{title}</p>
          {message ? <p className="mt-1 text-muted-foreground">{message}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
