import Image from "next/image";
import Link from "next/link";

import { BookingFlow } from "@/components/public/booking-flow";
import { PublicFooter } from "@/components/public/public-footer";
import { Button } from "@/components/ui/button";
import { getPublicBookingOptions } from "@/lib/supabase/public-data";

type BookPageProps = {
  searchParams: Promise<{
    services?: string;
  }>;
};

export default async function BookPage({ searchParams }: BookPageProps) {
  const params = await searchParams;
  const bookingOptions = await getPublicBookingOptions();
  const settings = bookingOptions.data.settings;
  const businessName = settings?.business_name ?? "DJC Entertainment";
  const selectedServiceIds =
    params.services
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-[#0F172A] antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F172A] p-1.5 text-white shadow-sm transition-transform group-active:scale-95">
              <Image
                src="/brand/logo-transparent.png"
                alt={`${bookingOptions.data.settings?.business_name ?? "DJC Entertainment"} logo`}
                width={128}
                height={64}
                priority
                className="max-h-6 max-w-6 object-contain brightness-0 invert"
              />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-extrabold uppercase leading-none tracking-tight text-[#0F172A]">
                {businessName}
              </span>
              <span className="mt-1 text-[10px] font-medium tracking-wide text-slate-400">
                Audio &amp; Event Production
              </span>
            </span>
          </Link>
          <Button
            asChild
            size="sm"
            className="h-8 rounded-full bg-slate-100 px-3.5 text-xs font-semibold text-[#0F172A] hover:bg-slate-200"
          >
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-4 pb-10 pt-5 sm:px-6">
        <BookingFlow
          options={bookingOptions.data}
          status={bookingOptions.status}
          initialServiceIds={selectedServiceIds}
        />
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
