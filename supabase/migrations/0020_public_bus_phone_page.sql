-- A second bus page that also exposes phone numbers, behind its own token
-- (for the shuttle team leader). The plain /bus token never reveals phones.

begin;

alter table public.public_bus_pages
  add column if not exists includes_phone boolean not null default false;

insert into public.public_bus_pages (slug, title, is_public, includes_phone)
values ('bus-admin', 'Danh sách đi xe (kèm SĐT)', true, true)
on conflict (slug) do nothing;

create or replace function public.get_public_bus_admin_rsvps(
  p_token text
)
returns table (
  guest_name text,
  category text,
  phone text,
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
         and page.includes_phone = true
     ) then
    raise exception 'Invalid public bus access token' using errcode = '42501';
  end if;

  return query
  select
    r.guest_name,
    r.category,
    r.phone,
    r.bus_pickup,
    r.bus_return,
    coalesce(
      array_agg(c.name order by c.id) filter (where c.id is not null and c.joins_bus is true),
      array[]::text[]
    ) as companions
  from public.rsvp_latest r
  left join public.companions c on c.rsvp_id = r.id
  where r.status = 'bus'
  group by r.id, r.guest_name, r.category, r.phone, r.bus_pickup, r.bus_return, r.created_at
  order by r.category, r.guest_name, r.created_at, r.id;
end;
$$;

revoke all on function public.get_public_bus_admin_rsvps(text)
from public, anon, authenticated;
grant execute on function public.get_public_bus_admin_rsvps(text)
to anon, authenticated;

create or replace function public.get_admin_bus_links()
returns table (
  slug text,
  title text,
  access_token text,
  is_public boolean,
  includes_phone boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
  select p.slug, p.title, p.access_token, p.is_public, p.includes_phone
  from public.public_bus_pages p
  order by p.includes_phone, p.slug;
end;
$$;

revoke all on function public.get_admin_bus_links()
from public, anon, authenticated;
grant execute on function public.get_admin_bus_links()
to authenticated;

notify pgrst, 'reload schema';

commit;
