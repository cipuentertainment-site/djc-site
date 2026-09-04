import { supabaseUrl } from "@/lib/supabase/config";

export const serviceImagesBucket = "service-images";
export const portfolioImagesBucket = "portfolio-images";
export const merchandiseImagesBucket = "merchandise-images";

export function getStorageImageUrl(path: string | null | undefined, bucket: string) {
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
    .replace(new RegExp(`^${bucket}/`), "");
  const encodedPath = normalizedPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
}

export function getServiceImageUrl(path?: string | null) {
  return getStorageImageUrl(path, serviceImagesBucket);
}

export function getPortfolioImageUrl(path?: string | null) {
  return getStorageImageUrl(path, portfolioImagesBucket);
}

export function getMerchandiseImageUrl(path?: string | null) {
  return getStorageImageUrl(path, merchandiseImagesBucket);
}
