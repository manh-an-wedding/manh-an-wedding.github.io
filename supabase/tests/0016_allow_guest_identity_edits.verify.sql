-- Run after migration 0016. All verification data is rolled back.

begin;

do $verify_guest_identity_edits$
declare
  v_edit_id bigint;
  v_existing_id bigint;
  v_result_id bigint;
  v_token text := repeat('a', 64);
begin
  update public.rsvp_settings
  set bus_deadline = now() + interval '1 day'
  where singleton = true;

  v_edit_id := public.submit_rsvp(
    'Before Guest Edit', 'before guest edit', 'IAS',
    'self_transport', null, '[]'::jsonb, v_token
  );
  v_existing_id := public.submit_rsvp(
    'After Guest Edit', 'after guest edit', 'Tiến bước',
    'self_transport', null, '[]'::jsonb, repeat('b', 64)
  );

  v_result_id := public.update_rsvp(
    v_edit_id, v_token,
    'After Guest Edit', 'after guest edit', 'Tiến bước',
    'bus', '0900000016', '[{"name":"Guest Companion"}]'::jsonb
  );

  if v_result_id <> v_edit_id then
    raise exception 'guest identity edit created or returned a different RSVP';
  end if;

  if not exists (
    select 1
    from public.rsvp
    where id = v_edit_id
      and guest_name = 'After Guest Edit'
      and name_norm = 'after guest edit'
      and category = 'Tiến bước'
      and status = 'bus'
      and phone = '0900000016'
      and party_size = 2
  ) then
    raise exception 'guest identity fields were not updated in place';
  end if;

  if not exists (
    select 1
    from public.rsvp
    where id = v_existing_id
      and superseded_by_id = v_edit_id
  ) or (
    select count(*)
    from public.rsvp_latest
    where name_norm = 'after guest edit'
      and category = 'Tiến bước'
  ) <> 1 then
    raise exception 'guest identity edit left multiple current RSVP rows';
  end if;

  if (
    select count(*)
    from public.companions
    where rsvp_id = v_edit_id
      and name = 'Guest Companion'
      and joins_bus = true
  ) <> 1 then
    raise exception 'guest identity edit did not replace companions in place';
  end if;
end;
$verify_guest_identity_edits$;

rollback;
