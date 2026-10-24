create table if not exists public.website_visitors (
  visitor_id text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint website_visitors_id_not_blank check (length(trim(visitor_id)) > 0)
);

create index if not exists website_visitors_first_seen_idx
on public.website_visitors (first_seen_at);

alter table public.website_visitors enable row level security;

drop policy if exists "Admins can read website visitors" on public.website_visitors;
create policy "Admins can read website visitors"
on public.website_visitors
for select
to authenticated
using (public.is_admin());
