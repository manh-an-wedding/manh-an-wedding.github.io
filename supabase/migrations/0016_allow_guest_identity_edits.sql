-- Let a guest with the in-memory edit token update the name and group on the
-- same RSVP row. Rebuild revision and duplicate state when identity changes.

begin;

create or replace function public.update_rsvp(
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
  v_new_phone text;
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
  bigint, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.update_rsvp(
  bigint, text, text, text, text, text, text, jsonb
) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
