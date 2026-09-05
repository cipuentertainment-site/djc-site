create table if not exists public.merchandise_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.merchandise_products(id) on delete cascade,
  colour text not null,
  image_path text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchandise_product_images_colour_not_blank check (length(trim(colour)) > 0),
  constraint merchandise_product_images_path_not_blank check (length(trim(image_path)) > 0)
);

create unique index if not exists merchandise_product_images_product_colour_unique_idx
on public.merchandise_product_images (product_id, lower(trim(colour)));

create index if not exists merchandise_product_images_product_idx
on public.merchandise_product_images (product_id, is_active, sort_order);

drop trigger if exists set_merchandise_product_images_updated_at
on public.merchandise_product_images;

create trigger set_merchandise_product_images_updated_at
before update on public.merchandise_product_images
for each row execute function public.set_updated_at();

alter table public.merchandise_product_images enable row level security;

create policy "Public can view active merchandise product images"
on public.merchandise_product_images
for select
to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.merchandise_products
    where merchandise_products.id = merchandise_product_images.product_id
      and merchandise_products.is_active = true
  )
);

create policy "Admins can manage merchandise product images"
on public.merchandise_product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
