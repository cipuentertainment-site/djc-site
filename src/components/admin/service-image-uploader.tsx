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
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

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

    if (!allowedTypes.includes(file.type)) {
      setMessage("Use a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > maxFileSize) {
      setMessage("Use an image smaller than 3 MB.");
      return;
    }

    startTransition(async () => {
      setMessage(undefined);
      const supabase = createSupabaseBrowserClient();
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${serviceId ?? "new"}/${crypto.randomUUID()}.${extension}`;
      const oldPath = value || null;
      const { error } = await supabase.storage
        .from(serviceImagesBucket)
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type,
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
              accept="image/jpeg,image/png,image/webp"
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
