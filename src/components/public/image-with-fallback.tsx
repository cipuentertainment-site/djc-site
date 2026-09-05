"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

type ImageWithFallbackProps = {
  src: string | null;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export function ImageWithFallback({
  src,
  alt,
  className,
  loading = "lazy",
}: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-neutral-100 text-xs text-neutral-500">
      <ImageIcon className="h-7 w-7" aria-hidden="true" />
      No image
    </span>
  );
}
