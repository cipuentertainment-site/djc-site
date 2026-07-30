"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";

import { saveSettingsAction, type AdminActionResult } from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicBookingSettings } from "@/types/booking";

type SettingsFormProps = {
  settings: PublicBookingSettings | null;
};

export function SettingsForm({ settings }: SettingsFormProps) {
  const [businessName, setBusinessName] = useState(settings?.business_name ?? "DJC Events");
  const [businessPhone, setBusinessPhone] = useState(settings?.business_phone ?? "");
  const [businessWhatsapp, setBusinessWhatsapp] = useState(settings?.business_whatsapp ?? "");
  const [businessEmail, setBusinessEmail] = useState(settings?.business_email ?? "");
  const [businessLogoUrl, setBusinessLogoUrl] = useState(settings?.business_logo_url ?? "");
  const [businessLocation, setBusinessLocation] = useState(settings?.business_location ?? "");
  const [businessDescription, setBusinessDescription] = useState(
    settings?.business_description ?? "",
  );
  const [currency, setCurrency] = useState(settings?.currency ?? "KES");
  const [reservationFeeAmount, setReservationFeeAmount] = useState(
    String(settings?.reservation_fee_amount ?? 100),
  );
  const [maximumEventsPerDay, setMaximumEventsPerDay] = useState(
    String(settings?.maximum_events_per_day ?? 3),
  );
  const [transportDisclaimer, setTransportDisclaimer] = useState(
    settings?.transport_disclaimer ?? "Transport charges are quoted separately.",
  );
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const actionResult = await saveSettingsAction({
        businessName,
        businessPhone,
        businessWhatsapp,
        businessEmail,
        businessLogoUrl,
        businessLocation,
        businessDescription,
        currency,
        reservationFeeAmount: Number(reservationFeeAmount),
        maximumEventsPerDay: Number(maximumEventsPerDay),
        transportDisclaimer,
      });
      setResult(actionResult);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Business name</Label>
            <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value={currency} onChange={(event) => setCurrency(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={businessPhone} onChange={(event) => setBusinessPhone(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <Input value={businessWhatsapp} onChange={(event) => setBusinessWhatsapp(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={businessEmail} onChange={(event) => setBusinessEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input value={businessLogoUrl} onChange={(event) => setBusinessLogoUrl(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reservation fee</Label>
            <Input
              type="number"
              min={0}
              value={reservationFeeAmount}
              onChange={(event) => setReservationFeeAmount(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum events per day</Label>
            <Input
              type="number"
              min={1}
              value={maximumEventsPerDay}
              onChange={(event) => setMaximumEventsPerDay(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Business location</Label>
          <Input value={businessLocation} onChange={(event) => setBusinessLocation(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Business description</Label>
          <Textarea value={businessDescription} onChange={(event) => setBusinessDescription(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Transport disclaimer</Label>
          <Textarea value={transportDisclaimer} onChange={(event) => setTransportDisclaimer(event.target.value)} />
        </div>
        <ResultMessage result={result} />
        <Button onClick={save} disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : "Save settings"}
        </Button>
      </CardContent>
    </Card>
  );
}
