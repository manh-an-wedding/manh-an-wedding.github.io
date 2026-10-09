-- Admin edit: keep the stored phone when switching a booking away from 'bus'
-- (e.g. bus -> cannot_attend / self_transport), instead of nulling it. Only
-- the admin path preserves it; the guest-facing update still clears it.

begin;

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

  v_new_phone := case when p_status = 'bus' then btrim(p_phone) else v_source.phone end;
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

notify pgrst, 'reload schema';

commit;
