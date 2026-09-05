-- Bus RSVP updates:
--   A) add the "Bạn của Mạnh" group and move the bus-registration deadline
--      to 13.10 (submit_rsvp validates the group and enforces the deadline).
--   B) capture two more per-booking bus choices from the guest RSVP form:
--   1) bus_pickup: which outbound pickup point the party boards at
--      ('hotel' = Ibis, 'park' = Bình Phú). Positional, not name-specific, so
--      the displayed address/label can change without touching data.
--   2) bus_return: whether the party rides the shuttle back to HCMC.
-- Both are only meaningful for status = 'bus'; null otherwise. The submit/update
-- signatures gain two defaulted params, so the old signatures are dropped first
-- (added params make a new overload rather than replacing the old function).
begin;

-- Sync the RSVP config: add the "Bạn của Mạnh" group and move the
-- server-enforced bus-registration deadline to 13.10.
insert into public.rsvp_groups (name)
values ('Bạn của Mạnh')
on conflict (name) do nothing;

update public.rsvp_settings
set bus_deadline = timestamptz '2026-10-13 11:30:00+07:00'
where singleton;

alter table public.rsvp
  add column if not exists bus_pickup text,
  add column if not exists bus_return boolean;

alter table public.rsvp
  drop constraint if exists rsvp_bus_pickup_check;
alter table public.rsvp
  add constraint rsvp_bus_pickup_check
  check (bus_pickup is null or bus_pickup in ('hotel', 'park'));

-- rsvp_latest lists columns explicitly, so the new fields must be appended for
-- the admin "current"/"busCurrent" views to expose them (history reads the table
-- directly and already includes them).
create or replace view public.rsvp_latest
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
  r.data_check,
  r.bus_pickup,
  r.bus_return
from public.rsvp r
where r.superseded_by_id is null
  and r.invalidated_at is null
  and (r.duplicate_status is null or r.duplicate_status = 'rejected');

drop function if exists public.submit_rsvp(
  text, text, text, text, text, jsonb, text
);

create or replace function public.submit_rsvp(
  p_guest_name text,
  p_name_norm text,
  p_category text,
  p_status text,
  p_phone text,
  p_companions jsonb,
  p_edit_token text,
  p_bus_pickup text default 'hotel',
  p_bus_return boolean default true
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
  v_bus_pickup text;
  v_bus_return boolean;
begin
  v_name_norm := public.normalize_guest_name(p_guest_name);
  if nullif(btrim(p_guest_name), '') is null
     or char_length(btrim(p_guest_name)) > 120
     or nullif(btrim(p_name_norm), '') is null
     or char_length(btrim(p_name_norm)) > 120
     or btrim(p_name_norm) <> v_name_norm
     or p_edit_token is null
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

  if p_status = 'bus'
     and coalesce(nullif(btrim(p_bus_pickup), ''), 'hotel') not in ('hotel', 'park') then
    raise exception 'Invalid bus pickup point' using errcode = '22023';
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

  perform private.consume_rsvp_ip_quota();

  -- Quota is isolated per IP, while RSVP revision/duplicate state is shared.
  -- Serialize the shared state so simultaneous submissions from different IPs
  -- cannot both remain current for the same normalized name and group.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rsvp-global-no-tracking', 0)
  );

  select count(*)::integer into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb));

  v_bus_pickup := case when p_status = 'bus'
    then coalesce(nullif(btrim(p_bus_pickup), ''), 'hotel') else null end;
  v_bus_return := case when p_status = 'bus'
    then coalesce(p_bus_return, true) else null end;

  insert into public.rsvp (
    guest_name, name_norm, category, status, phone, party_size,
    bus_pickup, bus_return, edit_token_hash
  ) values (
    btrim(p_guest_name), v_name_norm, btrim(p_category), p_status,
    case when p_status = 'bus' then btrim(p_phone) else null end,
    1 + v_companion_count,
    v_bus_pickup, v_bus_return,
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

revoke all on function public.submit_rsvp(
  text, text, text, text, text, jsonb, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.submit_rsvp(
  text, text, text, text, text, jsonb, text, text, boolean
) to anon, authenticated;

drop function if exists public.update_rsvp(
  bigint, text, text, text, text, text, text, jsonb
);

create or replace function public.update_rsvp(
  p_rsvp_id bigint,
  p_edit_token text,
  p_guest_name text,
  p_name_norm text,
  p_category text,
  p_status text,
  p_phone text,
  p_companions jsonb,
  p_bus_pickup text default 'hotel',
  p_bus_return boolean default true
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
  v_new_phone text;
  v_bus_pickup text;
  v_bus_return boolean;
  v_bus_deadline timestamptz;
  v_identity_changed boolean;
  v_phone_changed boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rsvp-global-no-tracking', 0)
  );

  select * into v_rsvp
  from public.rsvp
  where id = p_rsvp_id
  for update;

  if v_rsvp.id is null
     or v_rsvp.edit_token_hash is null
     or p_edit_token is null
     or p_edit_token !~ '^[0-9a-f]{64}$'
     or v_rsvp.edit_token_hash is distinct from
        extensions.digest(p_edit_token, 'sha256')
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
     or nullif(btrim(p_category), '') is null
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

  if p_status = 'bus'
     and coalesce(nullif(btrim(p_bus_pickup), ''), 'hotel') not in ('hotel', 'park') then
    raise exception 'Invalid bus pickup point' using errcode = '22023';
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

  v_new_phone := case when p_status = 'bus' then btrim(p_phone) else null end;
  v_bus_pickup := case when p_status = 'bus'
    then coalesce(nullif(btrim(p_bus_pickup), ''), 'hotel') else null end;
  v_bus_return := case when p_status = 'bus'
    then coalesce(p_bus_return, true) else null end;
  v_identity_changed := v_rsvp.name_norm is distinct from v_name_norm
    or v_rsvp.category is distinct from btrim(p_category);
  v_phone_changed := v_rsvp.phone is distinct from v_new_phone;

  if v_identity_changed then
    insert into public.rsvp_duplicate_review_history (
      candidate_id, target_id, status, reviewed_at, reviewed_by,
      cleared_at, cleared_by, cleared_reason
    )
    select
      candidate.id, candidate.duplicate_of_id, candidate.duplicate_status,
      coalesce(candidate.duplicate_reviewed_at, now()),
      candidate.duplicate_reviewed_by,
      now(), auth.uid(), case
        when candidate.id = v_rsvp.id then 'guest_identity_changed'
        else 'guest_target_identity_changed'
      end
    from public.rsvp candidate
    where (candidate.id = v_rsvp.id
           or candidate.duplicate_of_id = v_rsvp.id)
      and candidate.duplicate_of_id is not null
      and candidate.duplicate_status in ('confirmed', 'rejected');

    update public.rsvp candidate
    set duplicate_of_id = null,
        duplicate_status = null,
        duplicate_reviewed_at = null,
        duplicate_reviewed_by = null
    where candidate.id = v_rsvp.id
       or candidate.duplicate_of_id = v_rsvp.id;
  end if;

  update public.rsvp
  set guest_name = btrim(p_guest_name),
      name_norm = v_name_norm,
      category = btrim(p_category),
      status = p_status,
      phone = v_new_phone,
      bus_pickup = v_bus_pickup,
      bus_return = v_bus_return,
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

  if v_identity_changed then
    insert into public.rsvp_duplicate_review_history (
      candidate_id, target_id, status, reviewed_at, reviewed_by,
      cleared_at, cleared_by, cleared_reason
    )
    select
      active.id, active.duplicate_of_id, active.duplicate_status,
      coalesce(active.duplicate_reviewed_at, now()),
      active.duplicate_reviewed_by,
      now(), auth.uid(), 'guest_identity_merge'
    from public.rsvp active
    where active.id <> v_rsvp.id
      and active.name_norm = v_name_norm
      and active.category = btrim(p_category)
      and active.superseded_by_id is null
      and active.invalidated_at is null
      and active.duplicate_status = 'rejected'
      and active.duplicate_of_id is not null;

    update public.rsvp active
    set superseded_by_id = v_rsvp.id,
        duplicate_of_id = null,
        duplicate_status = null,
        duplicate_reviewed_at = null,
        duplicate_reviewed_by = null
    where active.id <> v_rsvp.id
      and active.name_norm = v_name_norm
      and active.category = btrim(p_category)
      and active.superseded_by_id is null
      and active.invalidated_at is null
      and active.duplicate_status is distinct from 'confirmed';
  end if;

  if v_identity_changed or v_phone_changed then
    perform public.refresh_rsvp_duplicate_candidates(v_rsvp.id);
  end if;

  return v_rsvp.id;
end;
$$;

revoke all on function public.update_rsvp(
  bigint, text, text, text, text, text, text, jsonb, text, boolean
) from public, anon, authenticated;
grant execute on function public.update_rsvp(
  bigint, text, text, text, text, text, text, jsonb, text, boolean
) to anon, authenticated;

drop function if exists public.admin_update_rsvp(
  bigint, text, text, text, text, jsonb
);

create or replace function public.admin_update_rsvp(
  p_source_id bigint,
  p_guest_name text,
  p_category text,
  p_status text,
  p_phone text,
  p_companions jsonb,
  p_bus_pickup text default 'hotel',
  p_bus_return boolean default true
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.rsvp%rowtype;
  v_name_norm text;
  v_new_phone text;
  v_bus_pickup text;
  v_bus_return boolean;
  v_companion_count integer;
  v_identity_changed boolean;
  v_phone_changed boolean;
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rsvp-global-no-tracking', 0)
  );

  select * into v_source
  from public.rsvp
  where id = p_source_id
  for update;

  if v_source.id is null
     or v_source.superseded_by_id is not null
     or v_source.invalidated_at is not null
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

  if p_status = 'bus'
     and coalesce(nullif(btrim(p_bus_pickup), ''), 'hotel') not in ('hotel', 'park') then
    raise exception 'Invalid bus pickup point' using errcode = '22023';
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

  v_new_phone := case when p_status = 'bus' then btrim(p_phone) else null end;
  v_bus_pickup := case when p_status = 'bus'
    then coalesce(nullif(btrim(p_bus_pickup), ''), 'hotel') else null end;
  v_bus_return := case when p_status = 'bus'
    then coalesce(p_bus_return, true) else null end;
  v_identity_changed := v_source.name_norm is distinct from v_name_norm
    or v_source.category is distinct from btrim(p_category);
  v_phone_changed := v_source.phone is distinct from v_new_phone;

  if v_identity_changed then
    insert into public.rsvp_duplicate_review_history (
      candidate_id, target_id, status, reviewed_at, reviewed_by,
      cleared_at, cleared_by, cleared_reason
    )
    select
      candidate.id, candidate.duplicate_of_id, candidate.duplicate_status,
      coalesce(candidate.duplicate_reviewed_at, now()),
      candidate.duplicate_reviewed_by,
      now(), auth.uid(), case
        when candidate.id = v_source.id then 'admin_identity_changed'
        else 'admin_target_identity_changed'
      end
    from public.rsvp candidate
    where (candidate.id = v_source.id
           or candidate.duplicate_of_id = v_source.id)
      and candidate.duplicate_of_id is not null
      and candidate.duplicate_status in ('confirmed', 'rejected');

    update public.rsvp candidate
    set duplicate_of_id = null,
        duplicate_status = null,
        duplicate_reviewed_at = null,
        duplicate_reviewed_by = null
    where candidate.id = v_source.id
       or candidate.duplicate_of_id = v_source.id;
  end if;

  update public.rsvp
  set guest_name = btrim(p_guest_name),
      name_norm = v_name_norm,
      category = btrim(p_category),
      status = p_status,
      phone = v_new_phone,
      bus_pickup = v_bus_pickup,
      bus_return = v_bus_return,
      party_size = 1 + v_companion_count,
      data_check = false
  where id = v_source.id;

  delete from public.companions where rsvp_id = v_source.id;
  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_source.id,
    btrim(entry.value ->> 'name'),
    p_status = 'bus',
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value);

  if v_identity_changed then
    insert into public.rsvp_duplicate_review_history (
      candidate_id, target_id, status, reviewed_at, reviewed_by,
      cleared_at, cleared_by, cleared_reason
    )
    select
      active.id, active.duplicate_of_id, active.duplicate_status,
      coalesce(active.duplicate_reviewed_at, now()),
      active.duplicate_reviewed_by,
      now(), auth.uid(), 'admin_identity_merge'
    from public.rsvp active
    where active.id <> v_source.id
      and active.name_norm = v_name_norm
      and active.category = btrim(p_category)
      and active.superseded_by_id is null
      and active.invalidated_at is null
      and active.duplicate_status = 'rejected'
      and active.duplicate_of_id is not null;

    update public.rsvp active
    set superseded_by_id = v_source.id,
        duplicate_of_id = null,
        duplicate_status = null,
        duplicate_reviewed_at = null,
        duplicate_reviewed_by = null
    where active.id <> v_source.id
      and active.name_norm = v_name_norm
      and active.category = btrim(p_category)
      and active.superseded_by_id is null
      and active.invalidated_at is null
      and active.duplicate_status is distinct from 'confirmed';
  end if;

  if v_identity_changed or v_phone_changed then
    perform public.refresh_rsvp_duplicate_candidates(v_source.id);
  end if;

  return v_source.id;
end;
$$;

revoke all on function public.admin_update_rsvp(
  bigint, text, text, text, text, jsonb, text, boolean
) from public, anon, authenticated;
grant execute on function public.admin_update_rsvp(
  bigint, text, text, text, text, jsonb, text, boolean
) to authenticated;

-- Expose the per-booking bus choices on the public group list too.
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
