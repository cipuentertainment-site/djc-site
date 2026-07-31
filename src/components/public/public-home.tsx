"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Headphones } from "lucide-react";

import { ServiceImage } from "@/components/public/service-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BookingOptions, PublicService } from "@/types/booking";

type PublicHomeProps = {
  options: BookingOptions;
  status: "ready" | "not_configured" | "error";
  errorMessage?: string;
};

export function PublicHome({ options, status, errorMessage }: PublicHomeProps) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const settings = options.settings;
  const businessName = settings?.business_name ?? "DJC Entertainment";
  const currentYear = new Date().getFullYear();
  const bookHref = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedServiceIds.length) {
      params.set("services", selectedServiceIds.join(","));
    }

    return `/book${params.toString() ? `?${params.toString()}` : ""}`;
  }, [selectedServiceIds]);

  function toggleService(service: PublicService) {
    setSelectedServiceIds((current) =>
      current.includes(service.id)
        ? current.filter((id) => id !== service.id)
        : [...current, service.id],
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ee] text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 -mx-4 border-b border-black/5 bg-[#f7f4ee]/92 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 leading-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-amber-300">
                <Headphones className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-black tracking-normal">{businessName}</span>
                <span className="text-xs font-medium text-neutral-500">DJ - MC - Sound</span>
              </span>
            </Link>
            <Button asChild size="sm" className="bg-neutral-950 text-white hover:bg-neutral-800">
              <Link href={bookHref}>Book service</Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 gap-7 py-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:py-12">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-100 px-3 py-1 text-xs font-semibold text-neutral-900">
              Premium event entertainment
            </div>
            <div className="space-y-3">
              <h1 className="max-w-xl text-4xl font-black leading-[0.98] tracking-normal sm:text-5xl">
                Booking event services made easier.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-neutral-600 sm:text-base">
                Easy booking, fast planning and quality service.
                We do the work so you can enjoy your event. Book a DJ, MC, or sound system for your next event with just a few clicks.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 bg-amber-400 text-black hover:bg-amber-300">
                <Link href={bookHref}>
                  Book a service
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div id="services" className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Services</p>
                <h2 className="mt-1 text-2xl font-black">What do you need?</h2>
              </div>
              {selectedServiceIds.length ? (
                <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white">
                  {selectedServiceIds.length} selected
                </span>
              ) : null}
            </div>

            {status === "ready" && options.services.length ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {options.services.map((service) => {
                  const selected = selectedServiceIds.includes(service.id);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={cn(
                        "group grid min-h-24 grid-cols-[112px_1fr] overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                        selected
                          ? "border-neutral-950 shadow-[0_0_0_3px_rgba(251,191,36,0.35)]"
                          : "border-black/10 hover:border-amber-500/70 hover:shadow-md",
                      )}
                      aria-pressed={selected}
                    >
                      <ServiceImage
                        imagePath={service.image_path}
                        name={service.name}
                        className="h-full min-h-24 rounded-none"
                      />
                      <span className="flex min-w-0 flex-col justify-between gap-1.5 p-2.5">
                        <span>
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-base font-black">{service.name}</span>
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                                selected
                                  ? "border-neutral-950 bg-neutral-950 text-amber-300"
                                  : "border-neutral-300 bg-white text-transparent",
                              )}
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          </span>
                          <span className="mt-1 line-clamp-1 block text-sm leading-5 text-neutral-600">
                            {service.description ?? "Available for configured events."}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-amber-700">
                          Tap to {selected ? "remove" : "select"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-neutral-600">
                {status === "not_configured"
                  ? "Booking is not available yet. Please contact the business directly."
                  : errorMessage ?? "Services will appear here once configured."}
              </div>
            )}

            <div className="rounded-2xl border border-black/10 bg-neutral-950 p-4 text-white shadow-lg">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {selectedServiceIds.length
                      ? `${selectedServiceIds.length} service${selectedServiceIds.length === 1 ? "" : "s"} ready for your request`
                      : "Ready to plan your event?"}
                  </p>
                  <p className="mt-1 text-xs text-white/65">
                    Choose the event type and date on the next screen.
                  </p>
                </div>
                <Button asChild className="h-11 bg-amber-400 text-black hover:bg-amber-300">
                  <Link href={bookHref}>
                    Book a service
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-black/10 py-6 text-sm text-neutral-600">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="font-black text-neutral-950">{businessName}</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-neutral-500">
                Professional DJ, MC, and event sound services for weddings,
                parties, corporate events, and celebrations.
              </p>
            </div>
            <div className="space-y-1 text-left text-xs sm:text-right">
              {settings?.business_phone ? <p>Phone: {settings.business_phone}</p> : null}
              {settings?.business_whatsapp ? <p>WhatsApp: {settings.business_whatsapp}</p> : null}
              {settings?.business_email ? <p>Email: {settings.business_email}</p> : null}
              {settings?.business_location ? <p>Location: {settings.business_location}</p> : null}
            </div>
          </div>
          <div className="mt-5 border-t border-black/10 pt-4 text-xs text-neutral-500">
            <p>
              &copy; {currentYear} {businessName}. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
