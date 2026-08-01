"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical, Save } from "lucide-react";

import {
  reorderServicesAction,
  type AdminActionResult,
} from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PublicService } from "@/types/booking";

type ServiceOrderManagerProps = {
  services: PublicService[];
};

export function ServiceOrderManager({ services }: ServiceOrderManagerProps) {
  const initialIds = useMemo(() => services.map((service) => service.id), [services]);
  const [orderedIds, setOrderedIds] = useState(initialIds);
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();
  const servicesById = new Map(services.map((service) => [service.id, service]));
  const hasChanges = orderedIds.join(",") !== initialIds.join(",");

  function move(id: string, direction: -1 | 1) {
    setResult(undefined);
    setOrderedIds((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function saveOrder() {
    startTransition(async () => {
      const actionResult = await reorderServicesAction(orderedIds);
      setResult(actionResult);
    });
  }

  if (!services.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage service order</CardTitle>
        <CardDescription>
          Arrange the services by importance. This order controls the homepage service presets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {orderedIds.map((id, index) => {
            const service = servicesById.get(id);

            if (!service) {
              return null;
            }

            return (
              <div
                key={id}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border bg-card p-3",
                  service.is_active === false && "opacity-60",
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Position {index + 1}
                    {service.is_active === false ? " - inactive" : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => move(id, -1)}
                    disabled={index === 0 || isPending}
                    aria-label={`Move ${service.name} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => move(id, 1)}
                    disabled={index === orderedIds.length - 1 || isPending}
                    aria-label={`Move ${service.name} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <ResultMessage result={result} />
        <Button onClick={saveOrder} disabled={isPending || !hasChanges}>
          <Save className="h-4 w-4" />
          {isPending ? "Saving order..." : "Save order"}
        </Button>
      </CardContent>
    </Card>
  );
}
