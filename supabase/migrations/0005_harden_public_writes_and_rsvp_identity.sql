-- Harden public RSVP/wish entry points, preserve guests with the same name in
-- different groups, and remove anonymous guest-list enumeration.

begin;

create table if not exists public.rsvp_groups (
  name text primary key,
  constraint rsvp_groups_name_length check (char_length(name) between 1 and 80)
);

insert into public.rsvp_groups (name)
values
  ('Họ hàng nhà gái'),
  ('Bạn cha Năm'),
  ('Bạn mẹ Bắc'),
  ('Tiến bước'),
  ('IAS'),
  ('ZAD'),
  ('MWG'),
  ('RVC'),
  ('Bạn của An'),
  ('Bạn của Tâm')
on conflict (name) do nothing;

alter table public.rsvp_groups enable row level security;
revoke all on table public.rsvp_groups from anon, authenticated;

create table if not exists public.rsvp_settings (
  singleton boolean primary key default true check (singleton),
  bus_deadline timestamptz not null
);

insert into public.rsvp_settings (singleton, bus_deadline)
values (true, timestamptz '2026-10-10 11:30:00+07:00')
on conflict (singleton) do update
set bus_deadline = excluded.bus_deadline;

alter table public.rsvp_settings enable row level security;
revoke all on table public.rsvp_settings from anon, authenticated;

create index if not exists rsvp_device_created_at_idx
  on public.rsvp (device_id, created_at desc)
  where device_id is not null;
create index if not exists rsvp_ip_created_at_idx
  on public.rsvp (ip, created_at desc)
  where ip is not null;
create index if not exists wishes_device_created_at_idx
  on public.wishes (device_id, created_at desc)
  where device_id is not null;
create index if not exists wishes_ip_created_at_idx
  on public.wishes (ip, created_at desc)
  where ip is not null;
create index if not exists page_visits_device_visited_at_idx
  on public.page_visits (device_id, visited_at desc)
  where device_id is not null;
create index if not exists page_visits_ip_visited_at_idx
  on public.page_visits (ip, visited_at desc)
  where ip is not null;

-- Keep the client argument for backward-compatible RPC signatures, but derive
-- the stored identity on the server so direct callers cannot evade latest/
-- duplicate grouping. PostgreSQL lower() handles uppercase Vietnamese letters;
-- translate() removes the remaining precomposed accents and đ.
create or replace function public.normalize_guest_name(p_name text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select pg_catalog.regexp_replace(
    pg_catalog.btrim(
      pg_catalog.translate(
        pg_catalog.lower(normalize(p_name, NFC)),
        'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
      )
    ),
    '[[:space:]]+',
    ' ',
    'g'
  );
$$;

drop view if exists public.bus_manifest;
drop view if exists public.bus_seat_count;
drop view if exists public.possible_duplicates;
drop view if exists public.rsvp_latest;

-- A same-name response on the same device is a separate guest when the group
-- differs. Re-submissions inside the same name+group+device identity still use
-- the latest response.
create view public.rsvp_latest
with (security_invoker = true)
as
select distinct on (
  r.name_norm,
  r.category,
  coalesce(r.device_id, '')
)
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
  r.category,
  coalesce(r.device_id, ''),
  r.created_at desc,
  r.id desc;

create view public.possible_duplicates
with (security_invoker = true)
as
select
  r.name_norm,
  count(*)::integer as latest_response_count,
  count(distinct coalesce(r.device_id, ''))::integer as device_count,
  array_agg(distinct r.guest_name order by r.guest_name) as names,
  array_agg(distinct r.category order by r.category) as groups,
  array_remove(array_agg(distinct r.phone order by r.phone), null) as phones
from public.rsvp_latest r
group by r.name_norm
having count(*) > 1;

create view public.bus_manifest
with (security_invoker = true)
as
select
  r.guest_name,
  r.category,
  r.phone,
  c.name as companion_name,
  c.joins_bus
from public.rsvp_latest r
left join public.companions c on c.rsvp_id = r.id
where r.status = 'bus';

create view public.bus_seat_count
with (security_invoker = true)
as
select
  (select count(*)
   from public.rsvp_latest
   where status = 'bus') as guest_seats,
  (select count(*)
   from public.companions c
   join public.rsvp_latest r on r.id = c.rsvp_id
   where r.status = 'bus'
     and c.joins_bus = true) as companion_seats;

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
  v_name_norm text;
  v_device_lock bigint;
  v_ip_lock bigint;
  v_bus_deadline timestamptz;
begin
  v_request_headers :=
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;

  v_ip := nullif(
    pg_catalog.left(
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
      64
    ),
    ''
  );

  v_name_norm := public.normalize_guest_name(p_guest_name);

  if nullif(btrim(p_guest_name), '') is null
     or char_length(btrim(p_guest_name)) > 120
     or nullif(btrim(p_name_norm), '') is null
     or char_length(btrim(p_name_norm)) > 120
     or btrim(p_name_norm) <> v_name_norm
     or p_status not in ('self_transport', 'bus', 'cannot_attend')
     or nullif(btrim(p_device_id), '') is null
     or char_length(btrim(p_device_id)) > 128 then
    raise exception 'Invalid RSVP input' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.rsvp_groups g
    where g.name = btrim(p_category)
  ) then
    raise exception 'Invalid RSVP group' using errcode = '22023';
  end if;

  if p_status = 'bus'
     and (
       nullif(btrim(p_phone), '') is null
       or char_length(btrim(p_phone)) > 24
       or btrim(p_phone) !~ '^[0-9+(). -]{6,24}$'
     ) then
    raise exception 'Invalid phone for bus registration' using errcode = '22023';
  end if;

  select s.bus_deadline
  into v_bus_deadline
  from public.rsvp_settings s
  where s.singleton = true;

  if p_status = 'bus' and now() > v_bus_deadline then
    raise exception 'Bus registration is closed' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_companions, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid companions list' using errcode = '22023';
  end if;

  if jsonb_array_length(coalesce(p_companions, '[]'::jsonb)) > 9 then
    raise exception 'Invalid companions list' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) as entry(value)
    where jsonb_typeof(entry.value) <> 'object'
       or nullif(btrim(entry.value ->> 'name'), '') is null
       or char_length(btrim(entry.value ->> 'name')) > 120
       or char_length(coalesce(btrim(entry.value ->> 'relation'), '')) > 80
  ) then
    raise exception 'Invalid companion input' using errcode = '22023';
  end if;

  -- Serialize submissions sharing either identifier so the rate check and
  -- insert are atomic even when requests arrive concurrently.
  v_device_lock := pg_catalog.hashtextextended(
    'rsvp-device:' || btrim(p_device_id),
    0
  );
  v_ip_lock := case
    when v_ip is null then null
    else pg_catalog.hashtextextended('rsvp-ip:' || v_ip, 0)
  end;

  if v_ip_lock is null then
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
  elsif v_device_lock <= v_ip_lock then
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
    if v_device_lock <> v_ip_lock then
      perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
    end if;
  else
    perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
  end if;

  if (
    select count(*)
    from public.rsvp r
    where r.created_at > now() - interval '15 minutes'
      and (
        r.device_id = btrim(p_device_id)
        or (v_ip is not null and r.ip = v_ip)
      )
  ) >= 20 then
    raise exception 'Too many RSVP submissions; please try again later'
      using errcode = 'P0001';
  end if;

  select count(*)::integer
  into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb));

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
    v_name_norm,
    btrim(p_category),
    p_status,
    case when p_status = 'bus' then btrim(p_phone) else null end,
    1 + v_companion_count,
    btrim(p_device_id),
    v_ip
  )
  returning id into v_rsvp_id;

  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_rsvp_id,
    btrim(entry.value ->> 'name'),
    p_status = 'bus',
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) as entry(value);

  return v_rsvp_id;
end;
$$;

create or replace function public.submit_wish(
  p_name text,
  p_message text,
  p_is_public boolean,
  p_device_id text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wish_id bigint;
  v_request_headers jsonb;
  v_ip text;
  v_device_lock bigint;
  v_ip_lock bigint;
begin
  v_request_headers :=
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;

  v_ip := nullif(
    pg_catalog.left(
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
      64
    ),
    ''
  );

  if nullif(btrim(p_name), '') is null
     or char_length(btrim(p_name)) > 120
     or nullif(btrim(p_message), '') is null
     or char_length(btrim(p_message)) > 1000
     or p_is_public is null
     or nullif(btrim(p_device_id), '') is null
     or char_length(btrim(p_device_id)) > 128 then
    raise exception 'Invalid wish input' using errcode = '22023';
  end if;

  v_device_lock := pg_catalog.hashtextextended(
    'wish-device:' || btrim(p_device_id),
    0
  );
  v_ip_lock := case
    when v_ip is null then null
    else pg_catalog.hashtextextended('wish-ip:' || v_ip, 0)
  end;

  if v_ip_lock is null then
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
  elsif v_device_lock <= v_ip_lock then
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
    if v_device_lock <> v_ip_lock then
      perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
    end if;
  else
    perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
  end if;

  if (
    select count(*)
    from public.wishes w
    where w.created_at > now() - interval '15 minutes'
      and (
        w.device_id = btrim(p_device_id)
        or (v_ip is not null and w.ip = v_ip)
      )
  ) >= 5 then
    raise exception 'Too many wishes; please try again later'
      using errcode = 'P0001';
  end if;

  insert into public.wishes (name, message, is_public, device_id, ip)
  values (
    btrim(p_name),
    btrim(p_message),
    p_is_public,
    btrim(p_device_id),
    v_ip
  )
  returning id into v_wish_id;

  return v_wish_id;
end;
$$;

-- Edge-only visit write: rate/dedupe and insert happen under the same
-- transaction-scoped locks, avoiding the select-then-insert race.
create or replace function public.log_page_visit(
  p_device_id text,
  p_ip text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_device_id text := nullif(btrim(p_device_id), '');
  v_ip text := nullif(btrim(p_ip), '');
  v_device_lock bigint;
  v_ip_lock bigint;
begin
  if (v_device_id is null and v_ip is null)
     or char_length(coalesce(v_device_id, '')) > 128
     or char_length(coalesce(v_ip, '')) > 64 then
    raise exception 'Invalid visit input' using errcode = '22023';
  end if;

  v_device_lock := case
    when v_device_id is null then null
    else pg_catalog.hashtextextended('visit-device:' || v_device_id, 0)
  end;
  v_ip_lock := case
    when v_ip is null then null
    else pg_catalog.hashtextextended('visit-ip:' || v_ip, 0)
  end;

  if v_device_lock is null then
    perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
  elsif v_ip_lock is null then
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
  elsif v_device_lock <= v_ip_lock then
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
    if v_device_lock <> v_ip_lock then
      perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
    end if;
  else
    perform pg_catalog.pg_advisory_xact_lock(v_ip_lock);
    perform pg_catalog.pg_advisory_xact_lock(v_device_lock);
  end if;

  if exists (
    select 1
    from public.page_visits v
    where v.visited_at > now() - interval '1 hour'
      and (
        (v_device_id is not null and v.device_id = v_device_id)
        or (v_ip is not null and v.ip = v_ip)
      )
  ) then
    return false;
  end if;

  insert into public.page_visits (device_id, ip)
  values (v_device_id, v_ip);

  return true;
end;
$$;

drop view if exists public.guests_public;
drop view if exists public.wishes_public;

drop policy if exists wishes_public_read on public.wishes;
create policy wishes_public_read
on public.wishes
for select
to anon
using (is_public = true);

create view public.wishes_public
with (security_invoker = true)
as
select id, name, message, created_at
from public.wishes
where is_public = true;

revoke all on table
  public.rsvp,
  public.companions,
  public.guests,
  public.page_visits,
  public.rsvp_groups,
  public.rsvp_settings,
  public.wishes
from anon, authenticated;

grant select (id, name, message, is_public, created_at)
on table public.wishes
to anon;
grant select on table public.wishes_public to anon;

revoke all on table
  public.rsvp_latest,
  public.possible_duplicates,
  public.bus_manifest,
  public.bus_seat_count
from anon, authenticated;

revoke all on function public.submit_rsvp(
  text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
revoke all on function public.submit_wish(
  text, text, boolean, text
) from public, anon, authenticated;
revoke all on function public.log_page_visit(
  text, text
) from public, anon, authenticated;
revoke all on function public.normalize_guest_name(
  text
) from public, anon, authenticated;
revoke all on function public.check_rsvp_clash(
  text, text, text, text
) from public, anon, authenticated;

grant execute on function public.submit_rsvp(
  text, text, text, text, text, jsonb, text
) to anon;
grant execute on function public.submit_wish(
  text, text, boolean, text
) to anon;

grant execute on function public.log_page_visit(
  text, text
) to service_role;

alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

commit;
