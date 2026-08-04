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
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-4 text-neutral-950 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-black">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-sm ring-1 ring-black/10">
              <Image
                src="/brand/logo-transparent.png"
                alt={`${bookingOptions.data.settings?.business_name ?? "DJC Entertainment"} logo`}
                width={128}
                height={64}
                priority
                className="max-h-6 max-w-6 object-contain"
              />
            </span>
            <span>{businessName}</span>
          </Link>
          <Button asChild variant="outline" size="sm" className="border-neutral-300 bg-white/70 text-neutral-950 hover:bg-white">
            <Link href="/">Home</Link>
          </Button>
        </header>
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
