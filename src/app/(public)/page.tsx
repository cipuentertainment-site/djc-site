import { PublicHome } from "@/components/public/public-home";
import { getPublicBookingOptions } from "@/lib/supabase/public-data";

export default async function HomePage() {
  const bookingOptions = await getPublicBookingOptions();

  return (
    <PublicHome
      options={bookingOptions.data}
      status={bookingOptions.status}
      errorMessage={bookingOptions.status === "error" ? bookingOptions.message : undefined}
    />
  );
}
