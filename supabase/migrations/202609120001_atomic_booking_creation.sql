create or replace function public.create_booking_from_payload(
  p_payload jsonb,
  p_payment_status public.reservation_payment_status,
  p_payment_reference text default null,
  p_payment_paid_at timestamptz default null,
  p_reject_recent_duplicate boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_booking_id uuid;
  duplicate_lock_key text;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'booking payload must be an object';
  end if;

  if jsonb_typeof(p_payload -> 'services') <> 'array'
    or jsonb_array_length(p_payload -> 'services') = 0 then
    raise exception 'booking payload must include at least one service';
  end if;

  if p_reject_recent_duplicate then
    duplicate_lock_key := concat_ws(
      '|',
      p_payload ->> 'customerPhone',
      p_payload ->> 'eventDate',
      p_payload ->> 'eventTypeId'
    );

    perform pg_advisory_xact_lock(hashtext(duplicate_lock_key));

    if exists (
      select 1
      from public.bookings
      where customer_phone = p_payload ->> 'customerPhone'
        and event_date = (p_payload ->> 'eventDate')::date
        and event_type_id = (p_payload ->> 'eventTypeId')::uuid
        and created_at >= now() - interval '10 minutes'
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'recent booking request already submitted';
    end if;
  end if;

  insert into public.bookings (
    event_type_id,
    event_type_name_snapshot,
    event_type_size_id,
    event_size_label_snapshot,
    event_size_min_attendees_snapshot,
    event_size_max_attendees_snapshot,
    duration,
    attendee_count,
    event_date,
    county,
    location_text,
    customer_name,
    customer_phone,
    estimated_service_total_amount,
    currency,
    transport_disclaimer_snapshot,
    reservation_fee_amount,
    reservation_fee_payment_status,
    reservation_fee_payment_reference,
    reservation_fee_paid_at,
    terms_accepted_at,
    terms_version,
    privacy_notice_version,
    status,
    notes
  )
  values (
    (p_payload ->> 'eventTypeId')::uuid,
    p_payload ->> 'eventTypeName',
    (p_payload ->> 'eventSizeId')::uuid,
    (p_payload ->> 'eventSizeLabel')::public.event_size_label,
    (p_payload ->> 'eventSizeMin')::integer,
    (p_payload ->> 'eventSizeMax')::integer,
    coalesce((p_payload ->> 'duration')::public.booking_duration, 'full_day'::public.booking_duration),
    (p_payload ->> 'eventSizeMin')::integer,
    (p_payload ->> 'eventDate')::date,
    p_payload ->> 'county',
    concat(p_payload ->> 'townCentre', ' - ', p_payload ->> 'exactLocation'),
    p_payload ->> 'customerName',
    p_payload ->> 'customerPhone',
    (p_payload ->> 'estimatedServiceTotal')::integer,
    p_payload ->> 'currency',
    p_payload ->> 'transportDisclaimer',
    (p_payload ->> 'reservationFeeAmount')::integer,
    p_payment_status,
    p_payment_reference,
    p_payment_paid_at,
    (p_payload ->> 'termsAcceptedAt')::timestamptz,
    p_payload ->> 'termsVersion',
    p_payload ->> 'privacyNoticeVersion',
    'pending'::public.booking_status,
    case
      when nullif(trim(p_payload ->> 'customerEmail'), '') is null then null
      else concat('Customer email: ', p_payload ->> 'customerEmail')
    end
  )
  returning id into created_booking_id;

  insert into public.booking_services (
    booking_id,
    service_id,
    service_name_snapshot,
    price_amount_snapshot,
    currency
  )
  select
    created_booking_id,
    (service ->> 'serviceId')::uuid,
    service ->> 'serviceName',
    (service ->> 'priceAmount')::integer,
    service ->> 'currency'
  from jsonb_array_elements(p_payload -> 'services') as service;

  return created_booking_id;
end;
$$;

create or replace function public.finalize_booking_from_payment(
  p_payment_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  payment_booking_id uuid;
  payment_status public.payment_status;
  payment_payload jsonb;
  payment_receipt text;
  payment_paid_at timestamptz;
  created_booking_id uuid;
begin
  select
    reservation_payments.booking_id,
    reservation_payments.status,
    reservation_payments.booking_payload,
    reservation_payments.mpesa_receipt_number,
    reservation_payments.paid_at
  into
    payment_booking_id,
    payment_status,
    payment_payload,
    payment_receipt,
    payment_paid_at
  from public.reservation_payments
  where reservation_payments.id = p_payment_id
  for update;

  if not found then
    raise exception 'payment record not found';
  end if;

  if payment_booking_id is not null then
    return payment_booking_id;
  end if;

  if payment_status <> 'success' then
    raise exception 'payment is not successful';
  end if;

  created_booking_id := public.create_booking_from_payload(
    payment_payload,
    'paid'::public.reservation_payment_status,
    payment_receipt,
    payment_paid_at,
    false
  );

  update public.reservation_payments
  set booking_id = created_booking_id
  where id = p_payment_id
    and booking_id is null;

  return created_booking_id;
end;
$$;

revoke execute on function public.create_booking_from_payload(
  jsonb,
  public.reservation_payment_status,
  text,
  timestamptz,
  boolean
) from public, anon, authenticated;

revoke execute on function public.finalize_booking_from_payment(uuid)
from public, anon, authenticated;

grant execute on function public.create_booking_from_payload(
  jsonb,
  public.reservation_payment_status,
  text,
  timestamptz,
  boolean
) to service_role;

grant execute on function public.finalize_booking_from_payment(uuid)
to service_role;
