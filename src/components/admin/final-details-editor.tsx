"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateFinalDetailsTotal, type EditableFinalBookingService } from "@/lib/bookings/final-details";
import { formatMoney } from "@/lib/format";
import type { AdminServiceCatalogueItem } from "@/types/admin-data";

type FinalDetailsEditorProps = {
  lines: EditableFinalBookingService[];
  catalogue: AdminServiceCatalogueItem[];
  currency: string;
  disabled?: boolean;
  onChange: (lines: EditableFinalBookingService[]) => void;
};

export function FinalDetailsEditor({
  lines,
  catalogue,
  currency,
  disabled = false,
  onChange,
}: FinalDetailsEditorProps) {
  const selectedCatalogueIds = new Set(lines.map((line) => line.serviceId).filter(Boolean));
  const availableCatalogue = catalogue.filter((service) => !selectedCatalogueIds.has(service.id));

  function updateLine(key: string, updates: Partial<EditableFinalBookingService>) {
    onChange(lines.map((line) => (line.key === key ? { ...line, ...updates } : line)));
  }

  function addCatalogueService(service: AdminServiceCatalogueItem) {
    onChange([
      ...lines,
      {
        key: crypto.randomUUID(),
        serviceId: service.id,
        name: service.name,
        description: service.description,
        quantity: 1,
        unitPrice: service.default_price_amount ?? 0,
        currency: service.currency,
      },
    ]);
  }

  function addCustomService() {
    onChange([
      ...lines,
      {
        key: crypto.randomUUID(),
        serviceId: null,
        name: "",
        description: null,
        quantity: 1,
        unitPrice: 0,
        currency,
      },
    ]);
  }

  const total = calculateFinalDetailsTotal(lines);

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Final agreed services</p>
          <p className="text-xs text-muted-foreground">
            Start with the requested services, then remove, add or negotiate each line before confirming.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value=""
            onValueChange={(value) => {
              const service = availableCatalogue.find((item) => item.id === value);
              if (service) addCatalogueService(service);
            }}
            disabled={disabled || !availableCatalogue.length}
          >
            <SelectTrigger className="w-[210px]">
              <SelectValue placeholder="Add catalogue service" />
            </SelectTrigger>
            <SelectContent>
              {availableCatalogue.map((service) => (
                <SelectItem value={service.id} key={service.id}>
                  {service.name}{service.default_price_amount !== null ? ` - ${formatMoney(service.default_price_amount, service.currency)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" onClick={addCustomService} disabled={disabled}>
            <Plus className="h-4 w-4" />
            Custom line
          </Button>
        </div>
      </div>

      {lines.length ? (
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div className="rounded-md border border-border bg-muted/20 p-3" key={line.key}>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_100px_150px_auto] md:items-end">
                <div className="space-y-1">
                  <Label htmlFor={`final-service-name-${line.key}`}>Service {index + 1}</Label>
                  <Input
                    id={`final-service-name-${line.key}`}
                    value={line.name}
                    placeholder="Service or line-item name"
                    onChange={(event) => updateLine(line.key, { name: event.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`final-service-quantity-${line.key}`}>Quantity</Label>
                  <Input
                    id={`final-service-quantity-${line.key}`}
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(event) => updateLine(line.key, { quantity: Number(event.target.value) })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`final-service-price-${line.key}`}>Agreed unit price (KSh)</Label>
                  <Input
                    id={`final-service-price-${line.key}`}
                    type="number"
                    min="0"
                    step="1"
                    value={line.unitPrice}
                    onChange={(event) => updateLine(line.key, { unitPrice: Number(event.target.value) })}
                    disabled={disabled}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${line.name || "service"}`}
                  onClick={() => onChange(lines.filter((item) => item.key !== line.key))}
                  disabled={disabled}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="space-y-1">
                  <Label htmlFor={`final-service-description-${line.key}`}>Description (optional)</Label>
                  <Input
                    id={`final-service-description-${line.key}`}
                    value={line.description ?? ""}
                    placeholder="Short description or agreed scope"
                    onChange={(event) => updateLine(line.key, { description: event.target.value || null })}
                    disabled={disabled}
                  />
                </div>
                <p className="text-right text-sm font-semibold">
                  Line total: {formatMoney(line.quantity * line.unitPrice, currency)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No final service lines yet. Add a catalogue service or custom line.
        </p>
      )}

      <div className="flex items-center justify-between rounded-md bg-slate-950 p-3 text-white">
        <span className="text-sm font-medium">Total agreed price</span>
        <span className="text-lg font-semibold">{formatMoney(total, currency)}</span>
      </div>
    </div>
  );
}
