create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

create type public.event_size_label as enum ('small', 'medium', 'large');
create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'rejected', 'cancelled');
create type public.reservation_payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type public.admin_role as enum ('owner', 'manager');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.global_settings (
  id text primary key default 'default',
  business_name text not null default 'DJC Events',
  business_phone text,
  business_whatsapp text,
  business_email text,
  currency text not null default 'KES',
  reservation_fee_amount integer not null default 100,
  maximum_events_per_day integer not null default 3,
  transport_disclaimer text not null default 'Transport charges are quoted separately.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_settings_singleton check (id = 'default'),
  constraint global_settings_currency_not_blank check (length(trim(currency)) between 3 and 12),
  constraint global_settings_reservation_fee_non_negative check (reservation_fee_amount >= 0),
  constraint global_settings_capacity_positive check (maximum_events_per_day > 0)
);

insert into public.global_settings (id)
values ('default')
on conflict (id) do nothing;

create table public.event_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_types_name_not_blank check (length(trim(name)) > 0),
  constraint event_types_slug_not_blank check (length(trim(slug)) > 0),
  constraint event_types_name_unique unique (name),
  constraint event_types_slug_unique unique (slug)
);

create table public.event_type_sizes (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.event_types(id) on delete cascade,
  label public.event_size_label not null,
  min_attendees integer not null,
  max_attendees integer not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_type_sizes_min_non_negative check (min_attendees >= 0),
  constraint event_type_sizes_valid_range check (min_attendees <= max_attendees),
  constraint event_type_sizes_unique_label unique (event_type_id, label),
  constraint event_type_sizes_event_id_pair unique (event_type_id, id),
  constraint event_type_sizes_no_active_overlap exclude using gist (
    event_type_id with =,
    int4range(min_attendees, max_attendees, '[]') with &&
  ) where (is_active)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_not_blank check (length(trim(name)) > 0),
  constraint services_slug_not_blank check (length(trim(slug)) > 0),
  constraint services_name_unique unique (name),
  constraint services_slug_unique unique (slug)
);

insert into public.services (name, slug, description, sort_order)
values
  ('DJ', 'dj', 'Music planning and live performance.', 10),
  ('MC', 'mc', 'Professional hosting and event flow support.', 20),
  ('Sound System', 'sound-system', 'Audio setup sized to the venue and audience.', 30)
on conflict (slug) do nothing;

create table public.service_prices (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.event_types(id) on delete cascade,
  event_type_size_id uuid not null references public.event_type_sizes(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  price_amount integer not null,
  currency text not null default 'KES',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_prices_price_non_negative check (price_amount >= 0),
  constraint service_prices_currency_not_blank check (length(trim(currency)) between 3 and 12),
  constraint service_prices_unique_combination unique (event_type_id, event_type_size_id, service_id),
  constraint service_prices_size_belongs_to_event_type
    foreign key (event_type_id, event_type_size_id)
    references public.event_type_sizes(event_type_id, id)
    on delete cascade
);

create table public.date_blocks (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid references public.event_types(id) on delete set null,
  event_type_name_snapshot text not null,
  event_type_size_id uuid references public.event_type_sizes(id) on delete set null,
  event_size_label_snapshot public.event_size_label not null,
  event_size_min_attendees_snapshot integer not null,
  event_size_max_attendees_snapshot integer not null,
  attendee_count integer not null,
  event_date date not null,
  county text not null,
  location_text text not null,
  customer_name text not null,
  customer_phone text not null,
  estimated_service_total_amount integer not null,
  currency text not null default 'KES',
  transport_disclaimer_snapshot text not null,
  reservation_fee_amount integer not null,
  reservation_fee_payment_status public.reservation_payment_status not null default 'pending',
  reservation_fee_payment_reference text,
  reservation_fee_paid_at timestamptz,
  status public.booking_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_attendee_count_non_negative check (attendee_count >= 0),
  constraint bookings_size_snapshot_valid check (
    event_size_min_attendees_snapshot <= event_size_max_attendees_snapshot
  ),
  constraint bookings_attendees_match_snapshot check (
    attendee_count between event_size_min_attendees_snapshot and event_size_max_attendees_snapshot
  ),
  constraint bookings_total_non_negative check (estimated_service_total_amount >= 0),
  constraint bookings_reservation_fee_non_negative check (reservation_fee_amount >= 0),
  constraint bookings_currency_not_blank check (length(trim(currency)) between 3 and 12),
  constraint bookings_location_not_blank check (length(trim(location_text)) > 0),
  constraint bookings_customer_name_not_blank check (length(trim(customer_name)) > 0),
  constraint bookings_customer_phone_not_blank check (length(trim(customer_phone)) > 0),
  constraint bookings_paid_status_requires_timestamp check (
    reservation_fee_payment_status <> 'paid'
    or reservation_fee_paid_at is not null
  )
);

create table public.booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  price_amount_snapshot integer not null,
  currency text not null default 'KES',
  created_at timestamptz not null default now(),
  constraint booking_services_price_non_negative check (price_amount_snapshot >= 0),
  constraint booking_services_name_not_blank check (length(trim(service_name_snapshot)) > 0),
  constraint booking_services_currency_not_blank check (length(trim(currency)) between 3 and 12),
  constraint booking_services_unique_service_per_booking unique (booking_id, service_id)
);

create table public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.admin_role not null default 'manager',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_types_active_sort_idx on public.event_types (is_active, sort_order, name);
create index event_type_sizes_event_type_idx on public.event_type_sizes (event_type_id, is_active, sort_order);
create index services_active_sort_idx on public.services (is_active, sort_order, name);
create index service_prices_lookup_idx on public.service_prices (event_type_id, event_type_size_id, service_id, is_active);
create index bookings_event_date_status_idx on public.bookings (event_date, status);
create index bookings_customer_phone_idx on public.bookings (customer_phone);
create index booking_services_booking_idx on public.booking_services (booking_id);
create index date_blocks_event_date_active_idx on public.date_blocks (event_date, is_active);
create unique index date_blocks_one_active_per_date_idx
on public.date_blocks (event_date)
where is_active = true;

create trigger set_global_settings_updated_at
before update on public.global_settings
for each row execute function public.set_updated_at();

create trigger set_event_types_updated_at
before update on public.event_types
for each row execute function public.set_updated_at();

create trigger set_event_type_sizes_updated_at
before update on public.event_type_sizes
for each row execute function public.set_updated_at();

create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create trigger set_service_prices_updated_at
before update on public.service_prices
for each row execute function public.set_updated_at();

create trigger set_date_blocks_updated_at
before update on public.date_blocks
for each row execute function public.set_updated_at();

create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create trigger set_admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();

create or replace function public.enforce_confirmed_booking_capacity()
returns trigger
language plpgsql
as $$
declare
  max_capacity integer;
  confirmed_count integer;
  block_exists boolean;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  select maximum_events_per_day
  into max_capacity
  from public.global_settings
  where id = 'default';

  select exists (
    select 1
    from public.date_blocks
    where event_date = new.event_date
      and is_active = true
  )
  into block_exists;

  if block_exists then
    raise exception 'event date % is blocked', new.event_date;
  end if;

  select count(*)
  into confirmed_count
  from public.bookings
  where event_date = new.event_date
    and status = 'confirmed'
    and id <> new.id;

  if confirmed_count >= max_capacity then
    raise exception 'confirmed booking capacity reached for %', new.event_date;
  end if;

  return new;
end;
$$;

create trigger enforce_confirmed_booking_capacity_before_write
before insert or update of status, event_date on public.bookings
for each row execute function public.enforce_confirmed_booking_capacity();

create or replace function public.get_booking_date_availability(
  from_date date,
  to_date date
)
returns table (
  event_date date,
  confirmed_count integer,
  maximum_events_per_day integer,
  is_blocked boolean,
  block_reason text,
  is_available boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with settings as (
    select maximum_events_per_day
    from public.global_settings
    where id = 'default'
  ),
  days as (
    select generate_series(from_date, to_date, interval '1 day')::date as event_date
  ),
  confirmed as (
    select event_date, count(*)::integer as confirmed_count
    from public.bookings
    where status = 'confirmed'
      and event_date between from_date and to_date
    group by event_date
  ),
  blocks as (
    select event_date, string_agg(reason, '; ' order by created_at) as block_reason
    from public.date_blocks
    where is_active = true
      and event_date between from_date and to_date
    group by event_date
  )
  select
    days.event_date,
    coalesce(confirmed.confirmed_count, 0) as confirmed_count,
    settings.maximum_events_per_day,
    blocks.event_date is not null as is_blocked,
    blocks.block_reason,
    days.event_date >= current_date
      and blocks.event_date is null
      and coalesce(confirmed.confirmed_count, 0) < settings.maximum_events_per_day
      as is_available
  from days
  cross join settings
  left join confirmed using (event_date)
  left join blocks using (event_date)
  order by days.event_date;
$$;

alter table public.global_settings enable row level security;
alter table public.event_types enable row level security;
alter table public.event_type_sizes enable row level security;
alter table public.services enable row level security;
alter table public.service_prices enable row level security;
alter table public.date_blocks enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_services enable row level security;
alter table public.admin_profiles enable row level security;

create policy "Public can read global booking settings"
on public.global_settings
for select
to anon, authenticated
using (id = 'default');

create policy "Public can read active event types"
on public.event_types
for select
to anon, authenticated
using (is_active = true);

create policy "Public can read active event sizes for active event types"
on public.event_type_sizes
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.event_types
    where event_types.id = event_type_sizes.event_type_id
      and event_types.is_active = true
  )
);

create policy "Public can read active services"
on public.services
for select
to anon, authenticated
using (is_active = true);

create policy "Public can read active service prices"
on public.service_prices
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.event_types
    where event_types.id = service_prices.event_type_id
      and event_types.is_active = true
  )
  and exists (
    select 1
    from public.event_type_sizes
    where event_type_sizes.id = service_prices.event_type_size_id
      and event_type_sizes.is_active = true
  )
  and exists (
    select 1
    from public.services
    where services.id = service_prices.service_id
      and services.is_active = true
  )
);

create policy "Authenticated admins can manage settings"
on public.global_settings
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can manage event types"
on public.event_types
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can manage event sizes"
on public.event_type_sizes
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can manage services"
on public.services
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can manage service prices"
on public.service_prices
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can manage date blocks"
on public.date_blocks
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can manage bookings"
on public.bookings
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can manage booking services"
on public.booking_services
for all
to authenticated
using (true)
with check (true);

create policy "Admins can read their profile"
on public.admin_profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Admins can update their profile"
on public.admin_profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

grant execute on function public.get_booking_date_availability(date, date) to anon, authenticated;
