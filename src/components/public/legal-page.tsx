import Link from "next/link";

import { PublicFooter } from "@/components/public/public-footer";
import { Button } from "@/components/ui/button";
import type { LegalDocument } from "@/lib/legal-documents";
import type { PublicBookingSettings } from "@/types/booking";

type LegalPageProps = {
  document: LegalDocument;
  settings: PublicBookingSettings | null;
};

export function LegalPage({ document, settings }: LegalPageProps) {
  const businessName = settings?.business_name ?? "DJC Entertainment";

  return (
    <main className="min-h-screen bg-[#f7f4ee] px-4 py-4 text-neutral-950 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-4 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-black">
            {businessName}
          </Link>
          <Button asChild variant="outline" size="sm" className="border-neutral-300 bg-white/70">
            <Link href="/">Home</Link>
          </Button>
        </header>

        <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">
            Effective Date: {document.effectiveDate}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-normal sm:text-4xl">
            {document.title}
          </h1>
          <div className="mt-8 space-y-7">
            {document.sections.map((section, sectionIndex) => (
              <section key={section.heading ?? sectionIndex} className="space-y-3">
                {section.heading ? (
                  <h2 className="text-lg font-black">{section.heading}</h2>
                ) : null}
                {section.blocks.map((block, blockIndex) =>
                  block.type === "paragraph" ? (
                    <p key={blockIndex} className="leading-7 text-neutral-700">
                      {block.text}
                    </p>
                  ) : (
                    <ul
                      key={blockIndex}
                      className="list-disc space-y-2 pl-5 leading-7 text-neutral-700"
                    >
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ),
                )}
              </section>
            ))}
          </div>
        </article>

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
