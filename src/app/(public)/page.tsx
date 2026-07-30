import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingRequestForm } from "@/components/public/booking-request-form";
import { getPublicBookingOptions } from "@/lib/supabase/public-data";

export default async function HomePage() {
  const bookingOptions = await getPublicBookingOptions();
  const businessName = bookingOptions.data.settings?.business_name ?? "DJC Events";

  return (
    <main className="min-h-screen">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
        <nav className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold">
            {businessName}
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">Admin</Link>
          </Button>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <Badge variant="secondary">Event services</Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
                Request event services with a clear estimate.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Choose an event type, services, size, date, and location. Pricing
                comes from the live Supabase configuration, and transport is quoted
                separately.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline">
                <Link href="#booking-request">Start request</Link>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                MVP foundation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Event types, sizes, services, prices, and settings are database-driven.</p>
              <p>Confirmed booking capacity is calculated from real booking records.</p>
              <p>Reservation payment integration is intentionally not connected yet.</p>
            </CardContent>
          </Card>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          {bookingOptions.data.services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {service.description ?? "Service configuration managed in Supabase."}
              </CardContent>
            </Card>
          ))}
        </section>

        {bookingOptions.status === "error" ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to load booking configuration</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {bookingOptions.message}
            </CardContent>
          </Card>
        ) : null}

        <section id="booking-request">
          <BookingRequestForm options={bookingOptions.data} />
        </section>
      </section>
    </main>
  );
}
