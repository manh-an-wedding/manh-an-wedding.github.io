-- Run after migration 0005 in a disposable/local database.
-- Every mutation is rolled back.

begin;

do $verify_privileges$
begin
  if has_table_privilege('anon', 'public.rsvp', 'select')
     or has_table_privilege('anon', 'public.rsvp', 'insert')
     or has_table_privilege('anon', 'public.companions', 'insert')
     or has_table_privilege('anon', 'public.wishes', 'insert')
     or has_table_privilege('anon', 'public.page_visits', 'insert')
     or has_table_privilege('anon', 'public.rsvp_latest', 'select')
     or has_table_privilege('anon', 'public.possible_duplicates', 'select')
     or has_table_privilege('anon', 'public.bus_manifest', 'select')
     or has_table_privilege('anon', 'public.bus_seat_count', 'select')
     or has_table_privilege('anon', 'public.guests', 'select') then
    raise exception 'anon has an unsafe table/view privilege';
  end if;

  if has_table_privilege('authenticated', 'public.rsvp', 'select')
     or has_table_privilege('authenticated', 'public.rsvp', 'insert')
     or has_table_privilege('authenticated', 'public.wishes', 'insert')
     or has_table_privilege('authenticated', 'public.rsvp_latest', 'select') then
    raise exception 'authenticated has an unsafe RSVP privilege';
  end if;

  if not has_table_privilege('anon', 'public.wishes_public', 'select') then
    raise exception 'anon cannot read the safe wishes view';
  end if;

  if pg_catalog.to_regclass('public.guests_public') is not null then
    raise exception 'guests_public still exposes the guest list';
  end if;

  if not has_function_privilege(
    'anon',
    'public.submit_rsvp(text,text,text,text,text,jsonb,text)',
    'execute'
  ) or not has_function_privilege(
    'anon',
    'public.submit_wish(text,text,boolean,text)',
    'execute'
  ) then
    raise exception 'anon cannot call an intended public submission RPC';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.submit_rsvp(text,text,text,text,text,jsonb,text)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.submit_wish(text,text,boolean,text)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.log_page_visit(text,text)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.normalize_guest_name(text)',
    'execute'
  ) then
    raise exception 'a private RPC has excess execute privileges';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.log_page_visit(text,text)',
    'execute'
  ) then
    raise exception 'service_role cannot call log_page_visit';
  end if;
end;
$verify_privileges$;

do $verify_validation$
declare
  v_too_many_companions jsonb;
begin
  if public.normalize_guest_name('  Nguyễn   Đỗ  ') <> 'nguyen do' then
    raise exception 'server name normalization is not canonical';
  end if;

  begin
    perform public.submit_rsvp(
      'Nguyễn Đỗ', 'caller-controlled', 'IAS', 'self_transport',
      null, '[]'::jsonb, 'verify-invalid-norm'
    );
    raise exception 'submit_rsvp accepted a caller-controlled name_norm';
  exception
    when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_rsvp(
      'Test Unknown Group', 'test unknown group', 'Unknown',
      'self_transport', null, '[]'::jsonb, 'verify-invalid-group'
    );
    raise exception 'submit_rsvp accepted an unknown group';
  exception
    when sqlstate '22023' then null;
  end;

  select jsonb_agg(
    jsonb_build_object('name', 'Companion ' || number)
  )
  into v_too_many_companions
  from generate_series(1, 10) as series(number);

  begin
    perform public.submit_rsvp(
      'Test Too Many', 'test too many', 'IAS', 'self_transport',
      null, v_too_many_companions, 'verify-too-many'
    );
    raise exception 'submit_rsvp accepted more than nine companions';
  exception
    when sqlstate '22023' then null;
  end;

  begin
    perform public.submit_wish(
      'Private Test', 'Null privacy must fail', null, 'verify-null-privacy'
    );
    raise exception 'submit_wish accepted a null privacy choice';
  exception
    when sqlstate '22023' then null;
  end;

  update public.rsvp_settings
  set bus_deadline = now() - interval '1 minute'
  where singleton = true;

  begin
    perform public.submit_rsvp(
      'Test Closed Bus', 'test closed bus', 'IAS', 'bus',
      '0900000000', '[]'::jsonb, 'verify-closed-bus'
    );
    raise exception 'submit_rsvp accepted a bus request after the deadline';
  exception
    when sqlstate '22023' then null;
  end;

  update public.rsvp_settings
  set bus_deadline = timestamptz '2026-10-10 11:30:00+07:00'
  where singleton = true;
end;
$verify_validation$;

-- Same normalized name + same device + three different groups must remain
-- three guests (the production case that previously collapsed to two).
insert into public.rsvp (
  guest_name, name_norm, category, status, device_id
) values
  ('Test Same Name', 'test same name', 'IAS', 'self_transport', 'verify-device'),
  ('Test Same Name', 'test same name', 'Bạn của Tâm', 'self_transport', 'verify-device'),
  ('Test Same Name', 'test same name', 'Bạn cha Năm', 'self_transport', 'verify-device');

do $verify_identity$
begin
  if (
    select count(*)
    from public.rsvp_latest
    where name_norm = 'test same name'
      and device_id = 'verify-device'
  ) <> 3 then
    raise exception 'rsvp_latest collapsed guests from different groups';
  end if;

  if (
    select latest_response_count
    from public.possible_duplicates
    where name_norm = 'test same name'
  ) <> 3 then
    raise exception 'possible_duplicates did not flag all same-name guests';
  end if;
end;
$verify_identity$;

-- A same-group resubmission remains one latest response for that identity.
insert into public.rsvp (
  guest_name, name_norm, category, status, device_id
) values (
  'Test Same Name', 'test same name', 'IAS', 'cannot_attend', 'verify-device'
);

do $verify_resubmission$
begin
  if (
    select count(*)
    from public.rsvp_latest
    where name_norm = 'test same name'
      and device_id = 'verify-device'
  ) <> 3 then
    raise exception 'same-group resubmission created a second latest identity';
  end if;
end;
$verify_resubmission$;

select public.submit_wish(
  'Private Verify',
  'This row must not appear in wishes_public',
  false,
  'verify-private-wish'
);

do $verify_private_wish$
begin
  if exists (
    select 1
    from public.wishes_public
    where name = 'Private Verify'
      and message = 'This row must not appear in wishes_public'
  ) then
    raise exception 'a private wish is visible through wishes_public';
  end if;
end;
$verify_private_wish$;

set local role service_role;

do $verify_visit_rpc_contract$
declare
  v_first_inserted boolean;
  v_second_inserted boolean;
begin
  v_first_inserted := public.log_page_visit(
    'verify-visit-device-0005',
    '192.0.2.55'
  );
  v_second_inserted := public.log_page_visit(
    'verify-visit-device-0005',
    '192.0.2.55'
  );

  if v_first_inserted is not true or v_second_inserted is not false then
    raise exception 'log_page_visit insert/deduplication contract failed';
  end if;
end;
$verify_visit_rpc_contract$;

reset role;

do $verify_visit_row$
begin
  if (
    select count(*)
    from public.page_visits
    where device_id = 'verify-visit-device-0005'
      and ip = '192.0.2.55'
  ) <> 1 then
    raise exception 'log_page_visit did not retain exactly one visit';
  end if;
end;
$verify_visit_row$;

rollback;
