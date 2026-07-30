alter table public.admin_profiles
add column if not exists email text,
add column if not exists is_active boolean not null default true,
add column if not exists last_login_at timestamptz;

create unique index if not exists admin_profiles_email_unique_idx
on public.admin_profiles (lower(email))
where email is not null;

create or replace function public.is_authorized_admin_email(candidate_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles
    where email is not null
      and lower(email) = lower(trim(candidate_email))
      and is_active = true
  );
$$;

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
      and email is not null
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and is_active = true
  );
$$;

create or replace function public.get_current_admin_profile()
returns table (
  user_id uuid,
  email text,
  display_name text,
  role public.admin_role,
  is_active boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    admin_profiles.user_id,
    admin_profiles.email,
    admin_profiles.display_name,
    admin_profiles.role,
    admin_profiles.is_active
  from public.admin_profiles
  where admin_profiles.user_id = auth.uid()
    and admin_profiles.email is not null
    and lower(admin_profiles.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and admin_profiles.is_active = true
  limit 1;
$$;

drop policy if exists "Admins can read their profile" on public.admin_profiles;
drop policy if exists "Admins can update their profile" on public.admin_profiles;

create policy "Admins can read their profile"
on public.admin_profiles
for select
to authenticated
using (public.is_admin() and auth.uid() = user_id);

create policy "Admins can update their profile"
on public.admin_profiles
for update
to authenticated
using (public.is_admin() and auth.uid() = user_id)
with check (public.is_admin() and auth.uid() = user_id);

grant execute on function public.is_authorized_admin_email(text) to anon, authenticated;
grant execute on function public.get_current_admin_profile() to authenticated;
