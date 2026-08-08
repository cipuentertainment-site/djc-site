do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_duration') then
    create type public.booking_duration as enum ('full_day', 'half_day');
  end if;
end
$$;

alter table public.services
add column if not exists supports_half_day boolean not null default false;

alter table public.event_types
add column if not exists supports_half_day boolean not null default false;

alter table public.service_prices
add column if not exists duration public.booking_duration not null default 'full_day';

alter table public.bookings
add column if not exists duration public.booking_duration not null default 'full_day';

alter table public.service_prices
drop constraint if exists service_prices_unique_combination;

alter table public.service_prices
add constraint service_prices_unique_combination
unique (event_type_id, event_type_size_id, service_id, duration);

drop index if exists service_prices_lookup_idx;
create index if not exists service_prices_lookup_idx
on public.service_prices (event_type_id, event_type_size_id, service_id, duration, is_active);

create index if not exists bookings_duration_idx
on public.bookings (duration);
