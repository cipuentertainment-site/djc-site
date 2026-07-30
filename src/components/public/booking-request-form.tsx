"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { CalendarCheck, Loader2 } from "lucide-react";

import {
  checkDateAvailabilityAction,
  prepareBookingQuoteAction,
  type BookingQuoteResult,
} from "@/app/(public)/booking-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KENYAN_COUNTIES } from "@/lib/counties";
import { formatMoney } from "@/lib/format";
import type { BookingOptions, DateAvailability } from "@/types/booking";

type BookingRequestFormProps = {
  options: BookingOptions;
};

export function BookingRequestForm({ options }: BookingRequestFormProps) {
  const [eventTypeId, setEventTypeId] = useState("");
  const [eventSizeId, setEventSizeId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [attendeeCount, setAttendeeCount] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [county, setCounty] = useState("");
  const [locationText, setLocationText] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dateAvailability, setDateAvailability] =
    useState<DateAvailability | null>(null);
  const [quoteResult, setQuoteResult] = useState<BookingQuoteResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const eventSizes = useMemo(
    () => options.eventTypeSizes.filter((size) => size.event_type_id === eventTypeId),
    [eventTypeId, options.eventTypeSizes],
  );

  const selectedSize = eventSizes.find((size) => size.id === eventSizeId);
  const availableServiceIds = options.eventTypeServices
    .filter((item) => item.event_type_id === eventTypeId)
    .map((item) => item.service_id);
  const availableServices = eventTypeId
    ? options.services.filter((service) => availableServiceIds.includes(service.id))
    : options.services;
  const selectedPrices = options.servicePrices.filter(
    (price) =>
      price.event_type_id === eventTypeId &&
      price.event_type_size_id === eventSizeId &&
      serviceIds.includes(price.service_id),
  );
  const estimate = selectedPrices.reduce((sum, price) => sum + price.price_amount, 0);
  const currency = options.settings?.currency ?? selectedPrices[0]?.currency ?? "KES";
  const canCalculate = Boolean(
    eventTypeId &&
      eventSizeId &&
      serviceIds.length &&
      attendeeCount &&
      eventDate &&
      county &&
      locationText &&
      customerName &&
      customerPhone,
  );

  function updateEventType(value: string) {
    setEventTypeId(value);
    setEventSizeId("");
    setQuoteResult(null);
  }

  function toggleService(serviceId: string) {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((item) => item !== serviceId)
        : [...current, serviceId],
    );
    setQuoteResult(null);
  }

  function updateDate(value: string) {
    setEventDate(value);
    setDateAvailability(null);
    setQuoteResult(null);

    if (!value) {
      return;
    }

    startTransition(async () => {
      const result = await checkDateAvailabilityAction(value);
      setDateAvailability(result);
    });
  }

  function prepareQuote() {
    startTransition(async () => {
      const result = await prepareBookingQuoteAction({
        eventTypeId,
        eventSizeId,
        serviceIds,
        attendeeCount: Number(attendeeCount),
        eventDate,
        county: county as (typeof KENYAN_COUNTIES)[number],
        locationText,
        customerName,
        customerPhone,
      });
      setQuoteResult(result);
    });
  }

  if (!options.settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supabase configuration required</CardTitle>
          <CardDescription>
            Add the Supabase environment variables and run the database migration
            before the booking form can read live configuration.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!options.eventTypes.length || !options.eventTypeSizes.length || !options.servicePrices.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Booking configuration is incomplete</CardTitle>
          <CardDescription>
            Add active event types, event-specific size ranges, and service prices in
            Supabase before accepting customer booking requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Existing active services from the database:{" "}
            {options.services.map((service) => service.name).join(", ") || "none"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Request an event booking</CardTitle>
          <CardDescription>
            Choose the event details and review the estimated service price.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Event type</Label>
              <Select value={eventTypeId} onValueChange={updateEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {options.eventTypes.map((eventType) => (
                    <SelectItem key={eventType.id} value={eventType.id}>
                      {eventType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Event size</Label>
              <Select value={eventSizeId} onValueChange={setEventSizeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {eventSizes.map((size) => (
                    <SelectItem key={size.id} value={size.id}>
                      {size.label} ({size.min_attendees}-{size.max_attendees})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Services</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {availableServices.map((service) => {
                const price = options.servicePrices.find(
                  (item) =>
                    item.service_id === service.id &&
                    item.event_type_id === eventTypeId &&
                    item.event_type_size_id === eventSizeId,
                );

                return (
                  <label
                    key={service.id}
                    className="flex min-h-24 cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={serviceIds.includes(service.id)}
                      disabled={!price}
                      onChange={() => toggleService(service.id)}
                    />
                    <span className="space-y-1">
                      <span className="block font-medium">{service.name}</span>
                      <span className="block text-muted-foreground">
                        {price
                          ? formatMoney(price.price_amount, price.currency)
                          : "No active price for this selection"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="attendees">Attendees</Label>
              <Input
                id="attendees"
                type="number"
                min={selectedSize?.min_attendees ?? 0}
                max={selectedSize?.max_attendees}
                value={attendeeCount}
                onChange={(event) => setAttendeeCount(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Event date</Label>
              <DateInput
                id="event-date"
                min={format(new Date(), "yyyy-MM-dd")}
                value={eventDate}
                onChange={(event) => updateDate(event.target.value)}
              />
            </div>
          </div>

          {dateAvailability ? (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              {dateAvailability.is_available
                ? `${dateAvailability.confirmed_count}/${dateAvailability.maximum_events_per_day} confirmed bookings on this date.`
                : "This date is not available for new booking requests."}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>County</Label>
              <Select value={county} onValueChange={setCounty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select county" />
                </SelectTrigger>
                <SelectContent>
                  {KENYAN_COUNTIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Town / centre / exact location</Label>
              <Input
                id="location"
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer name</Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone number</Label>
              <Input
                id="customer-phone"
                inputMode="tel"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
            </div>
          </div>

          <Button type="button" disabled={!canCalculate || isPending} onClick={prepareQuote}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
            Review estimate
          </Button>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            Booking summary
          </Badge>
          <CardTitle>{formatMoney(estimate, currency)}</CardTitle>
          <CardDescription>Estimated service total</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            {selectedPrices.length ? (
              selectedPrices.map((price) => {
                const service = options.services.find(
                  (item) => item.id === price.service_id,
                );

                return (
                  <div key={price.id} className="flex justify-between gap-3">
                    <span>{service?.name}</span>
                    <span className="font-medium">
                      {formatMoney(price.price_amount, price.currency)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">
                Select an event type, size, and service to calculate the estimate.
              </p>
            )}
          </div>

          <div className="border-t pt-4 text-muted-foreground">
            <p>
              Reservation fee:{" "}
              <span className="font-medium text-foreground">
                {formatMoney(options.settings.reservation_fee_amount, currency)}
              </span>
            </p>
            <p>{options.settings.transport_disclaimer}</p>
          </div>

          {quoteResult ? (
            <div className="rounded-md bg-muted p-3">
              {quoteResult.ok ? (
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Server-validated quote</p>
                  <p>{formatMoney(quoteResult.total, quoteResult.currency)}</p>
                  <p>{quoteResult.dateAvailabilityMessage}</p>
                  <p>{quoteResult.submissionMessage}</p>
                </div>
              ) : (
                <p className="text-destructive">{quoteResult.message}</p>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
