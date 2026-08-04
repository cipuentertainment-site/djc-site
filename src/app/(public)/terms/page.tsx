import { LegalPage } from "@/components/public/legal-page";
import { termsDocument } from "@/lib/legal-documents";
import { getPublicBookingOptions } from "@/lib/supabase/public-data";

export default async function TermsPage() {
  const bookingOptions = await getPublicBookingOptions();

  return <LegalPage document={termsDocument} settings={bookingOptions.data.settings} />;
}
