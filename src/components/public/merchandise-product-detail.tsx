"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

import { MerchandiseRequestForm } from "@/components/public/merchandise-request-form";
import { formatMoney } from "@/lib/format";
import { getMerchandiseImagePath } from "@/lib/merchandise-images";
import { getMerchandiseImageUrl } from "@/lib/supabase/storage";
import type { MerchandiseProduct } from "@/types/merchandise-media";

type MerchandiseProductDetailProps = {
  product: MerchandiseProduct;
};

export function MerchandiseProductDetail({ product }: MerchandiseProductDetailProps) {
  const [selectedColour, setSelectedColour] = useState(
    product.available_colours[0] ?? "",
  );
  const imagePath = getMerchandiseImagePath(product, selectedColour);
  const imageUrl = getMerchandiseImageUrl(imagePath);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageFailed = Boolean(imageUrl && failedImageUrl === imageUrl);

  return (
    <section className="grid gap-6 pb-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <div className="aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-white">
        {imageUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={selectedColour ? `${product.name} - ${selectedColour}` : product.name}
            className="h-full w-full object-cover"
            onError={() => setFailedImageUrl(imageUrl)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-neutral-100 text-sm text-neutral-500">
            <ImageIcon className="h-8 w-8" aria-hidden="true" />
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

        <MerchandiseRequestForm
          product={product}
          selectedColour={selectedColour}
          onSelectedColourChange={setSelectedColour}
        />
      </div>
    </section>
  );
}
