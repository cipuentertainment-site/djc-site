"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { PublicFooter } from "@/components/public/public-footer";
import { ServiceImage } from "@/components/public/service-image";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import {
  getMerchandiseImageUrl,
  getPortfolioImageUrl,
  getServiceImageUrl,
} from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import type { BookingOptions, PublicService } from "@/types/booking";
import type { MerchandiseProduct, PortfolioItem } from "@/types/merchandise-media";

type PublicHomeProps = {
  options: BookingOptions;
  media: {
    portfolioItems: PortfolioItem[];
    merchandiseProducts: MerchandiseProduct[];
  };
  status: "ready" | "not_configured" | "error";
  errorMessage?: string;
};

export function PublicHome({ options, media, status, errorMessage }: PublicHomeProps) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const settings = options.settings;
  const businessName = settings?.business_name ?? "DJC Entertainment";
  const featuredServices = useMemo(() => options.services.slice(0, 4), [options.services]);
  const compactServiceSummary = featuredServices.length
    ? featuredServices.slice(0, 3).map((service) => service.name).join(" - ")
    : "Entertainment services";
  const serviceSummary = featuredServices.length
    ? featuredServices.map((service) => service.name).join(" - ")
    : "Entertainment services";
  const serviceImageUrls = useMemo(
    () =>
      featuredServices
        .map((service) => getServiceImageUrl(service.image_path))
        .filter((url): url is string => Boolean(url)),
    [featuredServices],
  );
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
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
    const timer = window.setTimeout(() => {
      if (!serviceImageUrls.length) {
        setHeroImageUrl(null);
        return;
      }

      const randomValue =
        typeof crypto !== "undefined"
          ? crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
          : Date.now();
      setHeroImageUrl(serviceImageUrls[randomValue % serviceImageUrls.length] ?? null);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [serviceImageUrls]);

  return (
    <main className="min-h-screen bg-[#faf8f3] text-neutral-950">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
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

        <section className="grid gap-5 pb-6 pt-2 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:pb-8 lg:pt-5">
          <div className="relative min-h-[360px] overflow-hidden rounded-[1.75rem] bg-neutral-950 text-white sm:min-h-[420px] lg:order-2">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                aria-hidden="true"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#111,#3b2c11_46%,#0b0b0b)]" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.42)_48%,rgba(0,0,0,0.92))]" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <p className="max-w-sm text-sm font-semibold leading-6 text-white/78">
                Premium entertainment support for weddings, parties, corporate
                events, private celebrations and community moments.
              </p>
            </div>
          </div>

          <div className="py-1 lg:pb-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              DJC Entertainment
            </p>
            <h1 className="mt-3 max-w-xl text-5xl font-black leading-[0.9] tracking-normal text-neutral-950 sm:text-6xl lg:text-7xl">
              Let your event sound right.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-neutral-600">
              {serviceSummary} for events with clean planning, strong presence
              and a simple booking request flow.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="h-12 rounded-full bg-amber-400 px-5 text-sm font-black text-black hover:bg-amber-300"
              >
                <Link href={bookHref}>
                  Book an Event
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <a
                href="#services"
                className="text-sm font-bold text-neutral-600 underline-offset-4 hover:text-neutral-950 hover:underline"
              >
                Explore services
              </a>
            </div>
          </div>
        </section>

        <section id="services" className="border-t border-black/10 py-7 sm:py-9">
          <div className="mb-4 flex items-end justify-between gap-4">
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {featuredServices.map((service) => {
                const selected = selectedServiceIds.includes(service.id);

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service)}
                    className={cn(
                      "group relative h-44 overflow-hidden rounded-[1.35rem] bg-neutral-950 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:h-48 lg:h-56",
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
                    <span className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <span className="block text-xl font-black leading-tight">
                        {service.name}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-5 text-white/72">
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

          <div className="mt-5 flex flex-col gap-3 border-t border-black/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-sm leading-6 text-neutral-600">
              Choose one or more services, then continue to select the event type,
              size, date and location.
            </p>
            <Button
              asChild
              className="h-12 rounded-full bg-neutral-950 px-5 text-sm font-black text-white hover:bg-neutral-800"
            >
              <Link href={bookHref}>
                Book an Event
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {media.portfolioItems.length ? (
          <section className="border-t border-black/10 py-7 sm:py-9">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  Recent Work
                </p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                  Moments we have powered.
                </h2>
              </div>
            </div>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {media.portfolioItems.slice(0, 4).map((item) => (
                <PortfolioTile key={item.id} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        {media.merchandiseProducts.length ? (
          <section className="border-t border-black/10 py-7 sm:py-9">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                Merchandise
              </p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                DJC Merchandise
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {media.merchandiseProducts.map((product) => (
                <MerchandiseTile key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        <PublicFooter
          businessName={businessName}
          phone={settings?.business_phone}
          whatsapp={settings?.business_whatsapp}
          email={settings?.business_email}
          location={settings?.business_location}
        />
      </div>
    </main>
  );
}

function PortfolioTile({ item }: { item: PortfolioItem }) {
  const imageUrl = getPortfolioImageUrl(item.thumbnail_path);

  return (
    <a
      href={item.external_url}
      target="_blank"
      rel="noreferrer"
      className="group relative h-72 w-[78vw] shrink-0 snap-start overflow-hidden rounded-[1.35rem] bg-neutral-950 text-white sm:h-72 sm:w-auto"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={item.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full bg-[linear-gradient(135deg,#161616,#4b3714)]" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/42 to-black/0" />
      <span className="absolute inset-x-0 bottom-0 p-4">
        <span className="block text-lg font-black leading-tight">{item.title}</span>
        {item.description ? (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-white/72">
            {item.description}
          </span>
        ) : null}
      </span>
    </a>
  );
}

function MerchandiseTile({ product }: { product: MerchandiseProduct }) {
  const imageUrl = getMerchandiseImageUrl(product.image_path);

  return (
    <Link href={`/merchandise/${product.slug}`} className="group block">
      <span className="block aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-white">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs text-neutral-500">
            No image
          </span>
        )}
      </span>
      <span className="mt-2 block text-sm font-black leading-tight">{product.name}</span>
      <span className="mt-1 block text-sm text-neutral-600">
        {formatMoney(product.price_amount, product.currency)}
      </span>
    </Link>
  );
}
