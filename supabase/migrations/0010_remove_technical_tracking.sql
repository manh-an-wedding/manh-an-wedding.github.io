-- Remove application-level visit, IP, and browser-device tracking.
-- This intentionally deletes historical page visits and technical identifiers,
-- while preserving RSVP, companion, phone, wish, and admin-review data.

begin;

create extension if not exists pgcrypto with schema extensions;

-- Remove the legacy write surfaces before deleting their backing columns.
drop function if exists public.check_rsvp_clash(text, text, text, text);
drop function if exists public.submit_rsvp(
  text, text, text, text, text, jsonb, text
);
drop function if exists public.submit_rsvp(
  text, text, text, text, text, jsonb
);
drop function if exists public.update_rsvp(
  bigint, text, text, text, text, text, text, jsonb
);
drop function if exists public.admin_set_rsvp_invalidated(
  bigint, boolean, text
);
drop function if exists public.submit_wish(text, text, boolean, text);
drop function if exists public.log_page_visit(text, text);

-- Rebuild dependent views without IP/device fields.
drop view if exists public.bus_seat_count;
drop view if exists public.bus_manifest;
drop view if exists public.possible_duplicates;
drop view if exists public.rsvp_latest;

drop table if exists public.page_visits;

alter table public.rsvp
  add column if not exists edit_token_hash bytea,
  add column if not exists invalidated_at timestamptz,
  add column if not exists invalidated_by uuid references auth.users(id)
    on delete set null,
  add column if not exists invalid_reason text,
  drop column if exists device_id,
  drop column if exists ip;

alter table public.wishes
  drop column if exists device_id,
  drop column if exists ip;

-- A repeated same-name/group submission supersedes its previous active row.
-- Duplicate review is reserved for same names across groups or a shared
-- non-empty phone number. Those signals warn an admin but never delete data.
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
    and source.invalidated_at is null
    and source.duplicate_status is distinct from 'confirmed'
    and (source.created_at, source.id) < (v_new.created_at, v_new.id)
    and (
      (
        source.name_norm = v_new.name_norm
        and source.category <> v_new.category
      )
      or (
        nullif(btrim(source.phone), '') is not null
        and nullif(btrim(v_new.phone), '') is not null
        and source.phone = v_new.phone
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
  r.created_at,
  r.superseded_by_id,
  r.duplicate_of_id,
  r.duplicate_status,
  r.duplicate_reviewed_at,
  r.duplicate_reviewed_by,
  r.invalidated_at,
  r.invalidated_by,
  r.invalid_reason,
  r.data_check
from public.rsvp r
where r.superseded_by_id is null
  and r.invalidated_at is null
  and (r.duplicate_status is null or r.duplicate_status = 'rejected');

create view public.possible_duplicates
with (security_invoker = true)
as
select
  source.id as candidate_id,
  source.guest_name as candidate_guest_name,
  source.category as candidate_category,
  source.status as candidate_status,
  source.phone as candidate_phone,
  source.party_size as candidate_party_size,
  source.created_at as candidate_created_at,
  target.id as target_id,
  target.guest_name as target_guest_name,
  target.category as target_category,
  target.status as target_status,
  target.phone as target_phone,
  target.party_size as target_party_size,
  target.created_at as target_created_at,
  source.duplicate_status as candidate_duplicate_status,
  source.duplicate_reviewed_at as candidate_duplicate_reviewed_at,
  source.duplicate_reviewed_by as candidate_duplicate_reviewed_by
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
  and source.invalidated_at is null
  and target.invalidated_at is null
  and source.duplicate_status is not null;

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

create function public.submit_rsvp(
  p_guest_name text,
  p_name_norm text,
  p_category text,
  p_status text,
  p_phone text,
  p_companions jsonb,
  p_edit_token text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rsvp_id bigint;
  v_companion_count integer;
  v_name_norm text;
  v_bus_deadline timestamptz;
begin
  v_name_norm := public.normalize_guest_name(p_guest_name);
  if nullif(btrim(p_guest_name), '') is null
     or char_length(btrim(p_guest_name)) > 120
     or nullif(btrim(p_name_norm), '') is null
     or char_length(btrim(p_name_norm)) > 120
     or btrim(p_name_norm) <> v_name_norm
     or p_edit_token !~ '^[0-9a-f]{64}$'
     or p_status not in ('self_transport', 'bus', 'cannot_attend') then
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

  -- Global circuit breaker replaces per-device/IP rate limiting.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rsvp-global-no-tracking', 0)
  );
  if (
    select count(*) from public.rsvp r
    where r.created_at > now() - interval '15 minutes'
  ) >= 100 then
    raise exception 'Too many RSVP submissions; please try again later'
      using errcode = 'P0001';
  end if;

  select count(*)::integer into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb));

  insert into public.rsvp (
    guest_name, name_norm, category, status, phone, party_size,
    edit_token_hash
  ) values (
    btrim(p_guest_name), v_name_norm, btrim(p_category), p_status,
    case when p_status = 'bus' then btrim(p_phone) else null end,
    1 + v_companion_count,
    extensions.digest(p_edit_token, 'sha256')
  ) returning id into v_rsvp_id;

  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_rsvp_id, btrim(entry.value ->> 'name'), p_status = 'bus',
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value);

  update public.rsvp source
  set superseded_by_id = v_rsvp_id,
      duplicate_of_id = null,
      duplicate_status = null,
      duplicate_reviewed_at = null,
      duplicate_reviewed_by = null
  where source.id <> v_rsvp_id
    and source.superseded_by_id is null
    and source.invalidated_at is null
    and source.duplicate_status is distinct from 'confirmed'
    and source.name_norm = v_name_norm
    and source.category = btrim(p_category);

  perform public.flag_rsvp_duplicate_candidates(v_rsvp_id);
  return v_rsvp_id;
end;
$$;

create function public.update_rsvp(
  p_rsvp_id bigint,
  p_edit_token text,
  p_guest_name text,
  p_name_norm text,
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
  v_rsvp public.rsvp%rowtype;
  v_companion_count integer;
  v_name_norm text;
  v_bus_deadline timestamptz;
begin
  select * into v_rsvp
  from public.rsvp
  where id = p_rsvp_id
  for update;

  if v_rsvp.id is null
     or v_rsvp.edit_token_hash is null
     or p_edit_token !~ '^[0-9a-f]{64}$'
     or v_rsvp.edit_token_hash <> extensions.digest(p_edit_token, 'sha256')
     or v_rsvp.superseded_by_id is not null
     or v_rsvp.invalidated_at is not null
     or v_rsvp.duplicate_status = 'confirmed' then
    raise exception 'RSVP edit is not authorized' using errcode = '42501';
  end if;

  v_name_norm := public.normalize_guest_name(p_guest_name);
  if nullif(btrim(p_guest_name), '') is null
     or char_length(btrim(p_guest_name)) > 120
     or nullif(btrim(p_name_norm), '') is null
     or char_length(btrim(p_name_norm)) > 120
     or btrim(p_name_norm) <> v_name_norm
     or p_status not in ('self_transport', 'bus', 'cannot_attend') then
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

  select count(*)::integer into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb));

  update public.rsvp
  set guest_name = btrim(p_guest_name),
      name_norm = v_name_norm,
      category = btrim(p_category),
      status = p_status,
      phone = case when p_status = 'bus' then btrim(p_phone) else null end,
      party_size = 1 + v_companion_count,
      data_check = false
  where id = v_rsvp.id;

  delete from public.companions where rsvp_id = v_rsvp.id;
  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_rsvp.id,
    btrim(entry.value ->> 'name'),
    p_status = 'bus',
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value);

  return v_rsvp.id;
end;
$$;

create function public.submit_wish(
  p_name text,
  p_message text,
  p_is_public boolean
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wish_id bigint;
begin
  if nullif(btrim(p_name), '') is null
     or char_length(btrim(p_name)) > 120
     or nullif(btrim(p_message), '') is null
     or char_length(btrim(p_message)) > 1000
     or p_is_public is null then
    raise exception 'Invalid wish input' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('wish-global-no-tracking', 0)
  );
  if (
    select count(*) from public.wishes w
    where w.created_at > now() - interval '15 minutes'
  ) >= 30 then
    raise exception 'Too many wishes; please try again later'
      using errcode = 'P0001';
  end if;

  insert into public.wishes (name, message, is_public)
  values (btrim(p_name), btrim(p_message), p_is_public)
  returning id into v_wish_id;

  return v_wish_id;
end;
$$;

create or replace function public.admin_set_rsvp_invalidated(
  p_rsvp_id bigint,
  p_invalidated boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_invalidated is null
     or (p_invalidated and nullif(btrim(p_reason), '') is null)
     or char_length(coalesce(btrim(p_reason), '')) > 500 then
    raise exception 'Invalid RSVP invalidation input' using errcode = '22023';
  end if;

  update public.rsvp
  set invalidated_at = case when p_invalidated then now() else null end,
      invalidated_by = case when p_invalidated then auth.uid() else null end,
      invalid_reason = case when p_invalidated then btrim(p_reason) else null end
  where id = p_rsvp_id;

  if not found then
    raise exception 'RSVP not found' using errcode = '22023';
  end if;
end;
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
      select count(*) from public.possible_duplicates
      where candidate_duplicate_status = 'pending'
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
            from public.companions c where c.rsvp_id = r.id
          ), '[]'::jsonb)
        ) order by r.created_at desc, r.id desc
      ) from public.rsvp_latest r
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(
        (to_jsonb(r) - 'edit_token_hash') || jsonb_build_object(
          'companions', coalesce((
            select jsonb_agg(to_jsonb(c) order by c.id)
            from public.companions c where c.rsvp_id = r.id
          ), '[]'::jsonb)
        ) order by r.created_at desc, r.id desc
      ) from public.rsvp r
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
            from public.companions c where c.rsvp_id = r.id
          ), '[]'::jsonb)
        ) order by r.guest_name, r.id
      ) from public.rsvp_latest r where r.status = 'bus'
    ), '[]'::jsonb),
    'busHistory', coalesce((
      select jsonb_agg(
        (to_jsonb(r) - 'edit_token_hash') || jsonb_build_object(
          'companions', coalesce((
            select jsonb_agg(to_jsonb(c) order by c.id)
            from public.companions c where c.rsvp_id = r.id
          ), '[]'::jsonb)
        ) order by r.created_at desc, r.id desc
      ) from public.rsvp r where r.status = 'bus'
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(g.name order by g.name) from public.rsvp_groups g
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on table public.rsvp_latest, public.possible_duplicates,
  public.bus_manifest, public.bus_seat_count
from anon, authenticated;
grant select on table public.rsvp_latest, public.possible_duplicates,
  public.bus_manifest, public.bus_seat_count
to authenticated;

revoke all on function public.submit_rsvp(
  text, text, text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.submit_rsvp(
  text, text, text, text, text, jsonb, text
) to anon, authenticated;

revoke all on function public.update_rsvp(
  bigint, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.update_rsvp(
  bigint, text, text, text, text, text, text, jsonb
) to anon, authenticated;

revoke all on function public.admin_set_rsvp_invalidated(
  bigint, boolean, text
) from public, anon, authenticated;
grant execute on function public.admin_set_rsvp_invalidated(
  bigint, boolean, text
) to authenticated;

revoke all on function public.submit_wish(
  text, text, boolean
) from public, anon, authenticated;
grant execute on function public.submit_wish(
  text, text, boolean
) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
