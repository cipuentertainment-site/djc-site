import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MerchandiseRequestForm } from "@/components/public/merchandise-request-form";
import { PublicFooter } from "@/components/public/public-footer";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { getPublicBookingOptions, getPublicMerchandiseProduct } from "@/lib/supabase/public-data";
import { getMerchandiseImageUrl } from "@/lib/supabase/storage";

type MerchandiseProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function MerchandiseProductPage({
  params,
}: MerchandiseProductPageProps) {
  const { slug } = await params;
  const [product, bookingOptions] = await Promise.all([
    getPublicMerchandiseProduct(slug),
    getPublicBookingOptions(),
  ]);

  if (!product) {
    notFound();
  }

  const settings = bookingOptions.data.settings;
  const businessName = settings?.business_name ?? "DJC Entertainment";
  const imageUrl = getMerchandiseImageUrl(product.image_path);

  return (
    <main className="min-h-screen bg-[#faf8f3] px-4 py-4 text-neutral-950 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-5 flex h-14 items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 text-sm font-black">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-sm ring-1 ring-black/10">
              <Image
                src="/brand/logo-transparent.png"
                alt={`${businessName} logo`}
                width={128}
                height={64}
                priority
                className="max-h-6 max-w-6 object-contain"
              />
            </span>
            <span className="truncate">{businessName}</span>
          </Link>
          <Button
            asChild
            size="sm"
            className="h-9 rounded-full bg-neutral-950 px-4 text-xs font-black text-white hover:bg-neutral-800"
          >
            <Link href="/">Home</Link>
          </Button>
        </header>

        <section className="grid gap-6 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-white">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-neutral-100 text-sm text-neutral-500">
                No product image
              </div>
            )}
          </div>

          <div className="space-y-6 lg:pt-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">
                DJC Merchandise
              </p>
              <h1 className="mt-2 text-4xl font-black leading-none sm:text-5xl">
                {product.name}
              </h1>
              <p className="mt-3 text-xl font-black">
                {formatMoney(product.price_amount, product.currency)}
              </p>
              {product.description ? (
                <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-600">
                  {product.description}
                </p>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-neutral-500">
                No online payment is required here. Send a request and DJC
                Entertainment will contact you to confirm details.
              </p>
            </div>

            <MerchandiseRequestForm product={product} />
          </div>
        </section>

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
