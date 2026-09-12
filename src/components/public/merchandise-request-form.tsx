"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  MERCHANDISE_SIZE_OPTIONS,
  type MerchandiseProduct,
} from "@/types/merchandise-media";

type MerchandiseRequestFormProps = {
  product: MerchandiseProduct;
  selectedColour?: string;
  onSelectedColourChange?: (colour: string) => void;
};

type RequestResponse = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export function MerchandiseRequestForm({
  product,
  selectedColour: controlledSelectedColour,
  onSelectedColourChange,
}: MerchandiseRequestFormProps) {
  const [internalSelectedColour, setInternalSelectedColour] = useState(
    product.available_colours[0] ?? "",
  );
  const selectedColour = controlledSelectedColour ?? internalSelectedColour;
  const [selectedSize, setSelectedSize] = useState<string>(
    product.available_sizes[0] ?? "",
  );
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function chooseColour(colour: string) {
    setInternalSelectedColour(colour);
    onSelectedColourChange?.(colour);
  }

  function chooseSize(size: string) {
    setSelectedSize(size);
  }

  function submit() {
    startTransition(async () => {
      setMessage("");
      setFieldErrors({});

      const response = await fetch("/api/merchandise-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          selectedColour,
          selectedSize,
          quantity,
          customerName,
          customerPhone,
        }),
      });
      const result = (await response.json().catch(() => null)) as RequestResponse | null;

      if (!response.ok || !result?.ok) {
        setMessage(result?.message ?? "Request could not be sent.");
        setFieldErrors(result?.fieldErrors ?? {});
        return;
      }

      setIsSuccess(true);
      setMessage(result.message ?? "Request received. DJC Entertainment will contact you.");
    });
  }

  if (isSuccess) {
    return (
      <div className="rounded-[1.5rem] bg-emerald-50 p-5 text-emerald-950">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-5 w-5" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-black">Request received</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-900/75">
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {product.available_colours.length ? (
        <div className="space-y-2">
          <Label>Colour</Label>
          <div className="flex flex-wrap gap-2">
            {product.available_colours.map((colour) => (
              <button
                key={colour}
                type="button"
                onClick={() => chooseColour(colour)}
                className={cn(
                  "h-10 rounded-full border px-4 text-sm font-bold transition",
                  selectedColour === colour
                    ? "border-neutral-950 bg-neutral-950 text-white"
                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-950",
                )}
              >
                {colour}
              </button>
            ))}
          </div>
          {fieldErrors.selectedColour?.[0] ? (
            <p className="text-xs text-red-600">{fieldErrors.selectedColour[0]}</p>
          ) : null}
        </div>
      ) : null}

      {product.available_sizes.length ? (
        <div className="space-y-2">
          <Label>Size</Label>
          <div className="flex flex-wrap gap-2">
            {product.available_sizes.map((size) => {
              const label =
                MERCHANDISE_SIZE_OPTIONS.find((option) => option.value === size)?.label ?? size;

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => chooseSize(size)}
                  className={cn(
                    "h-10 rounded-full border px-4 text-sm font-bold transition",
                    selectedSize === size
                      ? "border-neutral-950 bg-neutral-950 text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-950",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {fieldErrors.selectedSize?.[0] ? (
            <p className="text-xs text-red-600">{fieldErrors.selectedSize[0]}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Quantity"
          type="number"
          min={1}
          max={50}
          value={quantity}
          onChange={setQuantity}
          error={fieldErrors.quantity?.[0]}
        />
        <Field
          label="Name"
          value={customerName}
          onChange={setCustomerName}
          error={fieldErrors.customerName?.[0]}
        />
        <Field
          label="Phone / WhatsApp"
          inputMode="tel"
          value={customerPhone}
          onChange={setCustomerPhone}
          error={fieldErrors.customerPhone?.[0]}
        />
      </div>

      {message ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}

      <Button
        className="h-12 w-full rounded-full bg-neutral-950 text-white hover:bg-neutral-800 sm:w-auto"
        onClick={submit}
        disabled={isPending}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Sending request..." : "Request This Item"}
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  inputMode,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        inputMode={inputMode}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 border-neutral-300 bg-white"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
