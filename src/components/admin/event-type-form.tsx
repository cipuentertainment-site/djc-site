"use client";

import { useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";

import { saveEventTypeAction, type AdminActionResult } from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  PublicEventType,
  PublicEventTypeService,
  PublicEventTypeSize,
  PublicService,
} from "@/types/booking";

const labels = ["small", "medium", "large"] as const;

type EventTypeFormProps = {
  eventType?: PublicEventType;
  sizes?: PublicEventTypeSize[];
  relationships?: PublicEventTypeService[];
  services: PublicService[];
};

export function EventTypeForm({
  eventType,
  sizes = [],
  relationships = [],
  services,
}: EventTypeFormProps) {
  const [name, setName] = useState(eventType?.name ?? "");
  const [description, setDescription] = useState(eventType?.description ?? "");
  const [isActive, setIsActive] = useState(eventType?.is_active ?? true);
  const [selectedServices, setSelectedServices] = useState(
    relationships
      .filter((item) => item.is_active !== false)
      .map((item) => item.service_id),
  );
  const [ranges, setRanges] = useState(
    labels.map((label) => {
      const existing = sizes.find((size) => size.label === label);
      return {
        label,
        minAttendees: existing?.min_attendees ?? 0,
        maxAttendees: existing?.max_attendees ?? 1,
      };
    }),
  );
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();

  const isRangeInvalid = useMemo(
    () =>
      ranges.some((range) => range.maxAttendees <= range.minAttendees) ||
      ranges.some((range, index) => {
        const previous = ranges[index - 1];
        return previous ? range.minAttendees <= previous.maxAttendees : false;
      }),
    [ranges],
  );

  function toggleService(serviceId: string) {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId],
    );
  }

  function save() {
    startTransition(async () => {
      const actionResult = await saveEventTypeAction({
        id: eventType?.id,
        name,
        description,
        isActive,
        serviceIds: selectedServices,
        sizes: ranges,
      });
      setResult(actionResult);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{eventType ? "Edit event type" : "Create event type"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event name</Label>
            <Input
              id="event-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Birthday"
            />
          </div>
          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Active
          </label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Birthday parties and celebrations."
          />
        </div>

        <div className="space-y-3">
          <Label>Event-specific attendee ranges</Label>
          <div className="grid gap-3 lg:grid-cols-3">
            {ranges.map((range, index) => (
              <Card key={range.label}>
                <CardHeader className="p-4">
                  <CardTitle className="capitalize">{range.label}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 p-4 pt-0">
                  <div className="space-y-1">
                    <Label>Minimum attendees</Label>
                    <Input
                      type="number"
                      min={0}
                      value={range.minAttendees}
                      onChange={(event) => {
                        const next = [...ranges];
                        next[index] = {
                          ...range,
                          minAttendees: Number(event.target.value),
                        };
                        setRanges(next);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Maximum attendees</Label>
                    <Input
                      type="number"
                      min={1}
                      value={range.maxAttendees}
                      onChange={(event) => {
                        const next = [...ranges];
                        next[index] = {
                          ...range,
                          maxAttendees: Number(event.target.value),
                        };
                        setRanges(next);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {isRangeInvalid ? (
            <p className="text-sm text-destructive">
              Ranges must be ordered, non-overlapping, and each maximum must be
              greater than its minimum.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <Label>Available services for this event type</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <label
                key={service.id}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.id)}
                  onChange={() => toggleService(service.id)}
                />
                {service.name}
              </label>
            ))}
          </div>
        </div>

        <ResultMessage result={result} />
        <Button onClick={save} disabled={isPending || isRangeInvalid}>
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : "Save event type"}
        </Button>
      </CardContent>
    </Card>
  );
}
