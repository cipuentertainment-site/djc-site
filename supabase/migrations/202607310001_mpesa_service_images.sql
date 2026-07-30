alter table public.services
add column if not exists image_path text;

create type public.payment_provider as enum ('mpesa');
create type public.payment_status as enum ('pending', 'success', 'failed', 'cancelled', 'expired');

create table public.reservation_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  provider public.payment_provider not null default 'mpesa',
  status public.payment_status not null default 'pending',
  amount integer not null,
  currency text not null default 'KES',
  phone_number text not null,
  internal_reference text not null,
  merchant_request_id text,
  checkout_request_id text,
  mpesa_receipt_number text,
  result_code integer,
  result_description text,
  callback_payload jsonb,
  booking_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint reservation_payments_amount_positive check (amount > 0),
  constraint reservation_payments_currency_not_blank check (length(trim(currency)) between 3 and 12),
  constraint reservation_payments_phone_not_blank check (length(trim(phone_number)) > 0),
  constraint reservation_payments_internal_reference_unique unique (internal_reference),
  constraint reservation_payments_checkout_request_unique unique (checkout_request_id)
);

create index reservation_payments_status_idx on public.reservation_payments (status);
create index reservation_payments_checkout_idx on public.reservation_payments (checkout_request_id);
create index reservation_payments_created_idx on public.reservation_payments (created_at desc);

create trigger set_reservation_payments_updated_at
before update on public.reservation_payments
for each row execute function public.set_updated_at();

alter table public.reservation_payments enable row level security;

create policy "Admins can manage reservation payments"
on public.reservation_payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can read service images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'service-images');

create policy "Admins can upload service images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'service-images' and public.is_admin());

create policy "Admins can update service images"
on storage.objects
for update
to authenticated
using (bucket_id = 'service-images' and public.is_admin())
with check (bucket_id = 'service-images' and public.is_admin());

create policy "Admins can delete service images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'service-images' and public.is_admin());
