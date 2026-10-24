"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Download, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  generateBookingAppreciationAction,
  retryBookingDocumentAction,
} from "@/app/admin/booking-actions";
import { BookingPaymentDialog } from "@/components/admin/booking-payment-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { AdminBookingDetail, AdminBookingDocument } from "@/types/admin-data";

type BookingDocumentsProps = {
  booking: AdminBookingDetail;
};

function getNairobiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function documentTypeLabel(type: AdminBookingDocument["document_type"]) {
  return type === "booking_confirmation"
    ? "Booking confirmation"
    : type === "payment_statement"
      ? "Payment statement"
      : type === "payment_receipt"
        ? "Payment receipt"
        : "Appreciation / thank you";
}

function appreciationStatus(booking: AdminBookingDetail) {
  const document = booking.documents.find((item) => item.document_type === "appreciation");
  if (document?.status === "generated") {
    return "Generated and ready to download.";
  }
  if (document?.status === "failed") {
    return "Generation failed. Retry below when the issue is resolved.";
  }
  if (booking.event_date >= getNairobiDate()) {
    return "Awaiting the day after the event.";
  }
  if ((booking.financials.remainingBalance ?? 0) > 0) {
    return "Awaiting final payment.";
  }
  return "Eligible and waiting for scheduled generation.";
}

export function BookingDocuments({ booking }: BookingDocumentsProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const appreciationDocument = booking.documents.find((item) => item.document_type === "appreciation");
  const appreciationEligible = booking.event_date < getNairobiDate() && (booking.financials.remainingBalance ?? 0) === 0;

  function retry(documentId: string) {
    setMessage(undefined);
    startTransition(async () => {
      const result = await retryBookingDocumentAction(documentId);
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  function generateAppreciation() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await generateBookingAppreciationAction(booking.id);
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Documents and payments</CardTitle>
          <CardDescription>Issued documents remain attached to this booking and are never overwritten.</CardDescription>
        </div>
        <BookingPaymentDialog booking={booking} />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-4">
          <Summary label="Agreed total" value={booking.financials.agreedTotal === null ? "Not set" : formatMoney(booking.financials.agreedTotal, booking.currency)} />
          <Summary label="Required deposit" value={booking.financials.requiredDeposit === null ? "Not set" : formatMoney(booking.financials.requiredDeposit, booking.currency)} />
          <Summary label="Received" value={formatMoney(booking.financials.totalReceived, booking.currency)} />
          <Summary label="Remaining" value={booking.financials.remainingBalance === null ? "Not set" : formatMoney(booking.financials.remainingBalance, booking.currency)} />
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Appreciation document</p>
              <p className="text-sm text-muted-foreground">{appreciationStatus(booking)}</p>
            </div>
            {appreciationEligible && !appreciationDocument ? (
              <Button size="sm" variant="outline" onClick={generateAppreciation} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate now
              </Button>
            ) : null}
          </div>
        </div>

        {message ? <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">{message}</p> : null}

        {booking.documents.length ? (
          <div className="space-y-2">
            {booking.documents.map((document) => (
              <DocumentRow document={document} key={document.id} isPending={isPending} onRetry={retry} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Documents will appear here after the booking is confirmed.
          </div>
        )}

        {booking.payments.length ? (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="font-medium">Payment history</p>
            </div>
            <div className="divide-y rounded-lg border border-border text-sm">
              {booking.payments.map((payment) => (
                <div className="flex flex-wrap justify-between gap-2 p-3" key={payment.id}>
                  <div>
                    <p className="font-medium">{payment.method === "mpesa" ? "M-Pesa" : payment.method === "bank_transfer" ? "Bank transfer" : "Cash"}</p>
                    <p className="text-xs text-muted-foreground">{payment.transaction_reference ?? "No electronic reference"} · {new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(payment.paid_at))}</p>
                  </div>
                  <p className="font-semibold">{formatMoney(payment.amount, payment.currency)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DocumentRow({
  document,
  isPending,
  onRetry,
}: {
  document: AdminBookingDocument;
  isPending: boolean;
  onRetry: (documentId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="font-medium">{documentTypeLabel(document.document_type)}</p>
          <p className="text-xs text-muted-foreground">{document.document_number} · Issued {document.issue_date}</p>
          {document.status === "failed" ? <p className="mt-1 text-xs text-red-600">{document.error_message ?? "Generation failed."}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {document.status === "generated" ? (
          <Button asChild size="sm" variant="outline">
            <a href={`/api/admin/documents/${document.id}`} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" />
              Download
            </a>
          </Button>
        ) : document.status === "failed" ? (
          <Button size="sm" variant="outline" onClick={() => onRetry(document.id)} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Retry
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Generating...</span>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold capitalize">{value}</p>
    </div>
  );
}
