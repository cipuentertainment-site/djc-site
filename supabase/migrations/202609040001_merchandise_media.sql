do $$
begin
  if not exists (select 1 from pg_type where typname = 'merchandise_request_status') then
    create type public.merchandise_request_status as enum (
      'new',
      'read',
      'contacted',
      'completed'
    );
  end if;
end
$$;

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text,
  thumbnail_path text,
  external_url text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_items_title_not_blank check (length(trim(title)) > 0),
  constraint portfolio_items_url_valid check (external_url ~* '^https?://'),
  constraint portfolio_items_slug_unique unique (slug)
);

create table if not exists public.merchandise_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  price_amount integer not null,
  currency text not null default 'KES',
  image_path text,
  available_colours text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchandise_products_name_not_blank check (length(trim(name)) > 0),
  constraint merchandise_products_price_non_negative check (price_amount >= 0),
  constraint merchandise_products_currency_not_blank check (length(trim(currency)) between 3 and 12),
  constraint merchandise_products_slug_unique unique (slug)
);

create table if not exists public.merchandise_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.merchandise_products(id) on delete set null,
  product_name_snapshot text not null,
  product_price_amount_snapshot integer not null,
  currency text not null default 'KES',
  selected_colour text,
  quantity integer not null default 1,
  customer_name text not null,
  customer_phone text not null,
  status public.merchandise_request_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchandise_requests_product_name_not_blank check (length(trim(product_name_snapshot)) > 0),
  constraint merchandise_requests_price_non_negative check (product_price_amount_snapshot >= 0),
  constraint merchandise_requests_quantity_positive check (quantity > 0 and quantity <= 50),
  constraint merchandise_requests_customer_name_not_blank check (length(trim(customer_name)) > 0),
  constraint merchandise_requests_customer_phone_not_blank check (length(trim(customer_phone)) > 0),
  constraint merchandise_requests_currency_not_blank check (length(trim(currency)) between 3 and 12)
);

create index if not exists portfolio_items_public_idx
on public.portfolio_items (is_active, sort_order, created_at desc);

create index if not exists merchandise_products_public_idx
on public.merchandise_products (is_active, sort_order, name);

create index if not exists merchandise_requests_status_created_idx
on public.merchandise_requests (status, created_at desc);

create trigger set_portfolio_items_updated_at
before update on public.portfolio_items
for each row execute function public.set_updated_at();

create trigger set_merchandise_products_updated_at
before update on public.merchandise_products
for each row execute function public.set_updated_at();

create trigger set_merchandise_requests_updated_at
before update on public.merchandise_requests
for each row execute function public.set_updated_at();

alter table public.portfolio_items enable row level security;
alter table public.merchandise_products enable row level security;
alter table public.merchandise_requests enable row level security;

create policy "Public can view active portfolio items"
on public.portfolio_items
for select
to anon, authenticated
using (is_active);

create policy "Admins can manage portfolio items"
on public.portfolio_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can view active merchandise"
on public.merchandise_products
for select
to anon, authenticated
using (is_active);

create policy "Admins can manage merchandise"
on public.merchandise_products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage merchandise requests"
on public.merchandise_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'portfolio-images',
    'portfolio-images',
    true,
    3145728,
    array['image/jpeg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/webp', 'image/gif', 'image/avif']
  ),
  (
    'merchandise-images',
    'merchandise-images',
    true,
    3145728,
    array['image/jpeg', 'image/pjpeg', 'image/png', 'image/x-png', 'image/webp', 'image/gif', 'image/avif']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read portfolio images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'portfolio-images');

create policy "Admins can upload portfolio images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'portfolio-images' and public.is_admin());

create policy "Admins can update portfolio images"
on storage.objects
for update
to authenticated
using (bucket_id = 'portfolio-images' and public.is_admin())
with check (bucket_id = 'portfolio-images' and public.is_admin());

create policy "Admins can delete portfolio images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'portfolio-images' and public.is_admin());

create policy "Public can read merchandise images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'merchandise-images');

create policy "Admins can upload merchandise images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'merchandise-images' and public.is_admin());

create policy "Admins can update merchandise images"
on storage.objects
for update
to authenticated
using (bucket_id = 'merchandise-images' and public.is_admin())
with check (bucket_id = 'merchandise-images' and public.is_admin());

create policy "Admins can delete merchandise images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'merchandise-images' and public.is_admin());
