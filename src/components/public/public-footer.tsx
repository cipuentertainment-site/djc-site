import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

type PublicFooterProps = {
  businessName: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  location?: string | null;
};

export function PublicFooter({
  businessName,
  phone,
  whatsapp,
  email,
  location,
}: PublicFooterProps) {
  const currentYear = new Date().getFullYear();
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : null;
  const whatsappHref = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, "")}` : null;
  const contactHref = email ? `mailto:${email}` : phoneHref ?? whatsappHref;
  const interactiveLinkClass =
    "underline decoration-neutral-300 underline-offset-4 transition hover:text-neutral-950 hover:decoration-amber-500";

  return (
    <footer className="mt-10 border-t border-orange-200/80 bg-[#fff7ed] py-8 text-neutral-600 sm:mt-14 sm:py-10">
      <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-start sm:gap-12">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-950">
            <span className="flex h-8 w-10 items-center justify-center">
              <Image
                src="/brand/logo-transparent.png"
                alt={`${businessName} logo`}
                width={132}
                height={85}
                className="max-h-7 max-w-10 object-contain"
              />
            </span>
            <span className="text-sm font-black tracking-tight">{businessName}</span>
          </Link>
          <p className="mt-3 max-w-sm text-xs leading-5 text-neutral-500">
            Professional DJ, MC, and event sound services for celebrations of every size.
          </p>
        </div>

        <div className="sm:min-w-[18rem] sm:max-w-sm">
          {contactHref ? (
            <a
              href={contactHref}
              className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800 underline decoration-amber-300 underline-offset-4 transition hover:text-amber-950 hover:decoration-amber-500"
            >
              Contact us
            </a>
          ) : (
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-800">
              Contact us
            </p>
          )}
          <div className="mt-3 grid gap-2 text-xs leading-4 sm:grid-cols-2 sm:gap-x-6">
            {phone && phoneHref ? (
              <a className={`flex items-start gap-2 ${interactiveLinkClass}`} href={phoneHref}>
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
                <span className="break-words">{phone}</span>
              </a>
            ) : null}
            {whatsapp && whatsappHref ? (
              <a
                className={`flex items-start gap-2 ${interactiveLinkClass}`}
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500"
                  aria-hidden="true"
                />
                <span>Chat on WhatsApp</span>
              </a>
            ) : null}
            {email ? (
              <a
                className={`flex items-start gap-2 ${interactiveLinkClass}`}
                href={`mailto:${email}`}
              >
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
                <span className="break-words">{email}</span>
              </a>
            ) : null}
            {location ? (
              <div className="flex items-start gap-2 text-neutral-500">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="break-words">{location}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 border-t border-orange-200/70 pt-4 text-[10px] text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {currentYear} {businessName}. All rights reserved.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link className={interactiveLinkClass} href="/privacy">
            Privacy Notice
          </Link>
          <Link className={interactiveLinkClass} href="/terms">
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
