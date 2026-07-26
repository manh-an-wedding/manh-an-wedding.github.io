-- Simplify RSVP details, capture the request IP inside the protected RPC,
-- and make RPCs the only public write path.

begin;

alter table public.rsvp
  add column if not exists ip text;

-- rsvp_latest originally selects every RSVP column, so the views that depend
-- on it must be recreated explicitly before user_agent can be removed.
-- possible_duplicates reads RSVP directly and remains untouched.
drop view if exists public.bus_manifest;
drop view if exists public.bus_seat_count;
drop view if exists public.rsvp_latest;

alter table public.rsvp
  drop column if exists user_agent;

alter table public.companions
  add column if not exists joins_bus boolean not null default false,
  add column if not exists relation text;

create view public.rsvp_latest as
select distinct on (r.name_norm, coalesce(r.device_id, ''))
  r.id,
  r.guest_name,
  r.name_norm,
  r.category,
  r.status,
  r.phone,
  r.party_size,
  r.matched_guest_id,
  r.device_id,
  r.ip,
  r.created_at
from public.rsvp r
order by
  r.name_norm,
  coalesce(r.device_id, ''),
  r.created_at desc,
  r.id desc;

create or replace view public.bus_manifest as
select
  r.guest_name,
  r.category,
  r.phone,
  c.name as companion_name,
  c.joins_bus
from public.rsvp_latest r
left join public.companions c on c.rsvp_id = r.id
where r.status = 'bus';

create or replace view public.bus_seat_count as
select
  (select count(*)
   from public.rsvp_latest
   where status = 'bus') as guest_seats,
  (select count(*)
   from public.companions c
   join public.rsvp_latest r on r.id = c.rsvp_id
   where r.status = 'bus'
     and c.joins_bus = true) as companion_seats;

-- Older cached clients may still call this function. Returning false keeps
-- them compatible while allowing every response to be stored.
create or replace function public.check_rsvp_clash(
  p_name_norm text,
  p_category text,
  p_status text,
  p_device_id text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select false;
$$;

create or replace function public.submit_rsvp(
  p_guest_name text,
  p_name_norm text,
  p_category text,
  p_status text,
  p_phone text,
  p_companions jsonb,
  p_device_id text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rsvp_id bigint;
  v_companion_count integer;
  v_request_headers jsonb;
  v_ip text;
begin
  v_request_headers :=
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;

  v_ip := nullif(
    btrim(
      split_part(
        coalesce(
          v_request_headers ->> 'cf-connecting-ip',
          v_request_headers ->> 'x-forwarded-for',
          v_request_headers ->> 'x-real-ip',
          ''
        ),
        ',',
        1
      )
    ),
    ''
  );

  if nullif(btrim(p_guest_name), '') is null
     or nullif(btrim(p_name_norm), '') is null
     or nullif(btrim(p_category), '') is null
     or p_status not in ('self_transport', 'bus', 'cannot_attend') then
    raise exception 'Invalid RSVP input' using errcode = '22023';
  end if;

  if p_status = 'bus' and nullif(btrim(p_phone), '') is null then
    raise exception 'Phone is required for bus registration' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_companions, '[]'::jsonb)) <> 'array' then
    raise exception 'Companions must be a JSON array' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) as entry(value)
  where nullif(btrim(entry.value ->> 'name'), '') is not null;

  insert into public.rsvp (
    guest_name,
    name_norm,
    category,
    status,
    phone,
    party_size,
    device_id,
    ip
  )
  values (
    btrim(p_guest_name),
    btrim(p_name_norm),
    p_category,
    p_status,
    case when p_status = 'bus' then nullif(btrim(p_phone), '') else null end,
    1 + v_companion_count,
    p_device_id,
    v_ip
  )
  returning id into v_rsvp_id;

  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_rsvp_id,
    btrim(entry.value ->> 'name'),
    p_status = 'bus',
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) as entry(value)
  where nullif(btrim(entry.value ->> 'name'), '') is not null;

  return v_rsvp_id;
end;
$$;

drop policy if exists rsvp_insert on public.rsvp;
drop policy if exists companions_insert on public.companions;
drop policy if exists wishes_insert on public.wishes;

revoke insert on table public.rsvp from anon;
revoke insert on table public.companions from anon;
revoke insert on table public.wishes from anon;

revoke all on function public.check_rsvp_clash(text, text, text, text) from public;
revoke all on function public.submit_rsvp(text, text, text, text, text, jsonb, text) from public;

grant execute on function public.check_rsvp_clash(text, text, text, text) to anon;
grant execute on function public.submit_rsvp(text, text, text, text, text, jsonb, text) to anon;

commit;
