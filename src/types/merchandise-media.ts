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

export type MerchandiseProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_amount: number;
  currency: string;
  image_path: string | null;
  available_colours: string[];
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
  quantity: number;
  customer_name: string;
  customer_phone: string;
  status: MerchandiseRequestStatus;
  created_at: string;
  updated_at?: string;
};
