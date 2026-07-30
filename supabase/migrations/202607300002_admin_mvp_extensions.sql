create table if not exists public.event_type_services (
  id uuid primary key default gen_random_uuid(),
  event_type_id uuid not null references public.event_types(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_type_services_unique unique (event_type_id, service_id)
);

alter table public.global_settings
add column if not exists business_logo_url text,
add column if not exists business_location text,
add column if not exists business_description text;

create index if not exists event_type_services_lookup_idx
on public.event_type_services (event_type_id, service_id, is_active);

drop trigger if exists set_event_type_services_updated_at on public.event_type_services;
create trigger set_event_type_services_updated_at
before update on public.event_type_services
for each row execute function public.set_updated_at();

alter table public.event_type_services enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where user_id = auth.uid()
  );
$$;

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

  perform pg_advisory_xact_lock(hashtext(new.event_date::text));

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

drop policy if exists "Authenticated admins can manage settings" on public.global_settings;
drop policy if exists "Authenticated admins can manage event types" on public.event_types;
drop policy if exists "Authenticated admins can manage event sizes" on public.event_type_sizes;
drop policy if exists "Authenticated admins can manage services" on public.services;
drop policy if exists "Authenticated admins can manage service prices" on public.service_prices;
drop policy if exists "Authenticated admins can manage date blocks" on public.date_blocks;
drop policy if exists "Authenticated admins can manage bookings" on public.bookings;
drop policy if exists "Authenticated admins can manage booking services" on public.booking_services;

create policy "Admins can manage settings"
on public.global_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage event types"
on public.event_types
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage event sizes"
on public.event_type_sizes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage event type services"
on public.event_type_services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage services"
on public.services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage service prices"
on public.service_prices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage date blocks"
on public.date_blocks
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage bookings"
on public.bookings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can manage booking services"
on public.booking_services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Public can read active event type services"
on public.event_type_services
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.event_types
    where event_types.id = event_type_services.event_type_id
      and event_types.is_active = true
  )
  and exists (
    select 1
    from public.services
    where services.id = event_type_services.service_id
      and services.is_active = true
  )
);
