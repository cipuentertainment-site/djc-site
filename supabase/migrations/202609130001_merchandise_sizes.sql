alter table public.merchandise_products
  add column if not exists available_sizes text[] not null default '{}';

alter table public.merchandise_requests
  add column if not exists selected_size text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'merchandise_products_available_sizes_valid'
      and conrelid = 'public.merchandise_products'::regclass
  ) then
    alter table public.merchandise_products
      add constraint merchandise_products_available_sizes_valid
      check (
        available_sizes <@ array[
          's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl', 'one_size_fits_all'
        ]::text[]
        and not (
          'one_size_fits_all' = any(available_sizes)
          and cardinality(available_sizes) > 1
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'merchandise_requests_selected_size_valid'
      and conrelid = 'public.merchandise_requests'::regclass
  ) then
    alter table public.merchandise_requests
      add constraint merchandise_requests_selected_size_valid
      check (
        selected_size is null
        or selected_size = any(array[
          's', 'm', 'l', 'xl', 'xxl', 'xxxl', 'xxxxl', 'one_size_fits_all'
        ]::text[])
      );
  end if;
end $$;
