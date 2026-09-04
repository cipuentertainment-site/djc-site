import Link from "next/link";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHomeServiceSelector } from "@/components/public/public-home-service-selector";
import { formatMoney } from "@/lib/format";
import {
  getMerchandiseImageUrl,
  getPortfolioImageUrl,
} from "@/lib/supabase/storage";
import type { BookingOptions } from "@/types/booking";
import type { MerchandiseProduct, PortfolioItem } from "@/types/merchandise-media";

type PublicHomeProps = {
  options: BookingOptions;
  media: {
    portfolioItems: PortfolioItem[];
    merchandiseProducts: MerchandiseProduct[];
  };
  status: "ready" | "not_configured" | "error";
  errorMessage?: string;
};

export function PublicHome({ options, media, status, errorMessage }: PublicHomeProps) {
  const settings = options.settings;
  const businessName = settings?.business_name ?? "DJC Entertainment";

  return (
    <main className="min-h-screen bg-[#faf8f3] text-neutral-950">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <PublicHomeServiceSelector
          options={options}
          status={status}
          errorMessage={errorMessage}
        />

        {media.portfolioItems.length ? (
          <section className="border-t border-black/10 py-7 sm:py-9">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                  Recent Work
                </p>
                <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                  Moments we have powered.
                </h2>
              </div>
            </div>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {media.portfolioItems.slice(0, 4).map((item) => (
                <PortfolioTile key={item.id} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        {media.merchandiseProducts.length ? (
          <section className="border-t border-black/10 py-7 sm:py-9">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                Merchandise
              </p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                DJC Merchandise
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {media.merchandiseProducts.map((product) => (
                <MerchandiseTile key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

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

function PortfolioTile({ item }: { item: PortfolioItem }) {
  const imageUrl = getPortfolioImageUrl(item.thumbnail_path);

  return (
    <a
      href={item.external_url}
      target="_blank"
      rel="noreferrer"
      className="group relative h-72 w-[78vw] shrink-0 snap-start overflow-hidden rounded-[1.35rem] bg-neutral-950 text-white sm:h-72 sm:w-auto"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={item.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full bg-[linear-gradient(135deg,#161616,#4b3714)]" />
      )}
      <span className="absolute inset-0 bg-gradient-to-t from-black/94 via-black/42 to-black/0" />
      <span className="absolute inset-x-0 bottom-0 p-4">
        <span className="block text-lg font-black leading-tight">{item.title}</span>
        {item.description ? (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-white/72">
            {item.description}
          </span>
        ) : null}
      </span>
    </a>
  );
}

function MerchandiseTile({ product }: { product: MerchandiseProduct }) {
  const imageUrl = getMerchandiseImageUrl(product.image_path);

  return (
    <Link href={`/merchandise/${product.slug}`} className="group block">
      <span className="block aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-white">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-neutral-100 text-xs text-neutral-500">
            No image
          </span>
        )}
      </span>
      <span className="mt-2 block text-sm font-black leading-tight">{product.name}</span>
      <span className="mt-1 block text-sm text-neutral-600">
        {formatMoney(product.price_amount, product.currency)}
      </span>
    </Link>
  );
}
