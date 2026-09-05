"use client";

import { useMemo, useState, useTransition } from "react";
import { Save, X } from "lucide-react";

import {
  saveHomepageServicesAction,
  type AdminActionResult,
} from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { PublicBookingSettings, PublicService } from "@/types/booking";

type ServiceOrderManagerProps = {
  services: PublicService[];
  settings: PublicBookingSettings | null;
};

const homepageSlotCount = 4;

export function ServiceOrderManager({ services, settings }: ServiceOrderManagerProps) {
  const activeServices = useMemo(
    () => services.filter((service) => service.is_active !== false),
    [services],
  );
  const fallbackIds = useMemo(
    () => activeServices.slice(0, homepageSlotCount).map((service) => service.id),
    [activeServices],
  );
  const savedIds = settings?.homepage_service_ids?.filter(Boolean) ?? [];
  const initialIds = savedIds.length ? savedIds.slice(0, homepageSlotCount) : fallbackIds;
  const [slotIds, setSlotIds] = useState<string[]>([
    ...initialIds,
    ...Array.from({ length: homepageSlotCount - initialIds.length }, () => ""),
  ]);
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));
  const compactSlotIds = slotIds.filter(Boolean);
  const hasDuplicates = new Set(compactSlotIds).size !== compactSlotIds.length;
  const hasChanges = compactSlotIds.join(",") !== initialIds.filter(Boolean).join(",");

  function updateSlot(index: number, value: string) {
    setResult(undefined);
    setSlotIds((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const actionResult = await saveHomepageServicesAction(compactSlotIds);
      setResult(actionResult);
    });
  }

  if (!services.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage featured services</CardTitle>
        <CardDescription>
          Choose up to four active services for the landing page. New services will not
          appear here unless you select them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: homepageSlotCount }, (_, index) => {
            const selectedId = slotIds[index] ?? "";

            return (
              <div key={index} className="space-y-2 rounded-lg border bg-card p-3">
                <Label htmlFor={`homepage-service-${index}`}>
                  Homepage slot {index + 1}
                </Label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select
                    id={`homepage-service-${index}`}
                    value={selectedId}
                    onChange={(event) => updateSlot(index, event.target.value)}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isPending}
                  >
                    <option value="">No service</option>
                    {activeServices.map((service) => (
                      <option
                        key={service.id}
                        value={service.id}
                        disabled={slotIds.includes(service.id) && selectedId !== service.id}
                      >
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => updateSlot(index, "")}
                    disabled={isPending || !selectedId}
                    aria-label={`Clear homepage slot ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {selectedId && !serviceNames.has(selectedId) ? (
                  <p className="text-xs text-destructive">
                    This saved service no longer exists. Choose another service.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        {hasDuplicates ? (
          <p className="text-sm text-destructive">
            Each homepage slot must use a different service.
          </p>
        ) : null}

        <ResultMessage result={result} />
        <Button onClick={save} disabled={isPending || hasDuplicates || !hasChanges}>
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : "Save homepage services"}
        </Button>
      </CardContent>
    </Card>
  );
}
