-- Require a database-generated capability token to view each public group page.

begin;

alter table public.public_group_pages
  add column if not exists access_token text;

update public.public_group_pages
set access_token = pg_catalog.encode(extensions.gen_random_bytes(18), 'hex')
where access_token is null;

alter table public.public_group_pages
  alter column access_token set default
    pg_catalog.encode(extensions.gen_random_bytes(18), 'hex'),
  alter column access_token set not null;

do $add_public_group_token_constraints$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'public_group_pages_access_token_key'
      and conrelid = 'public.public_group_pages'::regclass
  ) then
    alter table public.public_group_pages
      add constraint public_group_pages_access_token_key unique (access_token);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'public_group_pages_access_token_check'
      and conrelid = 'public.public_group_pages'::regclass
  ) then
    alter table public.public_group_pages
      add constraint public_group_pages_access_token_check
      check (access_token ~ '^[A-Za-z0-9_-]{16,128}$');
  end if;
end;
$add_public_group_token_constraints$;

drop function if exists public.get_public_group_rsvps(text);

create or replace function public.get_public_group_rsvps(
  p_slug text,
  p_token text
)
returns table (
  guest_name text,
  status text,
  companions text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_slug), '') is null
     or nullif(btrim(p_token), '') is null
     or not exists (
       select 1
       from public.public_group_pages page
       where page.slug = btrim(p_slug)
         and page.access_token = btrim(p_token)
         and page.is_public = true
     ) then
    raise exception 'Invalid public group access token' using errcode = '42501';
  end if;

  return query
  select
    r.guest_name,
    r.status,
    coalesce(
      array_agg(c.name order by c.id) filter (where c.id is not null),
      array[]::text[]
    ) as companions
  from public.public_group_pages page
  join public.rsvp_latest r on r.category = page.category
  left join public.companions c on c.rsvp_id = r.id
  where page.slug = btrim(p_slug)
    and page.access_token = btrim(p_token)
    and page.is_public = true
  group by r.id, r.guest_name, r.status, r.created_at
  order by r.guest_name, r.created_at, r.id;
end;
$$;

revoke all on function public.get_public_group_rsvps(text,text)
from public, anon, authenticated;
grant execute on function public.get_public_group_rsvps(text,text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
