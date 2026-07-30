insert into public.admin_profiles (user_id, email, display_name, role, is_active)
select
  users.id,
  users.email,
  'Brioneroo',
  'owner'::public.admin_role,
  true
from auth.users
where lower(users.email) = lower('brioneroo@gmail.com')
on conflict (user_id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = true,
  updated_at = now();
