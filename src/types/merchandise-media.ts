export type PortfolioItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_path: string | null;
  external_url: string;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export const MERCHANDISE_SIZE_OPTIONS = [
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
  { value: "xxl", label: "XXL" },
  { value: "xxxl", label: "XXXL" },
  { value: "xxxxl", label: "XXXXL" },
  { value: "one_size_fits_all", label: "One size fits all" },
] as const;

export type MerchandiseSize = (typeof MERCHANDISE_SIZE_OPTIONS)[number]["value"];

export type MerchandiseProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_amount: number;
  currency: string;
  image_path: string | null;
  available_colours: string[];
  available_sizes: MerchandiseSize[];
  images?: MerchandiseProductImage[];
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type MerchandiseProductImage = {
  id?: string;
  product_id?: string;
  colour: string;
  image_path: string;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type MerchandiseRequestStatus = "new" | "read" | "contacted" | "completed";

export type MerchandiseRequest = {
  id: string;
  product_id: string | null;
  product_name_snapshot: string;
  product_price_amount_snapshot: number;
  currency: string;
  selected_colour: string | null;
  selected_size: MerchandiseSize | null;
  quantity: number;
  customer_name: string;
  customer_phone: string;
  status: MerchandiseRequestStatus;
  created_at: string;
  updated_at?: string;
};
