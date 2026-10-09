-- Public bus manifest: one tokened page listing everyone who chose the shuttle bus
-- (all groups), with pickup point, round-trip, group, and bus-riding companions.

begin;

create table if not exists public.public_bus_pages (
  slug text primary key default 'bus',
  title text not null default 'Danh sách đi xe',
  is_public boolean not null default false,
  access_token text not null default
    pg_catalog.encode(extensions.gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_bus_pages_access_token_key unique (access_token),
  constraint public_bus_pages_access_token_check
    check (access_token ~ '^[A-Za-z0-9_-]{16,128}$'),
  constraint public_bus_pages_title_length
    check (char_length(btrim(title)) between 1 and 120)
);

insert into public.public_bus_pages (slug, title, is_public)
values ('bus', 'Danh sách đi xe', true)
on conflict (slug) do nothing;

alter table public.public_bus_pages enable row level security;

drop policy if exists public_bus_pages_admin_read on public.public_bus_pages;
create policy public_bus_pages_admin_read
on public.public_bus_pages for select to authenticated
using (public.is_rsvp_admin());

revoke all on table public.public_bus_pages from anon, authenticated;
grant select on table public.public_bus_pages to authenticated;

create or replace function public.get_public_bus_rsvps(
  p_token text
)
returns table (
  guest_name text,
  category text,
  bus_pickup text,
  bus_return boolean,
  companions text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_token), '') is null
     or not exists (
       select 1
       from public.public_bus_pages page
       where page.access_token = btrim(p_token)
         and page.is_public = true
     ) then
    raise exception 'Invalid public bus access token' using errcode = '42501';
  end if;

  return query
  select
    r.guest_name,
    r.category,
    r.bus_pickup,
    r.bus_return,
    coalesce(
      array_agg(c.name order by c.id) filter (where c.id is not null and c.joins_bus is true),
      array[]::text[]
    ) as companions
  from public.rsvp_latest r
  left join public.companions c on c.rsvp_id = r.id
  where r.status = 'bus'
  group by r.id, r.guest_name, r.category, r.bus_pickup, r.bus_return, r.created_at
  order by r.category, r.guest_name, r.created_at, r.id;
end;
$$;

revoke all on function public.get_public_bus_rsvps(text)
from public, anon, authenticated;
grant execute on function public.get_public_bus_rsvps(text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
