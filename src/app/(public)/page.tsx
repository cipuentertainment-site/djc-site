import { PublicHome } from "@/components/public/public-home";
import { getPublicBookingOptions, getPublicMediaContent } from "@/lib/supabase/public-data";

export default async function HomePage() {
  const [bookingOptions, mediaContent] = await Promise.all([
    getPublicBookingOptions(),
    getPublicMediaContent(),
  ]);

  return (
    <PublicHome
      options={bookingOptions.data}
      media={mediaContent}
      status={bookingOptions.status}
      errorMessage={bookingOptions.status === "error" ? bookingOptions.message : undefined}
    />
  );
}
