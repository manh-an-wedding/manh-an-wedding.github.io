-- Run after migration 0011. All verification data is rolled back.

begin;

do $verify_rsvp_security_and_integrity$
declare
  v_admin uuid := '00000000-0000-4000-8000-000000000011'::uuid;
  v_original bigint;
  v_replacement bigint;
  v_phone_candidate bigint;
  v_phone_target bigint;
  v_name_candidate bigint;
  v_name_target bigint;
  v_name_latest bigint;
  v_admin_match bigint;
  v_admin_edit bigint;
  v_chain_first bigint;
  v_chain_middle bigint;
  v_chain_latest bigint;
  v_token text := repeat('a', 64);
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    v_admin, 'authenticated', 'authenticated',
    'verify-admin-0011@example.invalid', 'not-a-real-password',
    now(), now(), now()
  );
  insert into public.admin_users (user_id) values (v_admin);
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  update public.rsvp_settings
  set bus_deadline = now() + interval '1 day'
  where singleton = true;

  v_original := public.submit_rsvp(
    'Verify Revision', 'verify revision', 'IAS',
    'self_transport', null, '[]'::jsonb, repeat('b', 64)
  );
  v_replacement := public.submit_rsvp(
    'Verify Revision', 'verify revision', 'IAS',
    'bus', '0900000001', '[]'::jsonb, v_token
  );

  begin
    perform public.update_rsvp(
      v_replacement, null,
      'Verify Revision', 'verify revision', 'IAS',
      'cannot_attend', null, '[]'::jsonb
    );
    raise exception 'update_rsvp accepted a null edit token';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.update_rsvp(
      v_replacement, v_token,
      'Changed Identity', 'changed identity', 'IAS',
      'self_transport', null, '[]'::jsonb
    );
    raise exception 'update_rsvp allowed the guest identity to change';
  exception when invalid_parameter_value then
    null;
  end;

  perform public.update_rsvp(
    v_replacement, v_token,
    'Verify Revision', 'verify revision', 'IAS',
    'self_transport', null, '[{"name":"Companion"}]'::jsonb
  );
  if not exists (
    select 1 from public.rsvp
    where id = v_replacement and party_size = 2 and status = 'self_transport'
  ) then
    raise exception 'authorized in-place edit failed';
  end if;

  v_phone_candidate := public.submit_rsvp(
    'Phone Candidate', 'phone candidate', 'Bạn của Tâm',
    'bus', '0900000999', '[]'::jsonb, repeat('c', 64)
  );
  v_phone_target := public.submit_rsvp(
    'Phone Target', 'phone target', 'IAS',
    'bus', '0900000999', '[]'::jsonb, repeat('d', 64)
  );

  perform public.admin_review_rsvp_duplicate(
    v_phone_candidate, v_phone_target, 'rejected'
  );
  if not exists (
    select 1 from public.rsvp
    where id = v_phone_candidate and duplicate_status = 'rejected'
  ) then
    raise exception 'admin could not review a shared-phone duplicate';
  end if;

  perform public.update_rsvp(
    v_phone_candidate, repeat('c', 64),
    'Phone Candidate', 'phone candidate', 'Bạn của Tâm',
    'bus', '0900000888', '[]'::jsonb
  );
  if not exists (
    select 1 from public.rsvp_latest where id = v_phone_candidate
  ) or exists (
    select 1 from public.rsvp
    where id = v_phone_candidate and duplicate_status is not null
  ) then
    raise exception 'changing a phone left stale duplicate metadata';
  end if;
  if not exists (
    select 1 from public.rsvp_duplicate_review_history
    where candidate_id = v_phone_candidate
      and target_id = v_phone_target
      and status = 'rejected'
      and cleared_reason = 'phone_changed'
  ) then
    raise exception 'clearing a reviewed phone duplicate lost its audit history';
  end if;

  v_name_candidate := public.submit_rsvp(
    'Verify Same Name', 'verify same name', 'Bạn của Tâm',
    'self_transport', null, '[]'::jsonb, repeat('2', 64)
  );
  v_name_target := public.submit_rsvp(
    'Verify Same Name', 'verify same name', 'IAS',
    'self_transport', null, '[]'::jsonb, repeat('3', 64)
  );
  perform public.admin_review_rsvp_duplicate(
    v_name_candidate, v_name_target, 'rejected'
  );
  v_name_latest := public.submit_rsvp(
    'Verify Same Name', 'verify same name', 'Tiến bước',
    'self_transport', null, '[]'::jsonb, repeat('4', 64)
  );
  if not exists (
    select 1 from public.rsvp
    where id = v_name_candidate
      and duplicate_of_id = v_name_latest
      and duplicate_status = 'pending'
  ) then
    raise exception 'a new matching RSVP did not create a fresh duplicate review';
  end if;
  if not exists (
    select 1 from public.rsvp_duplicate_review_history
    where candidate_id = v_name_candidate
      and target_id = v_name_target
      and status = 'rejected'
      and cleared_reason = 'new_candidate'
  ) then
    raise exception 'repointing a reviewed duplicate lost its audit history';
  end if;

  v_admin_match := public.submit_rsvp(
    'Admin Identity', 'admin identity', 'IAS',
    'self_transport', null, '[]'::jsonb, repeat('5', 64)
  );
  v_admin_edit := public.submit_rsvp(
    'Admin Before Edit', 'admin before edit', 'Bạn của Tâm',
    'self_transport', null, '[]'::jsonb, repeat('6', 64)
  );
  perform public.admin_update_rsvp(
    v_admin_edit, 'Admin Identity', 'IAS',
    'self_transport', null, '[]'::jsonb
  );
  if not exists (
    select 1 from public.rsvp where id = v_admin_match
      and superseded_by_id = v_admin_edit
  ) or (select count(*) from public.rsvp_latest
        where name_norm = 'admin identity' and category = 'IAS') <> 1 then
    raise exception 'admin identity edit left multiple current RSVP rows';
  end if;

  perform public.admin_set_rsvp_invalidated(
    v_admin_edit, true, 'verification invalidated edit'
  );
  begin
    perform public.admin_update_rsvp(
      v_admin_edit, 'Admin Identity', 'IAS',
      'cannot_attend', null, '[]'::jsonb
    );
    raise exception 'admin_update_rsvp edited an invalidated RSVP';
  exception when invalid_parameter_value then
    null;
  end;

  v_chain_first := public.submit_rsvp(
    'Phone First', 'phone first', 'IAS',
    'bus', '0900000777', '[]'::jsonb, repeat('1', 64)
  );
  v_chain_middle := public.submit_rsvp(
    'Phone Middle', 'phone middle', 'Tiến bước',
    'bus', '0900000777', '[]'::jsonb, repeat('e', 64)
  );
  v_chain_latest := public.submit_rsvp(
    'Phone Latest', 'phone latest', 'Bạn của Tâm',
    'bus', '0900000777', '[]'::jsonb, repeat('f', 64)
  );
  perform public.admin_set_rsvp_invalidated(
    v_chain_latest, true, 'verification chain'
  );
  if not exists (
    select 1 from public.rsvp_latest where id = v_chain_middle
  ) or not exists (
    select 1 from public.rsvp
    where id = v_chain_first
      and duplicate_of_id = v_chain_middle
      and duplicate_status = 'pending'
  ) then
    raise exception 'invalidating a duplicate target did not promote the next usable row';
  end if;

  perform public.admin_set_rsvp_invalidated(
    v_replacement, true, 'verification'
  );
  if not exists (
    select 1 from public.rsvp_latest where id = v_original
  ) then
    raise exception 'invalidating the latest RSVP did not reactivate its predecessor';
  end if;

  perform public.admin_set_rsvp_invalidated(v_replacement, false, null);
  if not exists (
    select 1 from public.rsvp_latest where id = v_replacement
  ) or exists (
    select 1 from public.rsvp_latest where id = v_original
  ) then
    raise exception 'restoring the latest RSVP did not restore the revision chain';
  end if;
end;
$verify_rsvp_security_and_integrity$;

rollback;
