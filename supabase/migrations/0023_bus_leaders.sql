-- Shuttle group leader(s): name, phone and Zalo group link, shown to a guest right after
-- they confirm the bus. Rows are maintained directly in Supabase (no admin UI).

begin;

create table if not exists public.bus_leaders (
  id bigint generated always as identity primary key,
  name text not null,
  phone text,
  zalo_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bus_leaders_name_length check (char_length(btrim(name)) between 1 and 120),
  constraint bus_leaders_phone_length check (phone is null or char_length(btrim(phone)) between 1 and 30),
  constraint bus_leaders_zalo_link_https check (zalo_link is null or zalo_link ~ '^https://[^[:space:]]+$')
);

alter table public.bus_leaders enable row level security;
revoke all on table public.bus_leaders from anon, authenticated;

-- Only a guest holding the edit token of a current bus RSVP can read the leader contacts.
create or replace function public.get_bus_leaders_for_rsvp(
  p_rsvp_id bigint,
  p_edit_token text
)
returns table (
  name text,
  phone text,
  zalo_link text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_edit_token is null
     or p_edit_token !~ '^[0-9a-f]{64}$'
     or not exists (
       select 1
       from public.rsvp r
       where r.id = p_rsvp_id
         and r.edit_token_hash = extensions.digest(p_edit_token, 'sha256')
         and r.superseded_by_id is null
         and r.invalidated_at is null
         and r.status = 'bus'
     ) then
    raise exception 'Bus leader access is not authorized' using errcode = '42501';
  end if;

  return query
  select l.name, l.phone, l.zalo_link
  from public.bus_leaders l
  order by l.id;
end;
$$;

revoke all on function public.get_bus_leaders_for_rsvp(bigint, text)
from public, anon, authenticated;
grant execute on function public.get_bus_leaders_for_rsvp(bigint, text)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
