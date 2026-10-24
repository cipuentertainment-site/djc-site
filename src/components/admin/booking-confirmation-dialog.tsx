"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { confirmBookingWithPaymentAction } from "@/app/admin/booking-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { calculateBookingFinancials } from "@/lib/bookings/financials";
import { formatMoney } from "@/lib/format";
import type { AdminBookingDetail, ManualPaymentMethod } from "@/types/admin-data";

type BookingConfirmationDialogProps = {
  booking: AdminBookingDetail;
};

function formatDuration(duration: AdminBookingDetail["duration"]) {
  return duration === "half_day" ? "Half Day" : "Full Day";
}

function openDocumentDownloads(documentIds: string[]) {
  documentIds.forEach((documentId, index) => {
    window.setTimeout(() => {
      window.open(`/api/admin/documents/${documentId}`, "_blank", "noopener,noreferrer");
    }, index * 150);
  });
}

export function BookingConfirmationDialog({ booking }: BookingConfirmationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [agreedTotal, setAgreedTotal] = useState("");
  const [initialPayment, setInitialPayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<ManualPaymentMethod | "">("");
  const [transactionReference, setTransactionReference] = useState("");
  const [message, setMessage] = useState<string>();
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [isPending, startTransition] = useTransition();

  const preview = useMemo(() => {
    const total = Number(agreedTotal);
    const payment = Number(initialPayment);

    if (!Number.isInteger(total) || total <= 0 || !Number.isInteger(payment) || payment < 0) {
      return null;
    }

    return calculateBookingFinancials(total, [
      ...booking.payments,
      ...(payment > 0 ? [{ amount: payment }] : []),
    ]);
  }, [agreedTotal, initialPayment, booking.payments]);

  function reset() {
    setAgreedTotal(booking.agreed_total_amount?.toString() ?? "");
    setInitialPayment("0");
    setPaymentMethod("");
    setTransactionReference("");
    setMessage(undefined);
    setDocumentIds([]);
    setIdempotencyKey(crypto.randomUUID());
  }

  function submit() {
    setMessage(undefined);
    const agreedTotalAmount = Number(agreedTotal);
    const initialPaymentAmount = Number(initialPayment);
    const requestKey = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(requestKey);

    startTransition(async () => {
      const result = await confirmBookingWithPaymentAction({
        bookingId: booking.id,
        agreedTotalAmount,
        initialPaymentAmount,
        paymentMethod: paymentMethod || null,
        transactionReference,
        idempotencyKey: requestKey,
      });

      setMessage(result.message);
      if (!result.ok) {
        return;
      }

      const generatedDocuments = result.documentIds ?? [];
      setDocumentIds(generatedDocuments);
      openDocumentDownloads(generatedDocuments);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Check className="h-4 w-4" />
          Confirm Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm booking and record payment</DialogTitle>
          <DialogDescription>
            Confirming moves this booking onto the calendar. The agreed total below is the authoritative price for all payment documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <Info label="Client" value={`${booking.customer_name} · ${booking.customer_phone}`} />
            <Info label="Booking reference" value={booking.booking_reference} />
            <Info label="Event" value={`${booking.event_type_name_snapshot} · ${booking.event_size_label_snapshot} · ${formatDuration(booking.duration)}`} />
            <Info label="Date" value={new Intl.DateTimeFormat("en-KE", { dateStyle: "full" }).format(new Date(`${booking.event_date}T00:00:00`))} />
            <Info label="Location" value={`${booking.county} — ${booking.location_text}`} />
            <Info label="Attendees" value={String(booking.attendee_count)} />
            {booking.notes ? <Info label="Notes" value={booking.notes} /> : null}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Agreed services</p>
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              {booking.booking_services.map((service) => (
                <div className="flex justify-between gap-3" key={service.service_name_snapshot}>
                  <span>{service.service_name_snapshot}</span>
                  <span className="font-medium">{formatMoney(service.price_amount_snapshot, service.currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agreed-total">Agreed total price (KSh)</Label>
              <Input id="agreed-total" type="number" min="1" step="1" value={agreedTotal} onChange={(event) => setAgreedTotal(event.target.value)} disabled={isPending} />
              <p className="text-xs text-muted-foreground">Website estimate reference: {formatMoney(booking.estimated_service_total_amount, booking.currency)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initial-payment">Payment received now (KSh)</Label>
              <Input id="initial-payment" type="number" min="0" step="1" value={initialPayment} onChange={(event) => setInitialPayment(event.target.value)} disabled={isPending} />
              <p className="text-xs text-muted-foreground">
                Enter the additional payment received now. Existing recorded payments are already included in the summary.
              </p>
            </div>
          </div>

          {booking.payments.length ? (
            <p className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              Existing payments recorded: <span className="font-semibold">{formatMoney(booking.payments.reduce((sum, payment) => sum + payment.amount, 0), booking.currency)}</span>. These will not be counted again.
            </p>
          ) : null}

          {Number(initialPayment) > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payment method</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as ManualPaymentMethod)} disabled={isPending}>
                  <SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mpesa">M-Pesa</SelectItem>
                    <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentMethod && paymentMethod !== "cash" ? (
                <div className="space-y-2">
                  <Label htmlFor="transaction-reference">
                    {paymentMethod === "mpesa" ? "M-Pesa transaction reference" : "Bank transaction reference"}
                  </Label>
                  <Input id="transaction-reference" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} disabled={isPending} />
                </div>
              ) : null}
            </div>
          ) : null}

          {preview ? (
            <div className="grid gap-2 rounded-lg bg-slate-950 p-4 text-sm text-white sm:grid-cols-2">
              <Summary label="Agreed total" value={formatMoney(preview.agreedTotal ?? 0, booking.currency)} />
              <Summary label="Required deposit (50%)" value={formatMoney(preview.requiredDeposit ?? 0, booking.currency)} />
              <Summary label="Amount received" value={formatMoney(preview.totalReceived, booking.currency)} />
              <Summary label="Deposit outstanding" value={formatMoney(preview.depositOutstanding ?? 0, booking.currency)} />
              <Summary label="Remaining balance" value={formatMoney(preview.remainingBalance ?? 0, booking.currency)} />
              <Summary label="Payment status" value={preview.paymentStatus.replace("_", " ")} />
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            A booking confirmation and payment statement are generated on confirmation. An initial payment receipt is generated only when the payment received amount is greater than zero.
          </p>

          {message ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p>{message}</p>
              {documentIds.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {documentIds.map((documentId) => (
                    <a className="inline-flex items-center gap-1 text-xs font-medium underline" href={`/api/admin/documents/${documentId}`} key={documentId} target="_blank" rel="noreferrer">
                      <Download className="h-3 w-3" /> Download document
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isPending ? "Confirming..." : "Confirm Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/15 pb-2 last:border-0 last:pb-0">
      <span className="text-white/70">{label}</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}
