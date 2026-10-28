import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

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
    <footer className="relative mt-10 overflow-hidden rounded-[2rem] bg-neutral-950 px-5 py-7 text-white shadow-[0_18px_50px_rgba(23,23,23,0.12)] sm:mt-14 sm:px-8 sm:py-9">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="flex items-start gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-lg shadow-black/20">
              <Image
                src="/brand/logo-transparent.png"
                alt={`${businessName} logo`}
                width={132}
                height={85}
                className="max-h-9 max-w-10 object-contain"
              />
            </span>
            <div>
              <p className="text-base font-black tracking-tight text-white">{businessName}</p>
              <p className="mt-1 max-w-sm text-sm leading-5 text-white/60">
                Sound, energy, and unforgettable moments for every kind of event.
              </p>
            </div>
          </div>

          <Link
            href="/book"
            className="group inline-flex w-fit items-center gap-2 rounded-full bg-amber-400 px-4 py-2.5 text-xs font-black text-neutral-950 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
          >
            Plan your event
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="my-7 h-px bg-white/10" />

        <div className="grid gap-7 sm:grid-cols-[0.75fr_1.25fr] sm:gap-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
              Get in touch
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-white/65">
              Tell us what you are planning and we will help you make it sound and feel right.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-white/75">
              <Link className="transition hover:text-amber-300" href="/">
                Home
              </Link>
              <Link className="transition hover:text-amber-300" href="/book">
                Book an event
              </Link>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {phone && phoneHref ? (
              <a
                href={phoneHref}
                className="group flex min-w-0 items-center gap-3 rounded-2xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                  <Phone className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Call us
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-bold text-white/85 group-hover:text-amber-300">
                    {phone}
                  </span>
                </span>
              </a>
            ) : null}

            {whatsapp && whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="group flex min-w-0 items-center gap-3 rounded-2xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    WhatsApp
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-bold text-white/85 group-hover:text-amber-300">
                    Chat with us
                  </span>
                </span>
              </a>
            ) : null}

            {email ? (
              <a
                href={`mailto:${email}`}
                className="group flex min-w-0 items-center gap-3 rounded-2xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Email
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-bold text-white/85 group-hover:text-amber-300">
                    {email}
                  </span>
                </span>
              </a>
            ) : null}

            {location ? (
              <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                    Based in
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-bold text-white/85">
                    {location}
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-4 text-[11px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {currentYear} {businessName}. All rights reserved.
          </p>
          <div className="flex gap-4 font-bold">
            <Link className="transition hover:text-white" href="/terms">
              Terms &amp; Conditions
            </Link>
            <Link className="transition hover:text-white" href="/privacy">
              Privacy Notice
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
