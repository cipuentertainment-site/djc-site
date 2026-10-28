create table if not exists public.booking_final_agreements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  version integer not null,
  agreed_total_amount integer not null,
  amendment_reason text,
  is_current boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now(),
  constraint booking_final_agreements_version_positive check (version > 0),
  constraint booking_final_agreements_total_positive check (agreed_total_amount > 0),
  constraint booking_final_agreements_reason_not_blank check (
    amendment_reason is null or length(trim(amendment_reason)) > 0
  ),
  constraint booking_final_agreements_booking_version_unique unique (booking_id, version)
);

create unique index if not exists booking_final_agreements_one_current_idx
on public.booking_final_agreements (booking_id)
where is_current = true;

create table if not exists public.booking_final_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  agreement_id uuid not null references public.booking_final_agreements(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name_snapshot text not null,
  description_snapshot text,
  quantity integer not null default 1,
  unit_price_amount integer not null,
  line_total_amount integer not null,
  currency text not null default 'KES',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint booking_final_services_name_not_blank check (length(trim(service_name_snapshot)) > 0),
  constraint booking_final_services_quantity_positive check (quantity > 0 and quantity <= 1000),
  constraint booking_final_services_unit_price_valid check (unit_price_amount >= 0),
  constraint booking_final_services_line_total_valid check (line_total_amount >= 0),
  constraint booking_final_services_currency_not_blank check (length(trim(currency)) between 3 and 12)
);

create index if not exists booking_final_services_agreement_sort_idx
on public.booking_final_services (agreement_id, sort_order);

alter table public.booking_final_agreements enable row level security;
alter table public.booking_final_services enable row level security;

drop policy if exists "Admins can manage booking final agreements" on public.booking_final_agreements;
create policy "Admins can manage booking final agreements"
on public.booking_final_agreements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage booking final services" on public.booking_final_services;
create policy "Admins can manage booking final services"
on public.booking_final_services
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

alter table public.booking_documents
add column if not exists agreement_id uuid references public.booking_final_agreements(id) on delete set null,
add column if not exists agreement_version integer;

create or replace function public.confirm_booking_with_final_details(
  p_booking_id uuid,
  p_final_services jsonb,
  p_initial_payment_amount integer,
  p_payment_method public.manual_payment_method default null,
  p_transaction_reference text default null,
  p_idempotency_key uuid default gen_random_uuid(),
  p_paid_at timestamptz default now()
)
returns table (
  booking_id uuid,
  payment_id uuid,
  agreement_id uuid,
  agreement_version integer,
  agreed_total_amount integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  agreement_row public.booking_final_agreements%rowtype;
  existing_payment_id uuid;
  date_is_available boolean;
  normalized_reference text;
  existing_total_received integer;
  final_total bigint := 0;
  line jsonb;
  line_name text;
  line_description text;
  line_service_id uuid;
  line_quantity integer;
  line_unit_price integer;
  line_currency text;
  line_total bigint;
  line_index integer := 0;
begin
  if not public.is_admin() then
    raise exception 'admin authorization required';
  end if;

  select * into booking_row
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found';
  end if;

  if booking_row.status = 'confirmed' and booking_row.confirmation_idempotency_key = p_idempotency_key then
    select * into agreement_row
    from public.booking_final_agreements as bfa
    where bfa.booking_id = p_booking_id and bfa.is_current = true;

    select id into existing_payment_id
    from public.booking_payments
    where idempotency_key = p_idempotency_key;

    return query select
      p_booking_id,
      existing_payment_id,
      agreement_row.id,
      agreement_row.version,
      agreement_row.agreed_total_amount;
    return;
  end if;

  if booking_row.status <> 'pending' then
    raise exception 'only pending bookings can be confirmed';
  end if;

  if jsonb_typeof(p_final_services) <> 'array' or jsonb_array_length(p_final_services) = 0 then
    raise exception 'at least one final service is required';
  end if;

  for line in select * from jsonb_array_elements(p_final_services)
  loop
    line_index := line_index + 1;
    line_name := nullif(trim(line->>'name'), '');
    line_description := nullif(trim(line->>'description'), '');
    line_currency := coalesce(nullif(trim(line->>'currency'), ''), booking_row.currency);

    if line_name is null then
      raise exception 'final service % needs a name', line_index;
    end if;
    if coalesce(line->>'quantity', '') !~ '^[0-9]+$' then
      raise exception 'final service % has an invalid quantity', line_index;
    end if;
    if coalesce(line->>'unitPrice', '') !~ '^[0-9]+$' then
      raise exception 'final service % has an invalid price', line_index;
    end if;

    line_quantity := (line->>'quantity')::integer;
    line_unit_price := (line->>'unitPrice')::integer;
    if line_quantity < 1 or line_quantity > 1000 then
      raise exception 'final service % has an invalid quantity', line_index;
    end if;
    if line_unit_price < 0 or line_unit_price > floor(2147483647 / line_quantity) then
      raise exception 'final service % has an invalid price', line_index;
    end if;
    if line_currency <> booking_row.currency then
      raise exception 'final service currencies must match the booking currency';
    end if;

    line_service_id := null;
    if nullif(trim(coalesce(line->>'serviceId', '')), '') is not null then
      begin
        line_service_id := (line->>'serviceId')::uuid;
      exception when invalid_text_representation then
        raise exception 'final service % has an invalid catalogue service', line_index;
      end;

      if not exists (select 1 from public.services where id = line_service_id) then
        raise exception 'final service % references an unknown catalogue service', line_index;
      end if;
    end if;

    line_total := line_quantity::bigint * line_unit_price::bigint;
    final_total := final_total + line_total;
  end loop;

  if final_total <= 0 or final_total > 2147483647 then
    raise exception 'final service total must be greater than zero';
  end if;

  select coalesce(sum(amount), 0)::integer into existing_total_received
  from public.booking_payments as bp
  where bp.booking_id = p_booking_id;

  if p_initial_payment_amount is null or p_initial_payment_amount < 0 then
    raise exception 'initial payment cannot be negative';
  end if;
  if existing_total_received + p_initial_payment_amount > final_total then
    raise exception 'payments would exceed the final agreed total';
  end if;
  if p_initial_payment_amount > 0 and p_payment_method is null then
    raise exception 'payment method is required';
  end if;

  normalized_reference := nullif(trim(p_transaction_reference), '');
  if p_initial_payment_amount > 0 and p_payment_method <> 'cash' and normalized_reference is null then
    raise exception 'transaction reference is required';
  end if;
  if p_payment_method = 'cash' then
    normalized_reference := null;
  end if;

  select is_available into date_is_available
  from public.get_booking_date_availability(booking_row.event_date, booking_row.event_date)
  limit 1;
  if not coalesce(date_is_available, false) then
    raise exception 'event date is no longer available';
  end if;

  insert into public.booking_final_agreements (
    booking_id, version, agreed_total_amount, created_by, idempotency_key
  ) values (
    p_booking_id, 1, final_total::integer, auth.uid(), p_idempotency_key
  ) returning * into agreement_row;

  line_index := 0;
  for line in select * from jsonb_array_elements(p_final_services)
  loop
    line_service_id := null;
    if nullif(trim(coalesce(line->>'serviceId', '')), '') is not null then
      line_service_id := (line->>'serviceId')::uuid;
    end if;
    line_quantity := (line->>'quantity')::integer;
    line_unit_price := (line->>'unitPrice')::integer;

    insert into public.booking_final_services (
      booking_id, agreement_id, service_id, service_name_snapshot,
      description_snapshot, quantity, unit_price_amount, line_total_amount,
      currency, sort_order
    ) values (
      p_booking_id,
      agreement_row.id,
      line_service_id,
      trim(line->>'name'),
      nullif(trim(line->>'description'), ''),
      line_quantity,
      line_unit_price,
      (line_quantity::bigint * line_unit_price::bigint)::integer,
      coalesce(nullif(trim(line->>'currency'), ''), booking_row.currency),
      line_index
    );
  end loop;

  if p_initial_payment_amount > 0 then
    insert into public.booking_payments (
      booking_id, amount, currency, method, transaction_reference,
      paid_at, recorded_by, idempotency_key
    ) values (
      p_booking_id, p_initial_payment_amount, booking_row.currency,
      p_payment_method, normalized_reference, coalesce(p_paid_at, now()),
      auth.uid(), p_idempotency_key
    ) returning id into existing_payment_id;
  end if;

  update public.bookings
  set agreed_total_amount = final_total::integer,
      status = 'confirmed',
      confirmed_at = now(),
      confirmed_by = auth.uid(),
      confirmation_idempotency_key = p_idempotency_key
  where id = p_booking_id;

  return query select p_booking_id, existing_payment_id, agreement_row.id,
    agreement_row.version, agreement_row.agreed_total_amount;
end;
$$;

revoke all on function public.confirm_booking_with_final_details(
  uuid, jsonb, integer, public.manual_payment_method, text, uuid, timestamptz
) from public;
grant execute on function public.confirm_booking_with_final_details(
  uuid, jsonb, integer, public.manual_payment_method, text, uuid, timestamptz
) to authenticated;

create or replace function public.amend_booking_final_details(
  p_booking_id uuid,
  p_final_services jsonb,
  p_amendment_reason text,
  p_idempotency_key uuid
)
returns table (agreement_id uuid, agreement_version integer, agreed_total_amount integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  agreement_row public.booking_final_agreements%rowtype;
  previous_agreement public.booking_final_agreements%rowtype;
  final_total bigint := 0;
  payments_received integer;
  line jsonb;
  line_name text;
  line_service_id uuid;
  line_quantity integer;
  line_unit_price integer;
  line_currency text;
  line_index integer := 0;
  next_version integer;
begin
  if not public.is_admin() then
    raise exception 'admin authorization required';
  end if;

  select * into agreement_row
  from public.booking_final_agreements
  where idempotency_key = p_idempotency_key;
  if found then
    return query select agreement_row.id, agreement_row.version, agreement_row.agreed_total_amount;
    return;
  end if;

  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking not found';
  end if;
  if booking_row.status not in ('confirmed', 'completed') then
    raise exception 'only confirmed bookings can be amended';
  end if;
  if nullif(trim(p_amendment_reason), '') is null then
    raise exception 'an amendment reason is required';
  end if;
  if jsonb_typeof(p_final_services) <> 'array' or jsonb_array_length(p_final_services) = 0 then
    raise exception 'at least one final service is required';
  end if;

  for line in select * from jsonb_array_elements(p_final_services)
  loop
    line_index := line_index + 1;
    line_name := nullif(trim(line->>'name'), '');
    line_currency := coalesce(nullif(trim(line->>'currency'), ''), booking_row.currency);
    if line_name is null then raise exception 'final service % needs a name', line_index; end if;
    if coalesce(line->>'quantity', '') !~ '^[0-9]+$' then raise exception 'final service % has an invalid quantity', line_index; end if;
    if coalesce(line->>'unitPrice', '') !~ '^[0-9]+$' then raise exception 'final service % has an invalid price', line_index; end if;
    line_quantity := (line->>'quantity')::integer;
    line_unit_price := (line->>'unitPrice')::integer;
    if line_quantity < 1 or line_quantity > 1000 then raise exception 'final service % has an invalid quantity', line_index; end if;
    if line_unit_price < 0 or line_unit_price > floor(2147483647 / line_quantity) then raise exception 'final service % has an invalid price', line_index; end if;
    if line_currency <> booking_row.currency then raise exception 'final service currencies must match the booking currency'; end if;
    if nullif(trim(coalesce(line->>'serviceId', '')), '') is not null then
      line_service_id := (line->>'serviceId')::uuid;
      if not exists (select 1 from public.services where id = line_service_id) then raise exception 'final service % references an unknown catalogue service', line_index; end if;
    end if;
    final_total := final_total + line_quantity::bigint * line_unit_price::bigint;
  end loop;

  if final_total <= 0 or final_total > 2147483647 then raise exception 'final service total must be greater than zero'; end if;
  select coalesce(sum(amount), 0)::integer into payments_received
  from public.booking_payments as bp
  where bp.booking_id = p_booking_id;
  if final_total < payments_received then raise exception 'final total cannot be less than payments already received'; end if;

  select * into previous_agreement
  from public.booking_final_agreements as bfa
  where bfa.booking_id = p_booking_id and bfa.is_current = true
  for update;
  select coalesce(max(bfa.version), 0) + 1 into next_version
  from public.booking_final_agreements as bfa
  where bfa.booking_id = p_booking_id;
  if previous_agreement.id is not null then
    update public.booking_final_agreements set is_current = false where id = previous_agreement.id;
  end if;

  insert into public.booking_final_agreements (
    booking_id, version, agreed_total_amount, amendment_reason, is_current, created_by, idempotency_key
  ) values (
    p_booking_id, next_version, final_total::integer, trim(p_amendment_reason), true, auth.uid(), p_idempotency_key
  ) returning * into agreement_row;

  line_index := 0;
  for line in select * from jsonb_array_elements(p_final_services)
  loop
    line_index := line_index + 1;
    line_service_id := null;
    if nullif(trim(coalesce(line->>'serviceId', '')), '') is not null then line_service_id := (line->>'serviceId')::uuid; end if;
    line_quantity := (line->>'quantity')::integer;
    line_unit_price := (line->>'unitPrice')::integer;
    insert into public.booking_final_services (
      booking_id, agreement_id, service_id, service_name_snapshot, description_snapshot,
      quantity, unit_price_amount, line_total_amount, currency, sort_order
    ) values (
      p_booking_id, agreement_row.id, line_service_id, trim(line->>'name'),
      nullif(trim(line->>'description'), ''), line_quantity, line_unit_price,
      (line_quantity::bigint * line_unit_price::bigint)::integer,
      coalesce(nullif(trim(line->>'currency'), ''), booking_row.currency), line_index
    );
  end loop;

  update public.bookings set agreed_total_amount = final_total::integer where id = p_booking_id;
  return query select agreement_row.id, agreement_row.version, agreement_row.agreed_total_amount;
end;
$$;

revoke all on function public.amend_booking_final_details(uuid, jsonb, text, uuid) from public;
grant execute on function public.amend_booking_final_details(uuid, jsonb, text, uuid) to authenticated;
