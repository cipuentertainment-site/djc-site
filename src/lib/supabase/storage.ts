import { supabaseUrl } from "@/lib/supabase/config";

export const serviceImagesBucket = "service-images";

export function getServiceImageUrl(path?: string | null) {
  if (!supabaseUrl || !path) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${serviceImagesBucket}/${path}`;
}
