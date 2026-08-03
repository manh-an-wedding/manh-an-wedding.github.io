-- Run after migration 0009. All verification data is rolled back.

begin;

do $verify_schema$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'rsvp'
      and column_name = 'data_check'
      and data_type = 'boolean'
      and is_nullable = 'NO'
  ) then
    raise exception 'rsvp.data_check boolean column is missing';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.admin_update_rsvp(bigint,text,text,text,text,jsonb)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.admin_set_rsvp_data_check(bigint,boolean)',
    'execute'
  ) then
    raise exception 'admin update/check RPC privileges are incorrect';
  end if;

  if has_function_privilege(
    'anon',
    'public.admin_update_rsvp(bigint,text,text,text,text,jsonb)',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.admin_set_rsvp_data_check(bigint,boolean)',
    'execute'
  ) then
    raise exception 'anon can mutate admin RSVP data';
  end if;
end;
$verify_schema$;

do $verify_in_place_update$
declare
  v_admin uuid := '00000000-0000-4000-8000-000000000009'::uuid;
  v_rsvp_id bigint;
  v_result bigint;
  v_dashboard jsonb;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    v_admin, 'authenticated', 'authenticated',
    'verify-admin-0009@example.invalid', 'not-a-real-password',
    now(), now(), now()
  );
  insert into public.admin_users (user_id) values (v_admin);
  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  insert into public.rsvp (
    guest_name, name_norm, category, status, party_size, device_id, data_check
  ) values (
    'Raw Verify', 'raw verify', 'Tiến bước', 'self_transport', 1,
    'verify-in-place-device', true
  ) returning id into v_rsvp_id;

  v_result := public.admin_update_rsvp(
    v_rsvp_id,
    'Raw Verify Updated',
    'Tiến bước',
    'bus',
    '0900000009',
    '[{"name":"Người đi cùng","joinsBus":true,"relation":"Bạn"}]'::jsonb
  );

  if v_result <> v_rsvp_id
     or (select count(*) from public.rsvp where id = v_rsvp_id) <> 1
     or not exists (
       select 1 from public.rsvp
       where id = v_rsvp_id
         and guest_name = 'Raw Verify Updated'
         and name_norm = 'raw verify updated'
         and status = 'bus'
         and phone = '0900000009'
         and party_size = 2
         and data_check = false
     )
     or not exists (
       select 1 from public.companions
       where rsvp_id = v_rsvp_id
         and name = 'Người đi cùng'
         and joins_bus = true
         and relation = 'Bạn'
     ) then
    raise exception 'admin_update_rsvp did not update the same RSVP correctly';
  end if;

  perform public.admin_set_rsvp_data_check(v_rsvp_id, true);
  if (select data_check from public.rsvp where id = v_rsvp_id) is not true then
    raise exception 'admin_set_rsvp_data_check did not persist true';
  end if;

  v_dashboard := public.get_admin_rsvp_dashboard();
  if not exists (
    select 1
    from jsonb_array_elements(v_dashboard -> 'history') entry(value)
    where (entry.value ->> 'id')::bigint = v_rsvp_id
      and (entry.value ->> 'data_check')::boolean = true
  ) then
    raise exception 'admin dashboard omitted data_check';
  end if;
end;
$verify_in_place_update$;

rollback;
