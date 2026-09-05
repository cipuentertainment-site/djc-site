import { createSupabaseServerClient } from "@/lib/supabase/server";
import { bookingPaymentMode } from "@/lib/supabase/config";
import type {
  BookingOptions,
  DateAvailability,
  PublicBookingSettings,
  PublicEventType,
  PublicEventTypeSize,
  PublicEventTypeService,
  PublicService,
  PublicServicePrice,
} from "@/types/booking";
import type {
  MerchandiseProduct,
  MerchandiseProductImage,
  PortfolioItem,
} from "@/types/merchandise-media";

type PublicDataResult =
  | { status: "ready"; data: BookingOptions }
  | { status: "not_configured"; data: BookingOptions }
  | { status: "error"; message: string; data: BookingOptions };

const emptyOptions: BookingOptions = {
  paymentMode: bookingPaymentMode,
  settings: null,
  eventTypes: [],
  eventTypeSizes: [],
  eventTypeServices: [],
  services: [],
  servicePrices: [],
};

export async function getPublicBookingOptions(): Promise<PublicDataResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { status: "not_configured", data: emptyOptions };
  }

  const [settings, eventTypes, eventTypeSizes, eventTypeServices, services, servicePrices] =
    await Promise.all([
      supabase
        .from("global_settings")
        .select(
          "business_name,business_phone,business_whatsapp,business_email,business_logo_url,business_location,business_description,currency,reservation_fee_amount,maximum_events_per_day,transport_disclaimer,homepage_service_ids",
        )
        .eq("id", "default")
        .maybeSingle(),
      supabase
        .from("event_types")
        .select("id,name,slug,description,supports_half_day")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("event_type_sizes")
        .select("id,event_type_id,label,min_attendees,max_attendees")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("event_type_services")
        .select("event_type_id,service_id")
        .eq("is_active", true),
      supabase
        .from("services")
        .select("id,name,slug,description,image_path,supports_half_day")
        .eq("is_active", true)
        .order("sort_order")
        .order("name"),
      supabase
        .from("service_prices")
        .select("id,event_type_id,event_type_size_id,service_id,duration,price_amount,currency")
        .eq("is_active", true),
    ]);

  const firstError =
    settings.error ??
    eventTypes.error ??
    eventTypeSizes.error ??
    eventTypeServices.error ??
    services.error ??
    servicePrices.error;

  const data: BookingOptions = {
    paymentMode: bookingPaymentMode,
    settings: (settings.data as PublicBookingSettings | null) ?? null,
    eventTypes: (eventTypes.data as PublicEventType[] | null) ?? [],
    eventTypeSizes: (eventTypeSizes.data as PublicEventTypeSize[] | null) ?? [],
    eventTypeServices:
      (eventTypeServices.data as PublicEventTypeService[] | null) ?? [],
    services: (services.data as PublicService[] | null) ?? [],
    servicePrices: (servicePrices.data as PublicServicePrice[] | null) ?? [],
  };

  if (firstError) {
    return { status: "error", message: firstError.message, data };
  }

  return { status: "ready", data };
}

export async function getDateAvailability(
  eventDate: string,
): Promise<DateAvailability | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.rpc("get_booking_date_availability", {
    from_date: eventDate,
    to_date: eventDate,
  });

  if (error || !data?.length) {
    return null;
  }

  return data[0] as DateAvailability;
}

export type PublicMediaContent = {
  portfolioItems: PortfolioItem[];
  merchandiseProducts: MerchandiseProduct[];
};

export async function getPublicMediaContent(): Promise<PublicMediaContent> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { portfolioItems: [], merchandiseProducts: [] };
  }

  const [portfolio, merchandise] = await Promise.all([
    supabase
      .from("portfolio_items")
      .select("id,title,slug,description,thumbnail_path,external_url,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("merchandise_products")
      .select("id,name,slug,description,price_amount,currency,image_path,available_colours,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("name")
      .limit(8),
  ]);

  const merchandiseProducts = (merchandise.data as MerchandiseProduct[] | null) ?? [];
  const productImages = await getPublicMerchandiseProductImages(
    merchandiseProducts.map((product) => product.id),
  );

  return {
    portfolioItems: (portfolio.data as PortfolioItem[] | null) ?? [],
    merchandiseProducts: attachMerchandiseImages(merchandiseProducts, productImages),
  };
}

export async function getPublicMerchandiseProduct(
  slug: string,
): Promise<MerchandiseProduct | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const result = await supabase
    .from("merchandise_products")
    .select("id,name,slug,description,price_amount,currency,image_path,available_colours,is_active,sort_order")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (result.error) {
    return null;
  }

  const product = (result.data as MerchandiseProduct | null) ?? null;

  if (!product) {
    return null;
  }

  return {
    ...product,
    images: await getPublicMerchandiseProductImages([product.id]),
  };
}

async function getPublicMerchandiseProductImages(productIds: string[]) {
  if (!productIds.length) {
    return [];
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const result = await supabase
    .from("merchandise_product_images")
    .select("id,product_id,colour,image_path,is_active,sort_order")
    .in("product_id", productIds)
    .eq("is_active", true)
    .order("sort_order");

  if (result.error) {
    return [];
  }

  return (result.data as MerchandiseProductImage[] | null) ?? [];
}

function attachMerchandiseImages(
  products: MerchandiseProduct[],
  images: MerchandiseProductImage[],
) {
  return products.map((product) => ({
    ...product,
    images: images.filter((image) => image.product_id === product.id),
  }));
}
