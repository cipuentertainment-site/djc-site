alter table public.reservation_payments
add column if not exists terms_accepted_at timestamptz,
add column if not exists terms_version text,
add column if not exists privacy_notice_version text;

alter table public.bookings
add column if not exists terms_accepted_at timestamptz,
add column if not exists terms_version text,
add column if not exists privacy_notice_version text;
