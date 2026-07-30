import { ImageIcon } from "lucide-react";

import { getServiceImageUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

type ServiceImageProps = {
  imagePath?: string | null;
  name: string;
  className?: string;
};

export function ServiceImage({ imagePath, name, className }: ServiceImageProps) {
  const url = getServiceImageUrl(imagePath);

  return (
    <div className={cn("relative overflow-hidden bg-neutral-100", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_38%),linear-gradient(135deg,#f7f7f4,#e8e5dc)] text-neutral-500">
          <ImageIcon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
