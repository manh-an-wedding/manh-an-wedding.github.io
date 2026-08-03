-- Add append-only RSVP revisions, reviewable duplicate candidates, a safe
-- public group listing, and authenticated admin management.

begin;

drop view if exists public.bus_manifest;
drop view if exists public.bus_seat_count;
drop view if exists public.possible_duplicates;
drop view if exists public.rsvp_latest;

alter table public.rsvp
  add column if not exists superseded_by_id bigint,
  add column if not exists duplicate_of_id bigint,
  add column if not exists duplicate_status text,
  add column if not exists duplicate_reviewed_at timestamptz,
  add column if not exists duplicate_reviewed_by uuid;

do $constraints$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'rsvp_superseded_by_id_fkey'
      and conrelid = 'public.rsvp'::regclass
  ) then
    alter table public.rsvp
      add constraint rsvp_superseded_by_id_fkey
      foreign key (superseded_by_id) references public.rsvp(id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'rsvp_duplicate_of_id_fkey'
      and conrelid = 'public.rsvp'::regclass
  ) then
    alter table public.rsvp
      add constraint rsvp_duplicate_of_id_fkey
      foreign key (duplicate_of_id) references public.rsvp(id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'rsvp_duplicate_reviewed_by_fkey'
      and conrelid = 'public.rsvp'::regclass
  ) then
    alter table public.rsvp
      add constraint rsvp_duplicate_reviewed_by_fkey
      foreign key (duplicate_reviewed_by) references auth.users(id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'rsvp_revision_not_self_check'
      and conrelid = 'public.rsvp'::regclass
  ) then
    alter table public.rsvp
      add constraint rsvp_revision_not_self_check
      check (superseded_by_id is null or superseded_by_id <> id);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conname = 'rsvp_duplicate_state_check'
      and conrelid = 'public.rsvp'::regclass
  ) then
    alter table public.rsvp
      add constraint rsvp_duplicate_state_check
      check (
        (
          duplicate_of_id is null
          and duplicate_status is null
          and duplicate_reviewed_at is null
          and duplicate_reviewed_by is null
        )
        or
        (
          duplicate_of_id is not null
          and duplicate_of_id <> id
          and duplicate_status = 'pending'
          and duplicate_reviewed_at is null
          and duplicate_reviewed_by is null
        )
        or
        (
          duplicate_of_id is not null
          and duplicate_of_id <> id
          and duplicate_status in ('confirmed', 'rejected')
          and duplicate_reviewed_at is not null
          and duplicate_reviewed_by is not null
        )
      );
  end if;
end;
$constraints$;

create index if not exists rsvp_superseded_by_idx
  on public.rsvp (superseded_by_id)
  where superseded_by_id is not null;
create index if not exists rsvp_duplicate_status_idx
  on public.rsvp (duplicate_status, created_at desc)
  where duplicate_status is not null;
create index if not exists rsvp_duplicate_of_idx
  on public.rsvp (duplicate_of_id)
  where duplicate_of_id is not null;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.public_group_pages (
  slug text primary key,
  category text not null unique references public.rsvp_groups(name)
    on update cascade on delete restrict,
  title text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_group_pages_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint public_group_pages_title_length
    check (char_length(btrim(title)) between 1 and 120)
);

insert into public.public_group_pages (slug, category, title, is_public)
values ('tien-buoc', 'Tiến bước', 'Danh sách nhóm Tiến bước', true)
on conflict (slug) do update
set category = excluded.category,
    title = excluded.title,
    is_public = excluded.is_public,
    updated_at = now();

alter table public.admin_users enable row level security;
alter table public.public_group_pages enable row level security;

-- Backfill the existing append-only history into immediate revision links.
with ordered as (
  select
    r.id,
    lead(r.id) over (
      partition by r.name_norm, r.category, coalesce(r.device_id, '')
      order by r.created_at, r.id
    ) as next_id
  from public.rsvp r
)
update public.rsvp r
set superseded_by_id = ordered.next_id
from ordered
where r.id = ordered.id
  and ordered.next_id is not null
  and r.superseded_by_id is null;

-- Seed reviewable candidates from currently active identities. Same-name rows
-- in one group always warn across devices. Across groups, a device or phone
-- match is required.
with candidate_pairs as (
  select source.id as source_id, candidate.target_id
  from public.rsvp source
  cross join lateral (
    select target.id as target_id
    from public.rsvp target
    where target.id <> source.id
      and target.superseded_by_id is null
      and target.name_norm = source.name_norm
      and (target.created_at, target.id) > (source.created_at, source.id)
      and (
        target.category = source.category
        or (
          target.category <> source.category
          and (
            (
              nullif(source.device_id, '') is not null
              and target.device_id = source.device_id
            )
            or (
              nullif(source.phone, '') is not null
              and target.phone = source.phone
            )
          )
        )
      )
    order by target.created_at desc, target.id desc
    limit 1
  ) candidate
  where source.superseded_by_id is null
)
update public.rsvp r
set duplicate_of_id = candidate_pairs.target_id,
    duplicate_status = 'pending',
    duplicate_reviewed_at = null,
    duplicate_reviewed_by = null
from candidate_pairs
where r.id = candidate_pairs.source_id;

create or replace function public.is_rsvp_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

create or replace function public.flag_rsvp_duplicate_candidates(
  p_new_rsvp_id bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new public.rsvp%rowtype;
begin
  select * into v_new
  from public.rsvp
  where id = p_new_rsvp_id;

  if not found then
    raise exception 'RSVP not found' using errcode = '22023';
  end if;

  update public.rsvp source
  set duplicate_of_id = v_new.id,
      duplicate_status = 'pending',
      duplicate_reviewed_at = null,
      duplicate_reviewed_by = null
  where source.id <> v_new.id
    and source.superseded_by_id is null
    and source.duplicate_status is distinct from 'confirmed'
    and source.name_norm = v_new.name_norm
    and (source.created_at, source.id) < (v_new.created_at, v_new.id)
    and (
      source.category = v_new.category
      or (
        source.category <> v_new.category
        and (
          (
            nullif(source.device_id, '') is not null
            and source.device_id = v_new.device_id
          )
          or (
            nullif(source.phone, '') is not null
            and source.phone = v_new.phone
          )
        )
      )
    );
end;
$$;

create view public.rsvp_latest
with (security_invoker = true)
as
select
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
  r.created_at,
  r.superseded_by_id,
  r.duplicate_of_id,
  r.duplicate_status,
  r.duplicate_reviewed_at,
  r.duplicate_reviewed_by
from public.rsvp r
where r.superseded_by_id is null
  and r.duplicate_status is distinct from 'confirmed';

create view public.possible_duplicates
with (security_invoker = true)
as
select
  source.id as candidate_id,
  source.guest_name as candidate_guest_name,
  source.category as candidate_category,
  source.status as candidate_status,
  source.phone as candidate_phone,
  source.device_id as candidate_device_id,
  source.party_size as candidate_party_size,
  source.created_at as candidate_created_at,
  target.id as target_id,
  target.guest_name as target_guest_name,
  target.category as target_category,
  target.status as target_status,
  target.phone as target_phone,
  target.device_id as target_device_id,
  target.party_size as target_party_size,
  target.created_at as target_created_at
from public.rsvp source
join lateral (
  with recursive revision_chain as (
    select first_target.*
    from public.rsvp first_target
    where first_target.id = source.duplicate_of_id

    union all

    select next_target.*
    from public.rsvp next_target
    join revision_chain previous
      on next_target.id = previous.superseded_by_id
  )
  select *
  from revision_chain
  order by created_at desc, id desc
  limit 1
) target on true
where source.superseded_by_id is null
  and source.duplicate_status = 'pending';

create view public.bus_manifest
with (security_invoker = true)
as
select
  r.id as rsvp_id,
  r.guest_name,
  r.category,
  r.phone,
  r.party_size,
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

create or replace function public.get_public_group_rsvps(p_slug text)
returns table (
  guest_name text,
  status text,
  companions text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.guest_name,
    r.status,
    coalesce(
      array_agg(c.name order by c.id) filter (where c.id is not null),
      array[]::text[]
    ) as companions
  from public.public_group_pages p
  join public.rsvp_latest r on r.category = p.category
  left join public.companions c on c.rsvp_id = r.id
  where p.slug = btrim(p_slug)
    and p.is_public = true
  group by r.id, r.guest_name, r.status, r.created_at
  order by r.guest_name, r.created_at, r.id;
$$;

create or replace function public.get_admin_rsvp_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'rawRsvpCount', (select count(*) from public.rsvp),
    'currentRsvpCount', (select count(*) from public.rsvp_latest),
    'attendingPeople', coalesce((
      select sum(party_size) from public.rsvp_latest
      where status in ('self_transport', 'bus')
    ), 0),
    'pendingDuplicateCount', (
      select count(*) from public.rsvp
      where superseded_by_id is null and duplicate_status = 'pending'
    ),
    'busGuestSeats', (select guest_seats from public.bus_seat_count),
    'busCompanionSeats', (select companion_seats from public.bus_seat_count)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.get_admin_rsvp_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'summary', public.get_admin_rsvp_summary(),
    'current', coalesce((
      select jsonb_agg(
        to_jsonb(r) || jsonb_build_object(
          'companions', coalesce((
            select jsonb_agg(to_jsonb(c) order by c.id)
            from public.companions c
            where c.rsvp_id = r.id
          ), '[]'::jsonb)
        )
        order by r.created_at desc, r.id desc
      )
      from public.rsvp_latest r
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(
        to_jsonb(r) || jsonb_build_object(
          'companions', coalesce((
            select jsonb_agg(to_jsonb(c) order by c.id)
            from public.companions c
            where c.rsvp_id = r.id
          ), '[]'::jsonb)
        )
        order by r.created_at desc, r.id desc
      )
      from public.rsvp r
    ), '[]'::jsonb),
    'duplicates', coalesce((
      select jsonb_agg(to_jsonb(d) order by d.candidate_created_at desc)
      from public.possible_duplicates d
    ), '[]'::jsonb),
    'busCurrent', coalesce((
      select jsonb_agg(
        to_jsonb(r) || jsonb_build_object(
          'companions', coalesce((
            select jsonb_agg(to_jsonb(c) order by c.id)
            from public.companions c
            where c.rsvp_id = r.id
          ), '[]'::jsonb)
        )
        order by r.guest_name, r.id
      )
      from public.rsvp_latest r
      where r.status = 'bus'
    ), '[]'::jsonb),
    'busHistory', coalesce((
      select jsonb_agg(
        to_jsonb(r) || jsonb_build_object(
          'companions', coalesce((
            select jsonb_agg(to_jsonb(c) order by c.id)
            from public.companions c
            where c.rsvp_id = r.id
          ), '[]'::jsonb)
        )
        order by r.created_at desc, r.id desc
      )
      from public.rsvp r
      where r.status = 'bus'
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(g.name order by g.name)
      from public.rsvp_groups g
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.admin_review_rsvp_duplicate(
  p_candidate_id bigint,
  p_target_id bigint,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := auth.uid();
  v_candidate public.rsvp%rowtype;
  v_target public.rsvp%rowtype;
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_status not in ('pending', 'confirmed', 'rejected') then
    raise exception 'Invalid duplicate review status' using errcode = '22023';
  end if;

  select * into v_candidate
  from public.rsvp
  where id = p_candidate_id
  for update;
  select * into v_target
  from public.rsvp
  where id = p_target_id;

  if v_candidate.id is null or v_target.id is null
     or v_candidate.id = v_target.id
     or v_candidate.superseded_by_id is not null
     or v_candidate.name_norm <> v_target.name_norm
     or (v_target.created_at, v_target.id)
        <= (v_candidate.created_at, v_candidate.id) then
    raise exception 'Invalid duplicate review pair' using errcode = '22023';
  end if;

  update public.rsvp
  set duplicate_of_id = v_target.id,
      duplicate_status = p_status,
      duplicate_reviewed_at = case
        when p_status = 'pending' then null else now()
      end,
      duplicate_reviewed_by = case
        when p_status = 'pending' then null else v_admin_id
      end
  where id = v_candidate.id;
end;
$$;

create or replace function public.admin_create_rsvp_revision(
  p_source_id bigint,
  p_guest_name text,
  p_category text,
  p_status text,
  p_phone text,
  p_companions jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.rsvp%rowtype;
  v_new_id bigint;
  v_name_norm text;
  v_companion_count integer;
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_source
  from public.rsvp
  where id = p_source_id
  for update;

  if v_source.id is null
     or v_source.superseded_by_id is not null
     or v_source.duplicate_status = 'confirmed' then
    raise exception 'RSVP is no longer editable' using errcode = '22023';
  end if;

  v_name_norm := public.normalize_guest_name(p_guest_name);
  if nullif(btrim(p_guest_name), '') is null
     or char_length(btrim(p_guest_name)) > 120
     or p_status not in ('self_transport', 'bus', 'cannot_attend')
     or not exists (
       select 1 from public.rsvp_groups g
       where g.name = btrim(p_category)
     ) then
    raise exception 'Invalid RSVP input' using errcode = '22023';
  end if;

  if p_status = 'bus'
     and (
       nullif(btrim(p_phone), '') is null
       or char_length(btrim(p_phone)) > 24
       or btrim(p_phone) !~ '^[0-9+(). -]{6,24}$'
     ) then
    raise exception 'Invalid phone for bus registration' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_companions, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_companions, '[]'::jsonb)) > 9
     or exists (
       select 1
       from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value)
       where jsonb_typeof(entry.value) <> 'object'
          or nullif(btrim(entry.value ->> 'name'), '') is null
          or char_length(btrim(entry.value ->> 'name')) > 120
          or char_length(coalesce(btrim(entry.value ->> 'relation'), '')) > 80
     ) then
    raise exception 'Invalid companions list' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb));

  insert into public.rsvp (
    guest_name, name_norm, category, status, phone, party_size,
    matched_guest_id, device_id, ip
  ) values (
    btrim(p_guest_name), v_name_norm, btrim(p_category), p_status,
    case when p_status = 'bus' then btrim(p_phone) else null end,
    1 + v_companion_count, v_source.matched_guest_id,
    v_source.device_id, v_source.ip
  ) returning id into v_new_id;

  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_new_id,
    btrim(entry.value ->> 'name'),
    p_status = 'bus',
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value);

  update public.rsvp
  set superseded_by_id = v_new_id
  where id = v_source.id;

  perform public.flag_rsvp_duplicate_candidates(v_new_id);
  return v_new_id;
end;
$$;

-- Preserve all validation/rate limits from migration 0005, then link the
-- previous same-identity row and create reviewable candidates.
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
  v_previous_id bigint;
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
          ), ',', 1
        )
      ), 64
    ), ''
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
    select 1 from public.rsvp_groups g
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

  select s.bus_deadline into v_bus_deadline
  from public.rsvp_settings s where s.singleton = true;
  if p_status = 'bus' and now() > v_bus_deadline then
    raise exception 'Bus registration is closed' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_companions, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_companions, '[]'::jsonb)) > 9
     or exists (
       select 1
       from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value)
       where jsonb_typeof(entry.value) <> 'object'
          or nullif(btrim(entry.value ->> 'name'), '') is null
          or char_length(btrim(entry.value ->> 'name')) > 120
          or char_length(coalesce(btrim(entry.value ->> 'relation'), '')) > 80
     ) then
    raise exception 'Invalid companions list' using errcode = '22023';
  end if;

  v_device_lock := pg_catalog.hashtextextended(
    'rsvp-device:' || btrim(p_device_id), 0
  );
  v_ip_lock := case when v_ip is null then null
    else pg_catalog.hashtextextended('rsvp-ip:' || v_ip, 0) end;

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
    select count(*) from public.rsvp r
    where r.created_at > now() - interval '15 minutes'
      and (
        r.device_id = btrim(p_device_id)
        or (v_ip is not null and r.ip = v_ip)
      )
  ) >= 20 then
    raise exception 'Too many RSVP submissions; please try again later'
      using errcode = 'P0001';
  end if;

  select r.id into v_previous_id
  from public.rsvp r
  where r.name_norm = v_name_norm
    and r.category = btrim(p_category)
    and coalesce(r.device_id, '') = btrim(p_device_id)
    and r.superseded_by_id is null
  order by r.created_at desc, r.id desc
  limit 1
  for update;

  select count(*)::integer into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb));

  insert into public.rsvp (
    guest_name, name_norm, category, status, phone,
    party_size, device_id, ip
  ) values (
    btrim(p_guest_name), v_name_norm, btrim(p_category), p_status,
    case when p_status = 'bus' then btrim(p_phone) else null end,
    1 + v_companion_count, btrim(p_device_id), v_ip
  ) returning id into v_rsvp_id;

  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_rsvp_id, btrim(entry.value ->> 'name'), p_status = 'bus',
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value);

  if v_previous_id is not null then
    update public.rsvp
    set superseded_by_id = v_rsvp_id
    where id = v_previous_id;
  end if;

  perform public.flag_rsvp_duplicate_candidates(v_rsvp_id);
  return v_rsvp_id;
end;
$$;

drop policy if exists rsvp_admin_read on public.rsvp;
create policy rsvp_admin_read
on public.rsvp for select to authenticated
using (public.is_rsvp_admin());

drop policy if exists companions_admin_read on public.companions;
create policy companions_admin_read
on public.companions for select to authenticated
using (public.is_rsvp_admin());

drop policy if exists rsvp_groups_admin_read on public.rsvp_groups;
create policy rsvp_groups_admin_read
on public.rsvp_groups for select to authenticated
using (public.is_rsvp_admin());

drop policy if exists public_group_pages_admin_read on public.public_group_pages;
create policy public_group_pages_admin_read
on public.public_group_pages for select to authenticated
using (public.is_rsvp_admin());

revoke all on table public.admin_users, public.public_group_pages
from anon, authenticated;
revoke all on table public.rsvp, public.companions, public.rsvp_groups
from authenticated;
grant select on table public.rsvp, public.companions, public.rsvp_groups,
  public.public_group_pages to authenticated;

revoke all on table public.rsvp_latest, public.possible_duplicates,
  public.bus_manifest, public.bus_seat_count from anon, authenticated;
grant select on table public.rsvp_latest, public.possible_duplicates,
  public.bus_manifest, public.bus_seat_count to authenticated;

revoke all on function public.is_rsvp_admin() from public, anon, authenticated;
grant execute on function public.is_rsvp_admin() to authenticated;

revoke all on function public.flag_rsvp_duplicate_candidates(bigint)
from public, anon, authenticated;

revoke all on function public.get_public_group_rsvps(text)
from public, anon, authenticated;
grant execute on function public.get_public_group_rsvps(text)
to anon, authenticated;

revoke all on function public.get_admin_rsvp_summary()
from public, anon, authenticated;
revoke all on function public.get_admin_rsvp_dashboard()
from public, anon, authenticated;
revoke all on function public.admin_review_rsvp_duplicate(bigint,bigint,text)
from public, anon, authenticated;
revoke all on function public.admin_create_rsvp_revision(
  bigint,text,text,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.get_admin_rsvp_summary() to authenticated;
grant execute on function public.get_admin_rsvp_dashboard() to authenticated;
grant execute on function public.admin_review_rsvp_duplicate(bigint,bigint,text)
to authenticated;
grant execute on function public.admin_create_rsvp_revision(
  bigint,text,text,text,text,jsonb
) to authenticated;

revoke all on function public.submit_rsvp(
  text,text,text,text,text,jsonb,text
) from public, anon, authenticated;
grant execute on function public.submit_rsvp(
  text,text,text,text,text,jsonb,text
) to anon;

commit;
