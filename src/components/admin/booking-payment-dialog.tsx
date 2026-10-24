"use client";

import { useState, useTransition } from "react";
import { DollarSign, Download, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { recordBookingPaymentAction } from "@/app/admin/booking-actions";
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

type BookingPaymentDialogProps = {
  booking: AdminBookingDetail;
};

function openDocumentDownloads(documentIds: string[]) {
  documentIds.forEach((documentId, index) => {
    window.setTimeout(() => {
      window.open(`/api/admin/documents/${documentId}`, "_blank", "noopener,noreferrer");
    }, index * 150);
  });
}

export function BookingPaymentDialog({ booking }: BookingPaymentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<ManualPaymentMethod | "">("");
  const [transactionReference, setTransactionReference] = useState("");
  const [message, setMessage] = useState<string>();
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [isPending, startTransition] = useTransition();

  const enteredAmount = Number(amount);
  const preview = Number.isInteger(enteredAmount) && enteredAmount > 0
    ? calculateBookingFinancials(booking.agreed_total_amount, [
        ...booking.payments,
        { amount: enteredAmount },
      ])
    : null;

  function reset() {
    setAmount("");
    setPaymentMethod("");
    setTransactionReference("");
    setMessage(undefined);
    setDocumentIds([]);
    setIdempotencyKey(crypto.randomUUID());
  }

  function submit() {
    setMessage(undefined);
    const requestKey = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(requestKey);
    startTransition(async () => {
      const result = await recordBookingPaymentAction({
        bookingId: booking.id,
        amount: enteredAmount,
        paymentMethod: paymentMethod as ManualPaymentMethod,
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

  if (!booking.agreed_total_amount || booking.status === "pending" || booking.status === "rejected") {
    return null;
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
        <Button size="sm" variant="outline">
          <DollarSign className="h-4 w-4" />
          Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Record only the new instalment. Previous payments are already included in the totals below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-3">
            <Summary label="Agreed total" value={formatMoney(booking.financials.agreedTotal ?? 0, booking.currency)} />
            <Summary label="Previously received" value={formatMoney(booking.financials.totalReceived, booking.currency)} />
            <Summary label="Current balance" value={formatMoney(booking.financials.remainingBalance ?? 0, booking.currency)} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Previous payment history</p>
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              {booking.payments.length ? booking.payments.map((payment) => (
                <div className="flex justify-between gap-3" key={payment.id}>
                  <span>{payment.method === "mpesa" ? "M-Pesa" : payment.method === "bank_transfer" ? "Bank transfer" : "Cash"}{payment.transaction_reference ? ` · ${payment.transaction_reference}` : ""}</span>
                  <span className="font-medium">{formatMoney(payment.amount, payment.currency)}</span>
                </div>
              )) : <p className="text-muted-foreground">No previous payments recorded.</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="payment-amount">New payment amount (KSh)</Label>
              <Input id="payment-amount" type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={isPending} />
            </div>
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
          </div>

          {paymentMethod && paymentMethod !== "cash" ? (
            <div className="space-y-2">
              <Label htmlFor="new-transaction-reference">
                {paymentMethod === "mpesa" ? "M-Pesa transaction reference" : "Bank transaction reference"}
              </Label>
              <Input id="new-transaction-reference" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} disabled={isPending} />
            </div>
          ) : null}

          {preview ? (
            <div className="grid gap-2 rounded-lg bg-slate-950 p-4 text-sm text-white sm:grid-cols-2">
              <Summary label="New total received" value={formatMoney(preview.totalReceived, booking.currency)} />
              <Summary label="Deposit outstanding" value={formatMoney(preview.depositOutstanding ?? 0, booking.currency)} />
              <Summary label="Remaining balance" value={formatMoney(preview.remainingBalance ?? 0, booking.currency)} />
              <Summary label="Payment status" value={preview.paymentStatus.replace("_", " ")} />
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            This creates a new payment transaction, a new receipt, and an updated payment statement. Earlier documents are never edited.
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
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              {isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold capitalize">{value}</span>
    </div>
  );
}
