"use client";

import { useMemo, useState, useTransition } from "react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  getStorageImageUrl,
  serviceImagesBucket,
} from "@/lib/supabase/storage";

type ServiceImageUploaderProps = {
  value: string;
  onChange: (path: string) => void;
  serviceId?: string;
  bucket?: string;
};

const maxSourceFileSize = 12 * 1024 * 1024;
const maxUploadFileSize = 3 * 1024 * 1024;
const maxImageDimension = 1600;
const imageQuality = 0.82;
const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"];
const uploadableContentTypes = ["image/jpeg", "image/png", "image/webp"];
const extensionContentTypes: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

async function imageToBitmap(file: File) {
  if ("createImageBitmap" in window) {
    return window.createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function compressImage(file: File, extension: string) {
  try {
    const bitmap = await imageToBitmap(file);
    const width = "naturalWidth" in bitmap ? bitmap.naturalWidth : bitmap.width;
    const height = "naturalHeight" in bitmap ? bitmap.naturalHeight : bitmap.height;
    const scale = Math.min(1, maxImageDimension / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is unavailable.");
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    if ("close" in bitmap) {
      bitmap.close();
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", imageQuality);
    });

    if (!blob || blob.size >= file.size) {
      return {
        file,
        extension,
        contentType: file.type || extensionContentTypes[extension] || "image/jpeg",
        compressed: false,
      };
    }

    return {
      file: new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
        type: "image/webp",
      }),
      extension: "webp",
      contentType: "image/webp",
      compressed: true,
    };
  } catch {
    const contentType = file.type || extensionContentTypes[extension] || "image/jpeg";

    if (!uploadableContentTypes.includes(contentType)) {
      throw new Error("Unsupported image format.");
    }

    return {
      file,
      extension,
      contentType,
      compressed: false,
    };
  }
}

export function ServiceImageUploader({
  value,
  onChange,
  serviceId,
  bucket = serviceImagesBucket,
}: ServiceImageUploaderProps) {
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();
  const draftFolder = useMemo(() => crypto.randomUUID(), []);
  const imageUrl = getStorageImageUrl(value, bucket);
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const imageFailed = Boolean(imageUrl && failedImageUrl === imageUrl);

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

    if (file.size > maxSourceFileSize) {
      setMessage("Use an image smaller than 12 MB.");
      return;
    }

    startTransition(async () => {
      setMessage(undefined);
      const supabase = createSupabaseBrowserClient();
      const safeExtension = isAllowedExtension ? extension : "jpg";
      let optimized: Awaited<ReturnType<typeof compressImage>>;

      try {
        optimized = await compressImage(file, safeExtension);
      } catch {
        setMessage("This image format could not be optimized. Use JPG, PNG, or WebP.");
        return;
      }

      if (optimized.file.size > maxUploadFileSize) {
        setMessage("Image is still too large after optimization. Use a smaller image.");
        return;
      }

      const folder = serviceId ?? `draft/${draftFolder}`;
      const path = `${folder}/${crypto.randomUUID()}.${optimized.extension}`;
      const oldPath = value || null;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, optimized.file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: optimized.contentType,
        });

      if (error) {
        setMessage("Image upload failed. Check admin permissions and try again.");
        return;
      }

      onChange(path);
      setMessage(
        optimized.compressed
          ? "Image optimized for fast loading. Save the service to keep it."
          : "Image uploaded. Save the service to keep it.",
      );

      if (oldPath) {
        await supabase.storage.from(bucket).remove([oldPath]);
      }
    });
  }

  function removeImage() {
    startTransition(async () => {
      const oldPath = value;
      onChange("");

      if (oldPath) {
        const supabase = createSupabaseBrowserClient();
        await supabase.storage.from(bucket).remove([oldPath]);
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="aspect-[16/9] overflow-hidden rounded-lg border bg-muted">
        {imageUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Upload preview"
            className="h-full w-full object-cover"
            onError={() => setFailedImageUrl(imageUrl)}
          />
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
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.heic,.heif"
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
