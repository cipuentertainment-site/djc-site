"use client";

import { useState, useTransition } from "react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getServiceImageUrl, serviceImagesBucket } from "@/lib/supabase/storage";

type ServiceImageUploaderProps = {
  value: string;
  onChange: (path: string) => void;
  serviceId?: string;
};

const maxFileSize = 3 * 1024 * 1024;
const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
const extensionContentTypes: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function ServiceImageUploader({
  value,
  onChange,
  serviceId,
}: ServiceImageUploaderProps) {
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const imageUrl = getServiceImageUrl(value);

  function upload(file: File | undefined) {
    if (!file) {
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isImageMime = file.type.startsWith("image/");
    const isAllowedExtension = allowedExtensions.includes(extension);

    if (!isImageMime && !isAllowedExtension) {
      setMessage("Use an image file such as JPG, PNG, WebP, GIF, or AVIF.");
      return;
    }

    if (file.size > maxFileSize) {
      setMessage("Use an image smaller than 3 MB.");
      return;
    }

    startTransition(async () => {
      setMessage(undefined);
      const supabase = createSupabaseBrowserClient();
      const safeExtension = isAllowedExtension ? extension : "jpg";
      const path = `${serviceId ?? "new"}/${crypto.randomUUID()}.${safeExtension}`;
      const oldPath = value || null;
      const { error } = await supabase.storage
        .from(serviceImagesBucket)
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type || extensionContentTypes[safeExtension] || "image/jpeg",
        });

      if (error) {
        setMessage("Image upload failed. Check admin permissions and try again.");
        return;
      }

      onChange(path);

      if (oldPath) {
        await supabase.storage.from(serviceImagesBucket).remove([oldPath]);
      }
    });
  }

  function removeImage() {
    startTransition(async () => {
      const oldPath = value;
      onChange("");

      if (oldPath) {
        const supabase = createSupabaseBrowserClient();
        await supabase.storage.from(serviceImagesBucket).remove([oldPath]);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Service preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No image uploaded
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" asChild disabled={isPending}>
          <label>
            <Upload className="h-4 w-4" />
            {isPending ? "Uploading..." : "Upload image"}
            <input
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
              className="sr-only"
              onChange={(event) => upload(event.target.files?.[0])}
            />
          </label>
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={removeImage}>
            <X className="h-4 w-4" />
            Remove
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
