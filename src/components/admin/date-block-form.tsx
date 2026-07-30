"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Ban } from "lucide-react";

import { blockDateAction, type AdminActionResult } from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateBlockForm() {
  const [eventDate, setEventDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();

  function blockDate() {
    startTransition(async () => {
      const actionResult = await blockDateAction(eventDate, reason);
      setResult(actionResult);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual date blocking</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label>Date</Label>
          <DateInput value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Reason</Label>
          <Input value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <Button onClick={blockDate} disabled={isPending}>
          <Ban className="h-4 w-4" />
          {isPending ? "Blocking..." : "Block date"}
        </Button>
        <div className="md:col-span-3">
          <ResultMessage result={result} />
        </div>
      </CardContent>
    </Card>
  );
}
