-- Per-guest boarding marks for the /bus-admin roster (checkbox + note the shuttle
-- team leader edits via the bus-admin token), plus a unified admin listing of every
-- public share link (per-group pages + the two bus pages).

begin;

-- Keyed by rsvp_latest.id. That id changes when a guest re-submits their RSVP (a new
-- revision supersedes the old row), which resets the mark — acceptable because boarding
-- happens once the roster is frozen day-of.
create table if not exists public.bus_roster_marks (
  rsvp_id bigint primary key,
  checked boolean not null default false,
  note text,
  updated_at timestamptz not null default now(),
  constraint bus_roster_marks_note_length check (note is null or char_length(note) <= 500)
);

alter table public.bus_roster_marks enable row level security;
revoke all on table public.bus_roster_marks from anon, authenticated;

-- /bus-admin read: now carries the guest's checkbox + note alongside the roster.
drop function if exists public.get_public_bus_admin_rsvps(text);

create or replace function public.get_public_bus_admin_rsvps(
  p_token text
)
returns table (
  rsvp_id bigint,
  guest_name text,
  category text,
  phone text,
  bus_pickup text,
  bus_return boolean,
  checked boolean,
  note text,
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
    r.id as rsvp_id,
    r.guest_name,
    r.category,
    r.phone,
    r.bus_pickup,
    r.bus_return,
    coalesce(gm.checked, false) as checked,
    gm.note,
    coalesce(
      array_agg(c.name order by c.id) filter (where c.id is not null and c.joins_bus is true),
      array[]::text[]
    ) as companions
  from public.rsvp_latest r
  left join public.bus_roster_marks gm on gm.rsvp_id = r.id
  left join public.companions c on c.rsvp_id = r.id
  where r.status = 'bus'
  group by r.id, r.guest_name, r.category, r.phone, r.bus_pickup, r.bus_return,
           r.created_at, gm.checked, gm.note
  order by r.category, r.guest_name, r.created_at, r.id;
end;
$$;

revoke all on function public.get_public_bus_admin_rsvps(text)
from public, anon, authenticated;
grant execute on function public.get_public_bus_admin_rsvps(text)
to anon, authenticated;

-- /bus-admin write: anyone holding a valid bus-admin token may tick/un-tick and note
-- any guest who is actually on the current bus roster. The token is the trust boundary.
create or replace function public.set_public_bus_guest_mark(
  p_token text,
  p_rsvp_id bigint,
  p_checked boolean,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text;
  v_on_roster boolean;
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

  select exists (
    select 1 from public.rsvp_latest r
    where r.id = p_rsvp_id and r.status = 'bus'
  ) into v_on_roster;

  if not v_on_roster then
    raise exception 'Guest is not on the bus roster' using errcode = '42501';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'Note too long' using errcode = '22001';
  end if;

  insert into public.bus_roster_marks (rsvp_id, checked, note, updated_at)
  values (p_rsvp_id, coalesce(p_checked, false), v_note, now())
  on conflict (rsvp_id)
  do update set checked = excluded.checked, note = excluded.note, updated_at = now();
end;
$$;

revoke all on function public.set_public_bus_guest_mark(text, bigint, boolean, text)
from public, anon, authenticated;
grant execute on function public.set_public_bus_guest_mark(text, bigint, boolean, text)
to anon, authenticated;

-- Admin: every public share link in one list — per-group pages and both bus pages.
create or replace function public.get_admin_public_links()
returns table (
  kind text,
  slug text,
  category text,
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
  select 'group'::text, g.slug, g.category, g.title, g.access_token, g.is_public, false
  from public.public_group_pages g
  union all
  select 'bus'::text, b.slug, null::text, b.title, b.access_token, b.is_public, b.includes_phone
  from public.public_bus_pages b
  order by 1, 2;
end;
$$;

revoke all on function public.get_admin_public_links()
from public, anon, authenticated;
grant execute on function public.get_admin_public_links()
to authenticated;

-- Superseded by get_admin_public_links (which also lists the per-group pages).
drop function if exists public.get_admin_bus_links();

-- Group page now carries bus_seats per row (guest + bus-riding companions) so the page
-- can show "Tổng tham dự: N (Đi xe: M)" with the same seat count as the bus roster.
drop function if exists public.get_public_group_rsvps(text, text);

create function public.get_public_group_rsvps(
  p_slug text,
  p_token text
)
returns table (
  guest_name text,
  status text,
  bus_pickup text,
  bus_return boolean,
  bus_seats integer,
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
    r.bus_pickup,
    r.bus_return,
    (case
       when r.status = 'bus'
         then 1 + count(c.id) filter (where c.joins_bus is true)
       else 0
     end)::integer as bus_seats,
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
  group by r.id, r.guest_name, r.status, r.bus_pickup, r.bus_return, r.created_at
  order by r.guest_name, r.created_at, r.id;
end;
$$;

revoke all on function public.get_public_group_rsvps(text, text)
from public, anon, authenticated;
grant execute on function public.get_public_group_rsvps(text, text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
