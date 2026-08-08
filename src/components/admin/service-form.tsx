"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";

import { saveServiceAction, type AdminActionResult } from "@/app/admin/actions";
import { ResultMessage } from "@/components/admin/result-message";
import { ServiceImageUploader } from "@/components/admin/service-image-uploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicService } from "@/types/booking";

type ServiceFormProps = {
  service?: PublicService;
};

export function ServiceForm({ service }: ServiceFormProps) {
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [imagePath, setImagePath] = useState(service?.image_path ?? "");
  const [supportsHalfDay, setSupportsHalfDay] = useState(
    service?.supports_half_day ?? false,
  );
  const [isActive, setIsActive] = useState(service?.is_active ?? true);
  const [result, setResult] = useState<AdminActionResult>();
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const actionResult = await saveServiceAction({
        id: service?.id,
        name,
        description,
        imagePath,
        supportsHalfDay,
        isActive,
      });
      setResult(actionResult);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{service ? "Edit service" : "Create service"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="service-name">Service name</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Lighting"
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
          <Label>Service image</Label>
          <ServiceImageUploader
            value={imagePath}
            onChange={setImagePath}
            serviceId={service?.id}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="service-description">Description</Label>
          <Textarea
            id="service-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="space-y-3 rounded-md border bg-muted/30 p-3">
          <Label>Duration availability</Label>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <input type="checkbox" checked readOnly />
              Full Day
            </label>
            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <input
                type="checkbox"
                checked={supportsHalfDay}
                onChange={(event) => setSupportsHalfDay(event.target.checked)}
              />
              Half Day
            </label>
          </div>
        </div>
        <ResultMessage result={result} />
        <Button onClick={save} disabled={isPending}>
          <Save className="h-4 w-4" />
          {isPending ? "Saving..." : "Save service"}
        </Button>
      </CardContent>
    </Card>
  );
}
