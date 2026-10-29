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

  return (
    <footer className="mt-10 rounded-[1.5rem] border border-black/10 bg-white px-5 py-7 text-neutral-600 shadow-sm sm:mt-14 sm:rounded-[1.75rem] sm:px-8 sm:py-8">
      <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-8">
        <div className="col-span-2 sm:col-span-1">
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
          <p className="mt-3 max-w-[15rem] text-xs leading-5 text-neutral-500">
            Professional DJ, MC, and event sound services for celebrations of every size.
          </p>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-950">
            Quick links
          </p>
          <nav className="mt-3 space-y-2 text-xs leading-4">
            <Link className="block transition hover:text-neutral-950" href="/">
              Home
            </Link>
            <Link className="block transition hover:text-neutral-950" href="/#services">
              Our services
            </Link>
            <Link className="block transition hover:text-neutral-950" href="/book">
              Book an event
            </Link>
            <Link className="block transition hover:text-neutral-950" href="/terms">
              Terms &amp; Conditions
            </Link>
          </nav>
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-950">
            Our services
          </p>
          <ul className="mt-3 space-y-2 text-xs leading-4 text-neutral-500">
            <li>DJ entertainment</li>
            <li>MC services</li>
            <li>Event sound</li>
            <li>Weddings &amp; parties</li>
          </ul>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-neutral-950">
            Contact us
          </p>
          <div className="mt-3 space-y-2.5 text-xs leading-4">
            {phone && phoneHref ? (
              <a className="flex items-start gap-2 transition hover:text-neutral-950" href={phoneHref}>
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
                <span className="break-words">{phone}</span>
              </a>
            ) : null}
            {whatsapp && whatsappHref ? (
              <a
                className="flex items-start gap-2 transition hover:text-neutral-950"
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500"
                  aria-hidden="true"
                />
                <span>WhatsApp</span>
              </a>
            ) : null}
            {email ? (
              <a
                className="flex items-start gap-2 transition hover:text-neutral-950"
                href={`mailto:${email}`}
              >
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
                <span className="break-words">{email}</span>
              </a>
            ) : null}
            {location ? (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
                <span className="break-words">{location}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 border-t border-black/10 pt-4 text-[10px] text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>
          &copy; {currentYear} {businessName}. All rights reserved.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <Link className="transition hover:text-neutral-950" href="/privacy">
            Privacy Notice
          </Link>
          <Link className="transition hover:text-neutral-950" href="/terms">
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}
