"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Play } from "lucide-react";

import { ServiceImage } from "@/components/public/service-image";
import { Button } from "@/components/ui/button";
import { getPortfolioImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import type { BookingOptions, PublicService } from "@/types/booking";
import type { PortfolioItem } from "@/types/merchandise-media";

type PublicHomeServiceSelectorProps = {
  options: BookingOptions;
  portfolioItems: PortfolioItem[];
  status: "ready" | "not_configured" | "error";
  errorMessage?: string;
};

export function PublicHomeServiceSelector({
  options,
  portfolioItems,
  status,
  errorMessage,
}: PublicHomeServiceSelectorProps) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const settings = options.settings;
  const businessName = settings?.business_name ?? "DJC Entertainment";
  const featuredServices = useMemo(() => {
    const savedIds = settings?.homepage_service_ids?.filter(Boolean) ?? [];

    if (!savedIds.length) {
      return options.services.slice(0, 4);
    }

    const servicesById = new Map(options.services.map((service) => [service.id, service]));

    return savedIds
      .map((id) => servicesById.get(id))
      .filter((service): service is PublicService => Boolean(service))
      .slice(0, 4);
  }, [options.services, settings?.homepage_service_ids]);
  const compactServiceSummary = featuredServices.length
    ? featuredServices.slice(0, 3).map((service) => service.name).join(" - ")
    : "Entertainment services";
  const heroSlides = useMemo(
    () =>
      portfolioItems
        .map((item) => ({
          id: item.id,
          title: item.title,
          url: getPortfolioImageUrl(item.thumbnail_path),
          href: item.external_url,
        }))
        .filter((item) => Boolean(item.url)),
    [portfolioItems],
  );
  const activeSlide = heroSlides[activeSlideIndex % Math.max(heroSlides.length, 1)];
  const [failedHeroImageUrl, setFailedHeroImageUrl] = useState<string | null>(null);
  const heroImageFailed = Boolean(activeSlide?.url && failedHeroImageUrl === activeSlide.url);
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

  useEffect(() => {
    if (heroSlides.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveSlideIndex((current) => (current + 1) % heroSlides.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [heroSlides.length]);

  return (
    <>
      <header className="flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-sm ring-1 ring-black/10">
            <Image
              src="/brand/logo-transparent.png"
              alt={`${businessName} logo`}
              width={128}
              height={64}
              priority
              className="max-h-6 max-w-6 object-contain"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black">{businessName}</span>
            <span className="block max-w-[11rem] truncate text-[11px] font-semibold uppercase text-neutral-500 sm:max-w-none">
              {compactServiceSummary}
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <a
            href="#services"
            className="hidden text-sm font-semibold text-neutral-600 hover:text-neutral-950 sm:inline"
          >
            Services
          </a>
          <Button
            asChild
            size="sm"
            className="h-9 rounded-full bg-neutral-950 px-4 text-xs font-black text-white hover:bg-neutral-800"
          >
            <Link href={bookHref}>Book an Event</Link>
          </Button>
        </nav>
      </header>

      <section className="pb-5 pt-1 sm:pb-7 sm:pt-3">
        <div className="relative -mx-4 min-h-[310px] overflow-hidden bg-neutral-950 text-white sm:mx-0 sm:min-h-[420px] sm:rounded-[1.75rem]">
          {activeSlide?.url && !heroImageFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={activeSlide.url}
              alt={activeSlide.title}
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setFailedHeroImageUrl(activeSlide.url)}
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#111,#3b2c11_46%,#0b0b0b)]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.1)_42%,rgba(0,0,0,0.72)_72%,rgba(0,0,0,0.96)_100%)]" />
          {activeSlide?.href ? (
            <a
              href={activeSlide.href}
              target="_blank"
              rel="noreferrer"
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/92 text-neutral-950 shadow-lg transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              aria-label="Open portfolio video"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            </a>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <h1 className="max-w-xl text-4xl font-black leading-[0.92] tracking-normal sm:text-6xl lg:text-7xl">
              Let your event stand out.
            </h1>
          </div>
        </div>

        <div className="pt-4">
          <p className="max-w-xl text-sm font-semibold leading-6 text-neutral-600">
            Select a service, press Book an Event, then fill in your details on the
            next page.
          </p>
          <div className="mt-4">
            <Button
              asChild
              className="h-12 w-full rounded-full bg-amber-400 px-5 text-sm font-black text-black hover:bg-amber-300 sm:w-auto"
            >
              <Link href={bookHref}>
                Book an Event
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="services" className="border-t border-black/10 py-5 sm:py-8">
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              Services
            </p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">
              What do you need?
            </h2>
          </div>
          {selectedServiceIds.length ? (
            <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white">
              {selectedServiceIds.length} selected
            </span>
          ) : null}
        </div>

        {status === "ready" && featuredServices.length ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {featuredServices.map((service) => {
              const selected = selectedServiceIds.includes(service.id);

              return (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service)}
                  className={cn(
                    "group relative h-36 overflow-hidden rounded-[1.1rem] bg-neutral-950 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:h-48 sm:rounded-[1.35rem] lg:h-56",
                    selected
                      ? "shadow-[0_0_0_3px_rgba(251,191,36,0.95)]"
                      : "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/12",
                  )}
                  aria-pressed={selected}
                >
                  <ServiceImage
                    imagePath={service.image_path}
                    name={service.name}
                    className="absolute inset-0 h-full w-full rounded-none"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/48 to-black/0" />
                  <span
                    className={cn(
                      "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur",
                      selected
                        ? "border-amber-300 bg-amber-300 text-black"
                        : "border-white/35 bg-black/20 text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                    <span className="absolute inset-x-0 bottom-0 p-3 text-white sm:p-4">
                      <span className="block text-base font-black leading-tight sm:text-xl">
                        {service.name}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[11px] leading-4 text-white/72 sm:text-xs sm:leading-5">
                        {service.description ?? "Available for configured events."}
                      </span>
                    </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-4 text-sm text-neutral-600 ring-1 ring-black/10">
            {status === "not_configured"
              ? "Booking is not available yet. Please contact the business directly."
              : errorMessage ?? "Services will appear here once configured."}
          </div>
        )}
      </section>
    </>
  );
}
