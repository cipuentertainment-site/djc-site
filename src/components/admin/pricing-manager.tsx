"use client";

import { useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";

import { savePricingAction, type AdminActionResult } from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import type { AdminConfigData } from "@/types/admin-data";

type PricingManagerProps = {
  config: AdminConfigData;
};

export function PricingManager({ config }: PricingManagerProps) {
  const [eventTypeId, setEventTypeId] = useState(config.eventTypes[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();

  const eventType = config.eventTypes.find((item) => item.id === eventTypeId);
  const sizes = config.eventTypeSizes.filter(
    (size) => size.event_type_id === eventTypeId,
  );
  const availableServiceIds = config.eventTypeServices
    .filter((item) => item.event_type_id === eventTypeId && item.is_active !== false)
    .map((item) => item.service_id);
  const services = config.services.filter((service) =>
    availableServiceIds.includes(service.id),
  );

  const priceByCombination = useMemo(() => {
    return new Map(
      config.servicePrices.map((price) => [
        `${price.event_type_size_id}:${price.service_id}:${price.duration}`,
        price,
      ]),
    );
  }, [config.servicePrices]);

  function save() {
    startTransition(async () => {
      const prices = sizes.flatMap((size) =>
        services.flatMap((service) =>
          (service.supports_half_day ? ["full_day", "half_day"] : ["full_day"]).map(
            (duration) => {
              const key = `${size.id}:${service.id}:${duration}`;
              const existing = priceByCombination.get(key);
              const draft = drafts[key];
              const priceAmount =
                draft === undefined || draft === ""
                  ? existing?.price_amount ?? null
                  : Number(draft);

              return {
                eventTypeSizeId: size.id,
                serviceId: service.id,
                duration: duration as "full_day" | "half_day",
                priceAmount,
                isActive: existing?.is_active ?? true,
              };
            },
          ),
        ),
      );

      const actionResult = await savePricingAction({ eventTypeId, prices });
      setResult(actionResult);
    });
  }

  if (!config.eventTypes.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No event types configured</CardTitle>
          <CardDescription>Create an event type before configuring pricing.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pricing matrix</CardTitle>
          <CardDescription>
            Prices are specific to event type, event size, service, and duration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label>Event type</Label>
            <Select value={eventTypeId} onValueChange={setEventTypeId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.eventTypes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!sizes.length || !services.length ? (
            <p className="text-sm text-muted-foreground">
              Configure event sizes and available services for {eventType?.name} first.
            </p>
          ) : (
            <div className="space-y-4">
              {sizes.map((size) => (
                <Card key={size.id}>
                  <CardHeader className="p-4">
                    <CardTitle className="capitalize">
                      {size.label}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        {size.min_attendees}-{size.max_attendees} attendees
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4 pt-0">
                    {services.map((service) => {
                      const fullDayKey = `${size.id}:${service.id}:full_day`;
                      const halfDayKey = `${size.id}:${service.id}:half_day`;
                      const fullDay = priceByCombination.get(fullDayKey);
                      const halfDay = priceByCombination.get(halfDayKey);

                      return (
                        <div
                          key={service.id}
                          className="grid gap-3 rounded-md border p-3 lg:grid-cols-[1fr_180px_180px_140px] lg:items-center"
                        >
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Full Day{" "}
                              {fullDay
                                ? formatMoney(fullDay.price_amount, fullDay.currency)
                                : "not configured"}
                              {service.supports_half_day ? (
                                <>
                                  {" "}· Half Day{" "}
                                  {halfDay
                                    ? formatMoney(halfDay.price_amount, halfDay.currency)
                                    : "not configured"}
                                </>
                              ) : null}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Full Day</Label>
                            <Input
                              type="number"
                              min={0}
                              placeholder="Full Day price"
                              value={drafts[fullDayKey] ?? ""}
                              onChange={(event) =>
                                setDrafts((current) => ({
                                  ...current,
                                  [fullDayKey]: event.target.value,
                                }))
                              }
                            />
                          </div>
                          {service.supports_half_day ? (
                            <div className="space-y-1">
                              <Label className="text-xs">Half Day</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="Half Day price"
                                value={drafts[halfDayKey] ?? ""}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [halfDayKey]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                              Full Day only
                            </div>
                          )}
                          <Badge variant={fullDay ? "default" : "muted"}>
                            {fullDay ? "Configured" : "Not configured"}
                          </Badge>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <ResultMessage result={result} />
          <Button onClick={save} disabled={isPending || !sizes.length || !services.length}>
            <Save className="h-4 w-4" />
            {isPending ? "Saving..." : "Save pricing"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
