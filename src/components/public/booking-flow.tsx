"use client";

import type * as React from "react";
import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Smartphone,
  Sparkles,
} from "lucide-react";

import {
  checkDateAvailabilityAction,
  prepareBookingQuoteAction,
  type BookingQuoteResult,
} from "@/app/(public)/booking-actions";
import { ServiceImage } from "@/components/public/service-image";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";
import type { BookingDuration, BookingOptions, DateAvailability } from "@/types/booking";

type BookingFlowProps = {
  options: BookingOptions;
  status: "ready" | "not_configured" | "error";
  initialServiceIds: string[];
};

type FieldErrors = Record<string, string[] | undefined>;
type PaymentState =
  | "idle"
  | "initiating"
  | "waiting"
  | "success"
  | "failed"
  | "timeout";

type PaymentStatusResponse = {
  ok: boolean;
  status?: "pending" | "success" | "failed" | "cancelled" | "expired";
  bookingId?: string | null;
  paymentReference?: string | null;
  paymentReceipt?: string | null;
  message?: string | null;
};

function createAttemptKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatRemainingSlots(availability: DateAvailability) {
  const remaining = Math.max(
    availability.maximum_events_per_day - availability.confirmed_count,
    0,
  );

  return `${remaining} slot${remaining === 1 ? "" : "s"} remaining`;
}

export function BookingFlow({ options, status, initialServiceIds }: BookingFlowProps) {
  const validInitialIds = initialServiceIds.filter((id) =>
    options.services.some((service) => service.id === id),
  );
  const [step, setStep] = useState<"details" | "checkout">("details");
  const [eventTypeId, setEventTypeId] = useState("");
  const [eventSizeId, setEventSizeId] = useState("");
  const [duration, setDuration] = useState<BookingDuration>("full_day");
  const [serviceIds, setServiceIds] = useState<string[]>(validInitialIds);
  const [eventDate, setEventDate] = useState("");
  const [county, setCounty] = useState("");
  const [townCentre, setTownCentre] = useState("");
  const [exactLocation, setExactLocation] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);
  const [attemptKey, setAttemptKey] = useState(createAttemptKey);
  const [dateAvailability, setDateAvailability] =
    useState<DateAvailability | null>(null);
  const [quoteResult, setQuoteResult] = useState<BookingQuoteResult | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const settings = options.settings;
  const selectedEventType = options.eventTypes.find((item) => item.id === eventTypeId);
  const eventSizes = useMemo(
    () => options.eventTypeSizes.filter((size) => size.event_type_id === eventTypeId),
    [eventTypeId, options.eventTypeSizes],
  );
  const availableServiceIds = options.eventTypeServices
    .filter((item) => item.event_type_id === eventTypeId)
    .map((item) => item.service_id);
  const availableServices = eventTypeId
    ? options.services.filter((service) => availableServiceIds.includes(service.id))
    : options.services;
  const selectedServices = options.services.filter((service) =>
    serviceIds.includes(service.id),
  );
  const halfDayAvailable =
    Boolean(selectedEventType?.supports_half_day) &&
    serviceIds.length > 0 &&
    selectedServices.every((service) => service.supports_half_day);
  const incompatibleSelectedServices = selectedServices.filter(
    (service) => !service.supports_half_day,
  );
  const activeDuration: BookingDuration = halfDayAvailable ? duration : "full_day";
  const selectedPrices = options.servicePrices.filter(
    (price) =>
      price.event_type_id === eventTypeId &&
      price.event_type_size_id === eventSizeId &&
      serviceIds.includes(price.service_id) &&
      price.duration === activeDuration,
  );

  function resetPayment() {
    setPaymentState("idle");
    setPaymentMessage("");
    setBookingId(null);
    setReferenceId(null);
    setPaymentReceipt(null);
  }

  function updateEventType(value: string) {
    setEventTypeId(value);
    setEventSizeId("");
    const nextEventType = options.eventTypes.find((item) => item.id === value);
    const allowedIds = options.eventTypeServices
      .filter((item) => item.event_type_id === value)
      .map((item) => item.service_id);
    setServiceIds((current) => current.filter((id) => allowedIds.includes(id)));
    if (!nextEventType?.supports_half_day) {
      setDuration("full_day");
    }
    setQuoteResult(null);
    setStep("details");
    resetPayment();
  }

  function toggleService(serviceId: string) {
    setServiceIds((current) => {
      const next = current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId];

      if (duration === "half_day") {
        const nextServices = options.services.filter((service) =>
          next.includes(service.id),
        );

        if (!nextServices.length || nextServices.some((service) => !service.supports_half_day)) {
          setDuration("full_day");
        }
      }

      return next;
    });
    setQuoteResult(null);
    resetPayment();
  }

  function updateDate(value: string) {
    setEventDate(value);
    setDateAvailability(null);
    setQuoteResult(null);
    resetPayment();

    if (!value) {
      return;
    }

    startTransition(async () => {
      setDateAvailability(await checkDateAvailabilityAction(value));
    });
  }

  function reviewEstimate() {
    setFieldErrors({});
    resetPayment();
    startTransition(async () => {
      const result = await prepareBookingQuoteAction({
        eventTypeId,
        eventSizeId,
        duration: activeDuration,
        serviceIds,
        eventDate,
        county: county as (typeof KENYAN_COUNTIES)[number],
        townCentre,
        exactLocation,
        customerName,
        customerPhone,
        customerEmail,
        mpesaPhone,
        legalConsent,
      });
      setQuoteResult(result);

      if (result.ok) {
        setStep("checkout");
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      } else {
        setFieldErrors(result.fieldErrors ?? {});
      }
    });
  }

  async function pollPaymentStatus(paymentId: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 5000));

      const response = await fetch(`/api/payments/mpesa/status/${paymentId}`, {
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as PaymentStatusResponse | null;

      if (!response.ok || !result?.ok) {
        setPaymentState("failed");
        setPaymentMessage(result?.message ?? "Payment status could not be checked.");
        setAttemptKey(createAttemptKey());
        return;
      }

      if (result.status === "success") {
        setPaymentState("success");
        setBookingId(result.bookingId ?? null);
        setReferenceId(result.paymentReference ?? result.bookingId ?? paymentId);
        setPaymentReceipt(result.paymentReceipt ?? null);
        setPaymentMessage("Request received. We will contact you to finalize the event.");
        return;
      }

      if (result.status && ["failed", "cancelled", "expired"].includes(result.status)) {
        setPaymentState("failed");
        setPaymentMessage(result.message ?? "Payment could not be completed.");
        setAttemptKey(createAttemptKey());
        return;
      }

      if (result.status === "pending" && result.message) {
        setPaymentMessage(result.message);
      }
    }

    setPaymentState("timeout");
    setPaymentMessage("We have not received payment confirmation yet. If you paid, please contact the business.");
    setAttemptKey(createAttemptKey());
  }

  async function reserveEvent() {
    if (paymentState === "initiating" || paymentState === "waiting") {
      return;
    }

    setPaymentState("initiating");
    setPaymentMessage("Sending payment request...");

    const response = await fetch("/api/payments/mpesa/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        attemptKey,
        eventTypeId,
        eventSizeId,
        duration: activeDuration,
        serviceIds,
        eventDate,
        county,
        townCentre,
        exactLocation,
        customerName,
        customerPhone,
        customerEmail,
        mpesaPhone,
        legalConsent,
      }),
    });
    const result = (await response.json().catch(() => null)) as
      | { ok: boolean; paymentId?: string; message?: string }
      | null;

    if (!response.ok || !result?.ok || !result.paymentId) {
      setPaymentState("failed");
      setPaymentMessage(result?.message ?? "Payment request could not be sent.");
      setAttemptKey(createAttemptKey());
      return;
    }

    setPaymentState("waiting");
    setPaymentMessage(
      result.message ?? "Check your phone and enter your M-Pesa PIN to complete the reservation.",
    );
    await pollPaymentStatus(result.paymentId);
  }

  if (status !== "ready" || !settings) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-neutral-600 shadow-sm">
        Booking is not available right now. Please try again later.
      </section>
    );
  }

  if (!options.eventTypes.length || !options.services.length || !options.servicePrices.length) {
    return (
      <section className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-neutral-600 shadow-sm">
        Booking setup is not complete yet. Please contact the business directly.
      </section>
    );
  }

  return (
    <section>
      <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
              {step === "details" ? "Book an event" : "Review estimate"}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-normal sm:text-3xl">
              {step === "details" ? "Tell us about the event." : "Reserve your request."}
            </h1>
          </div>
          {step === "checkout" && paymentState !== "success" ? (
            <Button
              variant="outline"
              size="sm"
              className="border-neutral-300 bg-white text-neutral-950 hover:bg-neutral-100"
              onClick={() => setStep("details")}
            >
              <ArrowLeft className="h-4 w-4" />
              Edit
            </Button>
          ) : null}
        </div>

        {step === "details" ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldError error={fieldErrors.eventTypeId?.[0]}>
                <Label>Event type</Label>
                <Select value={eventTypeId} onValueChange={updateEventType}>
                  <SelectTrigger className="h-12 border-neutral-300 bg-white text-neutral-950">
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
              </FieldError>

              <FieldError error={fieldErrors.eventSizeId?.[0]}>
                <Label>Event size</Label>
                <div className="grid grid-cols-3 gap-2">
                  {eventSizes.length ? (
                    eventSizes.map((size) => (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => {
                          setEventSizeId(size.id);
                          setQuoteResult(null);
                          resetPayment();
                        }}
                        className={cn(
                          "min-h-16 rounded-2xl border px-2 py-2 text-center text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                          eventSizeId === size.id
                            ? "border-neutral-950 bg-neutral-950 text-white"
                            : "border-neutral-300 bg-neutral-50 text-neutral-950 hover:border-amber-500",
                        )}
                      >
                        <span className="block font-black capitalize">{size.label}</span>
                        <span className={cn("text-xs", eventSizeId === size.id ? "text-white/70" : "text-neutral-500")}>
                          {size.min_attendees}-{size.max_attendees}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="col-span-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-3 text-sm text-neutral-500">
                      Select an event type first.
                    </p>
                  )}
                </div>
              </FieldError>
            </div>

            <FieldError error={fieldErrors.duration?.[0]}>
              <Label>Event duration</Label>
              {selectedEventType?.supports_half_day ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDuration("full_day");
                        setQuoteResult(null);
                        resetPayment();
                      }}
                      className={cn(
                        "h-12 rounded-2xl border px-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                        activeDuration === "full_day"
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-300 bg-neutral-50 text-neutral-950 hover:border-amber-500",
                      )}
                    >
                      Full Day
                    </button>
                    <button
                      type="button"
                      disabled={!halfDayAvailable}
                      onClick={() => {
                        setDuration("half_day");
                        setQuoteResult(null);
                        resetPayment();
                      }}
                      className={cn(
                        "h-12 rounded-2xl border px-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50",
                        activeDuration === "half_day"
                          ? "border-neutral-950 bg-neutral-950 text-white"
                          : "border-neutral-300 bg-neutral-50 text-neutral-950 hover:border-amber-500",
                      )}
                    >
                      Half Day
                    </button>
                  </div>
                  {!halfDayAvailable ? (
                    <p className="text-xs text-neutral-500">
                      Half Day is available only when all selected services support it.
                      {incompatibleSelectedServices.length
                        ? ` Full Day only: ${incompatibleSelectedServices.map((service) => service.name).join(", ")}.`
                        : ""}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-neutral-300 bg-neutral-50 p-3 text-sm">
                  <span className="font-black text-neutral-950">Full Day</span>
                  <p className="mt-1 text-xs text-neutral-500">
                    {eventTypeId
                      ? "This event type is configured for Full Day bookings."
                      : "Select an event type first."}
                  </p>
                </div>
              )}
            </FieldError>

            <FieldError error={fieldErrors.serviceIds?.[0]}>
              <Label>Services</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {availableServices.map((service) => {
                  const selected = serviceIds.includes(service.id);
                  const price = selectedPrices.find((item) => item.service_id === service.id);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service.id)}
                      className={cn(
                        "grid grid-cols-[58px_1fr_auto] items-center gap-3 rounded-2xl border p-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                        selected
                          ? "border-neutral-950 bg-amber-100"
                          : "border-neutral-300 bg-white hover:border-amber-500",
                      )}
                    >
                      <ServiceImage
                        imagePath={service.image_path}
                        name={service.name}
                        className="h-14 w-14 rounded-xl"
                      />
                      <span className="min-w-0">
                        <span className="block font-black">{service.name}</span>
                        <span className="text-xs text-neutral-500">
                          {eventTypeId && eventSizeId
                            ? price
                              ? "Pricing shown at review"
                              : "Not configured"
                            : "Select event first"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border",
                          selected
                            ? "border-neutral-950 bg-neutral-950 text-amber-300"
                            : "border-neutral-300 bg-white text-transparent",
                        )}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </FieldError>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldError error={fieldErrors.eventDate?.[0]}>
                <Label htmlFor="event-date">Event date</Label>
                <DateInput
                  id="event-date"
                  min={format(new Date(), "yyyy-MM-dd")}
                  value={eventDate}
                  onChange={(event) => updateDate(event.target.value)}
                  className="h-12 border-neutral-300 bg-white text-neutral-950"
                />
                {dateAvailability ? (
                  <p className={cn("text-xs", dateAvailability.is_available ? "text-emerald-700" : "text-red-600")}>
                    {dateAvailability.is_available
                      ? formatRemainingSlots(dateAvailability)
                      : "This date is unavailable"}
                  </p>
                ) : null}
              </FieldError>

              <FieldError error={fieldErrors.county?.[0]}>
                <Label>County</Label>
                <Select value={county} onValueChange={setCounty}>
                  <SelectTrigger className="h-12 border-neutral-300 bg-white text-neutral-950">
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
              </FieldError>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Town / centre" value={townCentre} onChange={setTownCentre} error={fieldErrors.townCentre?.[0]} />
              <TextField label="Exact location" value={exactLocation} onChange={setExactLocation} error={fieldErrors.exactLocation?.[0]} />
              <TextField label="Full name" value={customerName} onChange={setCustomerName} error={fieldErrors.customerName?.[0]} />
              <TextField label="Phone / WhatsApp" value={customerPhone} onChange={setCustomerPhone} error={fieldErrors.customerPhone?.[0]} inputMode="tel" />
              <TextField label="Email (optional)" value={customerEmail} onChange={setCustomerEmail} error={fieldErrors.customerEmail?.[0]} type="email" />
            </div>

            {quoteResult && !quoteResult.ok ? (
              <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
                {quoteResult.message}
              </p>
            ) : null}

            <FieldError error={fieldErrors.legalConsent?.[0]}>
              <label className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
                <input
                  type="checkbox"
                  checked={legalConsent}
                  onChange={(event) => setLegalConsent(event.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0"
                />
                <span>
                  I have read and agree to the{" "}
                  <Link href="/terms" className="font-semibold text-neutral-950 underline">
                    Terms & Conditions
                  </Link>{" "}
                  and acknowledge the{" "}
                  <Link href="/privacy" className="font-semibold text-neutral-950 underline">
                    Privacy Notice
                  </Link>
                  .
                </span>
              </label>
            </FieldError>

            <Button
              className="h-12 w-full bg-amber-400 text-black hover:bg-amber-300 sm:w-auto"
              onClick={reviewEstimate}
              disabled={isPending || dateAvailability?.is_available === false || !legalConsent}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
              Review estimate
            </Button>
          </div>
        ) : (
          <Checkout
            quote={quoteResult?.ok ? quoteResult : null}
            eventDate={eventDate}
            county={county}
            townCentre={townCentre}
            exactLocation={exactLocation}
            mpesaPhone={mpesaPhone}
            setMpesaPhone={setMpesaPhone}
            paymentState={paymentState}
            paymentMessage={paymentMessage}
            bookingId={bookingId}
            referenceId={referenceId}
            paymentReceipt={paymentReceipt}
            onReserve={reserveEvent}
          />
        )}
      </div>
    </section>
  );
}

function FieldError({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <FieldError error={error}>
      <Label>{label}</Label>
      <Input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 border-neutral-300 bg-white text-neutral-950 placeholder:text-neutral-400"
      />
    </FieldError>
  );
}

function Checkout({
  quote,
  eventDate,
  county,
  townCentre,
  exactLocation,
  mpesaPhone,
  setMpesaPhone,
  paymentState,
  paymentMessage,
  bookingId,
  referenceId,
  paymentReceipt,
  onReserve,
}: {
  quote: Extract<BookingQuoteResult, { ok: true }> | null;
  eventDate: string;
  county: string;
  townCentre: string;
  exactLocation: string;
  mpesaPhone: string;
  setMpesaPhone: (value: string) => void;
  paymentState: PaymentState;
  paymentMessage: string;
  bookingId: string | null;
  referenceId: string | null;
  paymentReceipt: string | null;
  onReserve: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copyReference() {
    if (!referenceId) {
      return;
    }

    await navigator.clipboard.writeText(referenceId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!quote) {
    return <p className="text-sm text-neutral-600">Review the booking details first.</p>;
  }

  if (paymentState === "success") {
    return (
      <div className="space-y-5">
        <Dialog defaultOpen>
          <DialogContent className="border-emerald-200 bg-white text-neutral-950">
            <DialogHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <DialogTitle className="text-2xl font-black">Payment received</DialogTitle>
              <DialogDescription>
                Screenshot this receipt or copy the reference.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-2xl border border-black/10 bg-neutral-50 p-4 text-sm">
              <ReceiptRow label="Event" value={quote.eventTypeName} />
              <ReceiptRow
                label="Size"
                value={`${quote.eventSizeLabel} - ${quote.eventSizeRange}`}
              />
              <ReceiptRow label="Duration" value={quote.durationLabel} />
              <ReceiptRow
                label="Reservation paid"
                value={formatMoney(quote.reservationFeeAmount, quote.currency)}
              />
              <ReceiptRow
                label="M-Pesa receipt"
                value={paymentReceipt ?? "Pending from M-Pesa"}
              />
              <ReceiptRow
                label="Services"
                value={quote.selectedServices.map((item) => item.service.name).join(", ")}
              />
            </div>
            {referenceId ? (
              <div className="rounded-2xl border border-black/10 bg-neutral-50 p-3">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
                  Trace reference
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-2 text-xs text-neutral-800">
                    {referenceId}
                  </code>
                  <Button type="button" size="sm" onClick={copyReference}>
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <div className="rounded-3xl bg-emerald-50 p-5 text-emerald-950">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-2xl font-black">Request received</h2>
          <p className="mt-2 text-sm text-emerald-900/75">
            Your event request has been received. The business will contact you to finalize the event.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SummaryItem label="Event" value={quote.eventTypeName} />
          <SummaryItem label="Size" value={`${quote.eventSizeLabel} - ${quote.eventSizeRange}`} />
          <SummaryItem label="Duration" value={quote.durationLabel} />
          <SummaryItem label="Date" value={format(new Date(eventDate), "MMM d, yyyy")} />
          <SummaryItem label="Reservation" value={formatMoney(quote.reservationFeeAmount, quote.currency)} />
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
            M-Pesa receipt
          </p>
          <p className="mt-1 font-semibold text-neutral-950">
            {paymentReceipt ?? "Pending from M-Pesa"}
          </p>
        </div>
        {referenceId ? (
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">
              Reference
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2 py-2 text-xs text-neutral-800">
                {referenceId ?? bookingId}
              </code>
              <Button type="button" size="sm" onClick={copyReference}>
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Take a screenshot and keep this reference for easy tracing.
            </p>
          </div>
        ) : null}
      </div>
    );
  }

  const isBusy = paymentState === "initiating" || paymentState === "waiting";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryItem label="Event" value={quote.eventTypeName} />
        <SummaryItem label="Size" value={`${quote.eventSizeLabel} - ${quote.eventSizeRange}`} />
        <SummaryItem label="Duration" value={quote.durationLabel} />
        <SummaryItem label="Date" value={format(new Date(eventDate), "MMM d, yyyy")} />
        <SummaryItem label="Location" value={`${county} - ${townCentre} - ${exactLocation}`} />
      </div>

      <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4">
        <p className="mb-3 font-black">Services</p>
        <div className="space-y-2">
          {quote.selectedServices.map((item) => (
            <div key={item.service.id} className="flex justify-between gap-3 text-sm">
              <span>{item.service.name}</span>
              <span className="font-semibold">{formatMoney(item.price, quote.currency)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-neutral-950 p-4 text-white">
        <div className="flex justify-between gap-4">
          <span>Estimated service total</span>
          <strong>{formatMoney(quote.total, quote.currency)}</strong>
        </div>
        <div className="mt-2 flex justify-between gap-4 text-amber-200">
          <span>Reservation fee</span>
          <strong>{formatMoney(quote.reservationFeeAmount, quote.currency)}</strong>
        </div>
        <p className="mt-3 text-sm text-white/65">{quote.transportDisclaimer}</p>
      </div>

      <div className="space-y-2">
        <Label>M-Pesa number</Label>
        <Input
          inputMode="tel"
          value={mpesaPhone}
          onChange={(event) => setMpesaPhone(event.target.value)}
          className="h-12 border-neutral-300 bg-white text-neutral-950"
          placeholder="07XX XXX XXX"
          disabled={isBusy}
        />
      </div>

      <Button
        className="h-12 w-full bg-amber-400 text-black hover:bg-amber-300"
        onClick={onReserve}
        disabled={isBusy}
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : paymentState === "failed" || paymentState === "timeout" ? (
          <Smartphone className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {paymentState === "initiating"
          ? "Sending payment request..."
          : paymentState === "waiting"
            ? "Check your phone"
            : "Reserve event"}
      </Button>

      {paymentMessage ? (
        <p
          className={cn(
            "rounded-2xl p-3 text-sm",
            paymentState === "failed" || paymentState === "timeout"
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-neutral-700",
          )}
        >
          {paymentMessage}
        </p>
      ) : (
        <p className="text-xs text-neutral-500">
          You are paying the reservation fee only. The full event amount is handled after the business contacts you.
        </p>
      )}
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 pb-2 last:border-0 last:pb-0">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-semibold text-neutral-950">{value}</span>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">{label}</p>
      <p className="mt-1 font-semibold text-neutral-950">{value}</p>
    </div>
  );
}
