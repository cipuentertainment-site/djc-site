import Link from "next/link";
import { Headphones } from "lucide-react";

import { BookingFlow } from "@/components/public/booking-flow";
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
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-950 text-amber-300">
              <Headphones className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{bookingOptions.data.settings?.business_name ?? "DJC Entertainment"}</span>
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
      </div>
    </main>
  );
}
