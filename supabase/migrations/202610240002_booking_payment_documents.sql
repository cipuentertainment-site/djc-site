do $$
begin
  if not exists (select 1 from pg_type where typname = 'manual_payment_method') then
    create type public.manual_payment_method as enum ('mpesa', 'bank_transfer', 'cash');
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_document_type') then
    create type public.booking_document_type as enum (
      'booking_confirmation',
      'payment_statement',
      'payment_receipt',
      'appreciation'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'booking_document_status') then
    create type public.booking_document_status as enum ('generating', 'generated', 'failed');
  end if;
end
$$;

alter table public.bookings
add column if not exists booking_reference text,
add column if not exists agreed_total_amount integer,
add column if not exists confirmed_at timestamptz,
add column if not exists confirmed_by uuid references auth.users(id) on delete set null,
add column if not exists confirmation_idempotency_key uuid;

update public.bookings
set booking_reference = 'DJC-' || upper(substr(replace(id::text, '-', ''), 1, 10))
where booking_reference is null;

alter table public.bookings
alter column booking_reference set default (
  'DJC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
),
alter column booking_reference set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_agreed_total_amount_non_negative'
  ) then
    alter table public.bookings
    add constraint bookings_agreed_total_amount_non_negative
    check (agreed_total_amount is null or agreed_total_amount >= 0);
  end if;
end
$$;

create unique index if not exists bookings_booking_reference_unique_idx
on public.bookings (booking_reference);

create unique index if not exists bookings_confirmation_idempotency_unique_idx
on public.bookings (confirmation_idempotency_key)
where confirmation_idempotency_key is not null;

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount integer not null,
  currency text not null default 'KES',
  method public.manual_payment_method not null,
  transaction_reference text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  constraint booking_payments_amount_positive check (amount > 0),
  constraint booking_payments_currency_not_blank check (length(trim(currency)) between 3 and 12),
  constraint booking_payments_reference_required check (
    method = 'cash'
    or (transaction_reference is not null and length(trim(transaction_reference)) > 0)
  ),
  constraint booking_payments_idempotency_unique unique (idempotency_key)
);

create index if not exists booking_payments_booking_created_idx
on public.booking_payments (booking_id, created_at asc);

create unique index if not exists booking_payments_reference_unique_idx
on public.booking_payments (method, transaction_reference)
where transaction_reference is not null and method <> 'cash';

insert into public.booking_payments (
  id,
  booking_id,
  amount,
  currency,
  method,
  transaction_reference,
  paid_at,
  idempotency_key
)
select
  gen_random_uuid(),
  reservation_payments.booking_id,
  reservation_payments.amount,
  reservation_payments.currency,
  'mpesa'::public.manual_payment_method,
  coalesce(reservation_payments.mpesa_receipt_number, reservation_payments.internal_reference),
  coalesce(reservation_payments.paid_at, reservation_payments.created_at),
  reservation_payments.id
from public.reservation_payments
where reservation_payments.booking_id is not null
  and reservation_payments.status = 'success'
on conflict (idempotency_key) do nothing;

create table if not exists public.booking_documents (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_id uuid references public.booking_payments(id) on delete set null,
  document_type public.booking_document_type not null,
  document_number text not null,
  generation_key text not null,
  status public.booking_document_status not null default 'generating',
  issue_date date not null default current_date,
  storage_path text not null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_documents_number_unique unique (document_number),
  constraint booking_documents_generation_key_unique unique (generation_key),
  constraint booking_documents_storage_path_unique unique (storage_path)
);

create index if not exists booking_documents_booking_created_idx
on public.booking_documents (booking_id, created_at desc);

drop trigger if exists set_booking_documents_updated_at on public.booking_documents;
create trigger set_booking_documents_updated_at
before update on public.booking_documents
for each row execute function public.set_updated_at();

alter table public.booking_payments enable row level security;
alter table public.booking_documents enable row level security;

drop policy if exists "Admins can manage booking payments" on public.booking_payments;
create policy "Admins can manage booking payments"
on public.booking_payments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage booking documents" on public.booking_documents;
create policy "Admins can manage booking documents"
on public.booking_documents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-documents',
  'booking-documents',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read booking documents" on storage.objects;
create policy "Admins can read booking documents"
on storage.objects
for select
to authenticated
using (bucket_id = 'booking-documents' and public.is_admin());

drop policy if exists "Admins can upload booking documents" on storage.objects;
create policy "Admins can upload booking documents"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'booking-documents' and public.is_admin());

drop policy if exists "Admins can update booking documents" on storage.objects;
create policy "Admins can update booking documents"
on storage.objects
for update
to authenticated
using (bucket_id = 'booking-documents' and public.is_admin())
with check (bucket_id = 'booking-documents' and public.is_admin());

drop policy if exists "Admins can delete booking documents" on storage.objects;
create policy "Admins can delete booking documents"
on storage.objects
for delete
to authenticated
using (bucket_id = 'booking-documents' and public.is_admin());

create sequence if not exists public.booking_document_number_seq;

create or replace function public.next_booking_document_number(
  p_document_type public.booking_document_type
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  prefix text;
begin
  prefix := case p_document_type
    when 'booking_confirmation' then 'BC'
    when 'payment_statement' then 'PS'
    when 'payment_receipt' then 'RC'
    when 'appreciation' then 'TY'
  end;

  return 'DJC-' || prefix || '-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.booking_document_number_seq')::text, 6, '0');
end;
$$;

revoke all on function public.next_booking_document_number(public.booking_document_type) from public;
grant execute on function public.next_booking_document_number(public.booking_document_type) to authenticated, service_role;

create or replace function public.confirm_booking_with_payment(
  p_booking_id uuid,
  p_agreed_total_amount integer,
  p_initial_payment_amount integer,
  p_payment_method public.manual_payment_method default null,
  p_transaction_reference text default null,
  p_idempotency_key uuid default gen_random_uuid(),
  p_paid_at timestamptz default now()
)
returns table (booking_id uuid, payment_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  existing_payment_id uuid;
  date_is_available boolean;
  normalized_reference text;
  existing_total_received integer;
begin
  if not public.is_admin() then
    raise exception 'admin authorization required';
  end if;

  select *
  into booking_row
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found';
  end if;

  if booking_row.status = 'confirmed' and booking_row.confirmation_idempotency_key = p_idempotency_key then
    select id into existing_payment_id
    from public.booking_payments
    where idempotency_key = p_idempotency_key;

    return query select p_booking_id, existing_payment_id;
    return;
  end if;

  if booking_row.status <> 'pending' then
    raise exception 'only pending bookings can be confirmed';
  end if;

  if p_agreed_total_amount is null or p_agreed_total_amount <= 0 then
    raise exception 'agreed total must be greater than zero';
  end if;

  if p_initial_payment_amount is null or p_initial_payment_amount < 0 then
    raise exception 'initial payment cannot be negative';
  end if;

  if p_initial_payment_amount > p_agreed_total_amount then
    raise exception 'payment cannot exceed agreed total';
  end if;

  select coalesce(sum(amount), 0)::integer
  into existing_total_received
  from public.booking_payments as bp
  where bp.booking_id = p_booking_id;

  if existing_total_received + p_initial_payment_amount > p_agreed_total_amount then
    raise exception 'payments would exceed the agreed total';
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

  select is_available
  into date_is_available
  from public.get_booking_date_availability(booking_row.event_date, booking_row.event_date)
  limit 1;

  if not coalesce(date_is_available, false) then
    raise exception 'event date is no longer available';
  end if;

  if p_initial_payment_amount > 0 then
    insert into public.booking_payments (
      booking_id,
      amount,
      currency,
      method,
      transaction_reference,
      paid_at,
      recorded_by,
      idempotency_key
    )
    values (
      p_booking_id,
      p_initial_payment_amount,
      booking_row.currency,
      p_payment_method,
      normalized_reference,
      coalesce(p_paid_at, now()),
      auth.uid(),
      p_idempotency_key
    )
    returning id into existing_payment_id;
  end if;

  update public.bookings
  set
    agreed_total_amount = p_agreed_total_amount,
    status = 'confirmed',
    confirmed_at = now(),
    confirmed_by = auth.uid(),
    confirmation_idempotency_key = p_idempotency_key
  where id = p_booking_id;

  return query select p_booking_id, existing_payment_id;
end;
$$;

revoke all on function public.confirm_booking_with_payment(
  uuid, integer, integer, public.manual_payment_method, text, uuid, timestamptz
) from public;
grant execute on function public.confirm_booking_with_payment(
  uuid, integer, integer, public.manual_payment_method, text, uuid, timestamptz
) to authenticated;

create or replace function public.record_booking_payment(
  p_booking_id uuid,
  p_amount integer,
  p_payment_method public.manual_payment_method,
  p_transaction_reference text default null,
  p_idempotency_key uuid default gen_random_uuid(),
  p_paid_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  existing_payment_id uuid;
  total_received integer;
  normalized_reference text;
begin
  if not public.is_admin() then
    raise exception 'admin authorization required';
  end if;

  select id into existing_payment_id
  from public.booking_payments
  where idempotency_key = p_idempotency_key;

  if existing_payment_id is not null then
    return existing_payment_id;
  end if;

  select *
  into booking_row
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking not found';
  end if;

  if booking_row.status not in ('confirmed', 'completed') then
    raise exception 'booking must be confirmed before recording payments';
  end if;

  if booking_row.agreed_total_amount is null or booking_row.agreed_total_amount <= 0 then
    raise exception 'agreed total has not been set';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'payment amount must be greater than zero';
  end if;

  select coalesce(sum(amount), 0)::integer
  into total_received
  from public.booking_payments as bp
  where bp.booking_id = p_booking_id;

  if total_received + p_amount > booking_row.agreed_total_amount then
    raise exception 'payment would exceed the agreed total';
  end if;

  normalized_reference := nullif(trim(p_transaction_reference), '');

  if p_payment_method <> 'cash' and normalized_reference is null then
    raise exception 'transaction reference is required';
  end if;

  if p_payment_method = 'cash' then
    normalized_reference := null;
  end if;

  insert into public.booking_payments (
    booking_id,
    amount,
    currency,
    method,
    transaction_reference,
    paid_at,
    recorded_by,
    idempotency_key
  )
  values (
    p_booking_id,
    p_amount,
    booking_row.currency,
    p_payment_method,
    normalized_reference,
    coalesce(p_paid_at, now()),
    auth.uid(),
    p_idempotency_key
  )
  returning id into existing_payment_id;

  return existing_payment_id;
end;
$$;

revoke all on function public.record_booking_payment(
  uuid, integer, public.manual_payment_method, text, uuid, timestamptz
) from public;
grant execute on function public.record_booking_payment(
  uuid, integer, public.manual_payment_method, text, uuid, timestamptz
) to authenticated;
