import { LegalPage } from "@/components/public/legal-page";
import { privacyDocument } from "@/lib/legal-documents";
import { getPublicBookingOptions } from "@/lib/supabase/public-data";

export default async function PrivacyPage() {
  const bookingOptions = await getPublicBookingOptions();

  return <LegalPage document={privacyDocument} settings={bookingOptions.data.settings} />;
}
