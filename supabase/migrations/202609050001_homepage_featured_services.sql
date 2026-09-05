alter table public.global_settings
add column if not exists homepage_service_ids uuid[] not null default '{}';

update public.global_settings
set homepage_service_ids = coalesce(
  (
    select array_agg(id order by sort_order, name)
    from (
      select id, sort_order, name
      from public.services
      where is_active = true
      order by sort_order, name
      limit 4
    ) featured_services
  ),
  '{}'
)
where id = 'default'
  and coalesce(array_length(homepage_service_ids, 1), 0) = 0;
