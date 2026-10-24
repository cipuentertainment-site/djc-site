"use client";

import { useState, useTransition } from "react";
import { Download, Edit3, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { amendBookingFinalDetailsAction } from "@/app/admin/booking-actions";
import { FinalDetailsEditor } from "@/components/admin/final-details-editor";
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
import { buildInitialFinalDetails } from "@/lib/bookings/final-details";
import type { AdminBookingDetail } from "@/types/admin-data";

type BookingAmendmentDialogProps = {
  booking: AdminBookingDetail;
};

function openDocumentDownloads(documentIds: string[]) {
  documentIds.forEach((documentId, index) => {
    window.setTimeout(() => {
      window.open(`/api/admin/documents/${documentId}`, "_blank", "noopener,noreferrer");
    }, index * 150);
  });
}

export function BookingAmendmentDialog({ booking }: BookingAmendmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState(() => buildInitialFinalDetails(booking));
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string>();
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setLines(buildInitialFinalDetails(booking));
    setReason("");
    setMessage(undefined);
    setDocumentIds([]);
    setIdempotencyKey(crypto.randomUUID());
  }

  function submit() {
    const requestKey = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(requestKey);
    setMessage(undefined);

    startTransition(async () => {
      const result = await amendBookingFinalDetailsAction({
        bookingId: booking.id,
        finalServices: lines.map((line) => ({
          serviceId: line.serviceId,
          name: line.name.trim(),
          description: line.description?.trim() || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          currency: line.currency || booking.currency,
        })),
        amendmentReason: reason,
        idempotencyKey: requestKey,
      });

      setMessage(result.message);
      if (!result.ok) return;

      const generatedDocuments = result.documentIds ?? [];
      setDocumentIds(generatedDocuments);
      openDocumentDownloads(generatedDocuments);
      setOpen(false);
      router.refresh();
    });
  }

  if (!booking.payment_workflow_ready || !booking.final_agreement_id) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit3 className="h-4 w-4" />
          Amend Final Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Amend Final Details</DialogTitle>
          <DialogDescription>
            This creates a new commercial agreement version. Previous payments and issued documents remain unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <FinalDetailsEditor
            lines={lines}
            catalogue={booking.service_catalogue}
            currency={booking.currency}
            disabled={isPending}
            onChange={setLines}
          />

          <div className="space-y-2">
            <Label htmlFor="amendment-reason">Reason for amendment</Label>
            <Input
              id="amendment-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="For example: Client removed lighting and negotiated DJ price"
              disabled={isPending}
            />
          </div>

          {message ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p>{message}</p>
              {documentIds.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {documentIds.map((documentId) => (
                    <a className="inline-flex items-center gap-1 text-xs font-medium underline" href={`/api/admin/documents/${documentId}`} key={documentId} target="_blank" rel="noreferrer">
                      <Download className="h-3 w-3" /> Download revised document
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
            <Button type="button" onClick={submit} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
              {isPending ? "Saving amendment..." : "Save Amendment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
