import Link from "next/link";

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

  return (
    <footer className="border-t border-black/10 py-6 text-sm text-neutral-600">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <p className="font-black text-neutral-950">{businessName}</p>
          <p className="mt-1 max-w-md text-xs leading-5 text-neutral-500">
            Professional DJ, MC, and event sound services for weddings, parties,
            corporate events, and celebrations.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
            <Link className="hover:text-neutral-950" href="/terms">
              Terms & Conditions
            </Link>
            <Link className="hover:text-neutral-950" href="/privacy">
              Privacy Notice
            </Link>
          </div>
        </div>
        <div className="space-y-1 text-left text-xs sm:text-right">
          {phone ? <p>Phone: {phone}</p> : null}
          {whatsapp ? <p>WhatsApp: {whatsapp}</p> : null}
          {email ? <p>Email: {email}</p> : null}
          {location ? <p>Location: {location}</p> : null}
        </div>
      </div>
      <div className="mt-5 border-t border-black/10 pt-4 text-xs text-neutral-500">
        <p>
          &copy; {currentYear} {businessName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
