"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { ServiceImage } from "@/components/public/service-image";
import { Button } from "@/components/ui/button";
import { getServiceImageUrl } from "@/lib/supabase/storage";
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
  const heroImageUrl = getServiceImageUrl(
    options.services.find((service) => service.image_path)?.image_path,
  );
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
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-4 sm:px-6 lg:px-8">
        <header className="-mx-4 overflow-hidden bg-neutral-950 text-white shadow-2xl shadow-black/15 sm:mx-0 sm:mt-4 sm:rounded-[2rem]">
          <div className="relative min-h-[350px] px-4 py-4 sm:min-h-[380px] sm:px-6 lg:px-8">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                aria-hidden="true"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(251,191,36,0.42),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(244,63,94,0.28),transparent_30%),linear-gradient(135deg,#111111,#2b2418_52%,#080808)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.48),rgba(0,0,0,0.26)_34%,rgba(0,0,0,0.86))]" />

            <nav className="relative z-10 flex items-center justify-between gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-2 leading-tight">
                <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 p-1.5 shadow-lg">
                  <Image
                    src="/brand/logo-transparent.png"
                    alt={`${businessName} logo`}
                    width={96}
                    height={64}
                    priority
                    className="max-h-10 w-auto object-contain"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black tracking-normal">
                    {businessName}
                  </span>
                  <span className="text-xs font-medium text-white/65">DJ - MC - Sound</span>
                </span>
              </Link>
              <Button
                asChild
                size="sm"
                className="h-9 shrink-0 bg-amber-400 px-3 text-xs font-black text-black hover:bg-amber-300"
              >
                <Link href={bookHref}>Book a service</Link>
              </Button>
            </nav>

            <div className="relative z-10 mt-14 max-w-xl space-y-4 sm:mt-20">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1 text-xs font-semibold text-amber-100 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Premium event entertainment
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-black leading-[0.96] tracking-normal sm:text-5xl">
                  Booking event services made easier.
                </h1>
                <p className="max-w-lg text-sm leading-6 text-white/78 sm:text-base">
                  Easy booking, fast planning, and quality DJ, MC, and sound
                  support for your next event.
                </p>
              </div>
              <Button asChild className="h-12 bg-amber-400 text-black hover:bg-amber-300">
                <Link href={bookHref}>
                  Book a service
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:py-8">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
              Services
            </p>
            <h2 className="text-2xl font-black">What do you need?</h2>
            <p className="max-w-sm text-sm leading-6 text-neutral-600">
              Select one or more services. You will choose the event type and
              date on the next screen.
            </p>
            {selectedServiceIds.length ? (
              <span className="inline-flex rounded-full bg-neutral-950 px-3 py-1 text-xs font-semibold text-white">
                {selectedServiceIds.length} selected
              </span>
            ) : null}
          </div>

          <div id="services" className="space-y-3">
            {status === "ready" && options.services.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {options.services.map((service) => {
                  const selected = selectedServiceIds.includes(service.id);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={cn(
                        "group relative h-28 overflow-hidden rounded-2xl border bg-neutral-950 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:h-32",
                        selected
                          ? "border-amber-300 shadow-[0_0_0_3px_rgba(251,191,36,0.42)]"
                          : "border-black/10 hover:border-amber-500/70 hover:shadow-md",
                      )}
                      aria-pressed={selected}
                    >
                      <ServiceImage
                        imagePath={service.image_path}
                        name={service.name}
                        className="absolute inset-0 h-full w-full rounded-none"
                      />
                      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/32 to-black/5" />
                      <span
                        className={cn(
                          "absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border backdrop-blur",
                          selected
                            ? "border-amber-300 bg-amber-300 text-black"
                            : "border-white/35 bg-black/20 text-transparent",
                        )}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <span className="block text-base font-black">{service.name}</span>
                        <span className="mt-0.5 line-clamp-1 block text-xs leading-5 text-white/72">
                          {service.description ?? "Available for configured events."}
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

            <div className="rounded-2xl border border-black/10 bg-neutral-950 p-3 text-white shadow-lg">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {selectedServiceIds.length
                      ? `${selectedServiceIds.length} service${selectedServiceIds.length === 1 ? "" : "s"} ready`
                      : "Ready to plan your event?"}
                  </p>
                  <p className="mt-1 text-xs text-white/65">Continue to pick event details.</p>
                </div>
                <Button asChild className="h-10 bg-amber-400 text-black hover:bg-amber-300">
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
