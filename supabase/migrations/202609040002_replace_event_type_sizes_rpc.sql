create or replace function public.replace_event_type_sizes(
  p_event_type_id uuid,
  p_sizes jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  labels_in_order text;
  size_count integer;
begin
  if not public.is_admin() then
    raise exception 'admin privileges required';
  end if;

  if p_event_type_id is null then
    raise exception 'event type id is required';
  end if;

  if p_sizes is null or jsonb_typeof(p_sizes) <> 'array' then
    raise exception 'event type sizes must be an array';
  end if;

  select count(*), string_agg(size_item.value ->> 'label', ',' order by size_item.ordinality)
  into size_count, labels_in_order
  from jsonb_array_elements(p_sizes) with ordinality as size_item(value, ordinality);

  if size_count <> 3 or labels_in_order <> 'small,medium,large' then
    raise exception 'configure small, medium, and large event sizes in order';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sizes) as size_item(value)
    where (size_item.value ->> 'min_attendees')::integer < 0
      or (size_item.value ->> 'max_attendees')::integer <=
        (size_item.value ->> 'min_attendees')::integer
  ) then
    raise exception 'event size ranges are invalid';
  end if;

  if exists (
    select 1
    from (
      select
        (size_item.value ->> 'min_attendees')::integer as min_attendees,
        lag((size_item.value ->> 'max_attendees')::integer)
          over (order by size_item.ordinality) as previous_max_attendees
      from jsonb_array_elements(p_sizes) with ordinality as size_item(value, ordinality)
    ) ordered_sizes
    where previous_max_attendees is not null
      and min_attendees <= previous_max_attendees
  ) then
    raise exception 'event size ranges must be ordered and cannot overlap';
  end if;

  update public.event_type_sizes
  set is_active = false
  where event_type_id = p_event_type_id
    and is_active = true;

  insert into public.event_type_sizes (
    event_type_id,
    label,
    min_attendees,
    max_attendees,
    is_active,
    sort_order
  )
  select
    p_event_type_id,
    (size_item.value ->> 'label')::public.event_size_label,
    (size_item.value ->> 'min_attendees')::integer,
    (size_item.value ->> 'max_attendees')::integer,
    true,
    coalesce((size_item.value ->> 'sort_order')::integer, size_item.ordinality::integer * 10)
  from jsonb_array_elements(p_sizes) with ordinality as size_item(value, ordinality)
  on conflict (event_type_id, label)
  do update set
    min_attendees = excluded.min_attendees,
    max_attendees = excluded.max_attendees,
    is_active = true,
    sort_order = excluded.sort_order,
    updated_at = now();
end;
$$;

grant execute on function public.replace_event_type_sizes(uuid, jsonb) to authenticated;
