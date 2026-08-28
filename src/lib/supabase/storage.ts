import { supabaseUrl } from "@/lib/supabase/config";

export const serviceImagesBucket = "service-images";

export function getServiceImageUrl(path?: string | null) {
  const value = path?.trim();

  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (!supabaseUrl) {
    return null;
  }

  const normalizedPath = value
    .replace(/^\/+/, "")
    .replace(new RegExp(`^${serviceImagesBucket}/`), "");
  const encodedPath = normalizedPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${serviceImagesBucket}/${encodedPath}`;
}
