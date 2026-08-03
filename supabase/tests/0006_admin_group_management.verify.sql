-- Run after migration 0006 in a disposable/local database or the SQL editor.
-- All verification data is rolled back.

begin;

do $verify_schema$
begin
  if pg_catalog.to_regclass('public.admin_users') is null
     or pg_catalog.to_regclass('public.public_group_pages') is null then
    raise exception 'admin/public group tables are missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rsvp'
      and column_name = 'superseded_by_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rsvp'
      and column_name = 'duplicate_of_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rsvp'
      and column_name = 'duplicate_status'
  ) then
    raise exception 'RSVP revision/duplicate columns are missing';
  end if;

  if not has_function_privilege(
    'anon', 'public.get_public_group_rsvps(text)', 'execute'
  ) then
    raise exception 'anon cannot call the safe public group RPC';
  end if;

  if has_table_privilege('anon', 'public.rsvp', 'select')
     or has_table_privilege('anon', 'public.companions', 'select')
     or has_table_privilege('anon', 'public.public_group_pages', 'select') then
    raise exception 'anon can read a private table directly';
  end if;

  if has_function_privilege(
    'anon', 'public.get_admin_rsvp_dashboard()', 'execute'
  ) or not has_function_privilege(
    'authenticated', 'public.get_admin_rsvp_dashboard()', 'execute'
  ) then
    raise exception 'admin dashboard RPC privileges are incorrect';
  end if;
end;
$verify_schema$;

do $verify_revision_and_duplicate_detection$
declare
  v_first bigint;
  v_latest bigint;
  v_other_device bigint;
  v_other_group bigint;
  v_unrelated_group bigint;
begin
  v_first := public.submit_rsvp(
    'Verify Revision', 'verify revision', 'Tiến bước', 'self_transport',
    null, '[]'::jsonb, 'verify-revision-device'
  );
  v_latest := public.submit_rsvp(
    'Verify Revision', 'verify revision', 'Tiến bước', 'cannot_attend',
    null, '[]'::jsonb, 'verify-revision-device'
  );

  if (
    select superseded_by_id from public.rsvp where id = v_first
  ) is distinct from v_latest then
    raise exception 'same identity was not linked to its next revision';
  end if;

  if (
    select count(*) from public.rsvp_latest
    where name_norm = 'verify revision'
  ) <> 1 then
    raise exception 'rsvp_latest did not collapse a revision chain';
  end if;

  v_other_device := public.submit_rsvp(
    'Verify Revision', 'verify revision', 'Tiến bước', 'self_transport',
    null, '[]'::jsonb, 'verify-other-device'
  );

  if not exists (
    select 1 from public.rsvp
    where id = v_latest
      and duplicate_of_id = v_other_device
      and duplicate_status = 'pending'
  ) then
    raise exception 'same name/group on another device was not flagged';
  end if;

  v_other_group := public.submit_rsvp(
    'Verify Cross Group', 'verify cross group', 'IAS', 'self_transport',
    null, '[]'::jsonb, 'verify-cross-device'
  );
  v_latest := public.submit_rsvp(
    'Verify Cross Group', 'verify cross group', 'Tiến bước', 'self_transport',
    null, '[]'::jsonb, 'verify-cross-device'
  );

  if not exists (
    select 1 from public.rsvp
    where id = v_other_group
      and duplicate_of_id = v_latest
      and duplicate_status = 'pending'
  ) then
    raise exception 'same name/device across groups was not flagged';
  end if;

  v_unrelated_group := public.submit_rsvp(
    'Verify Separate Guests', 'verify separate guests', 'IAS', 'self_transport',
    null, '[]'::jsonb, 'verify-separate-device-a'
  );
  perform public.submit_rsvp(
    'Verify Separate Guests', 'verify separate guests', 'Tiến bước', 'self_transport',
    null, '[]'::jsonb, 'verify-separate-device-b'
  );

  if exists (
    select 1 from public.rsvp
    where id = v_unrelated_group
      and duplicate_status is not null
  ) then
    raise exception 'different group/device guests without phone were flagged';
  end if;
end;
$verify_revision_and_duplicate_detection$;

create temporary table verify_public_rsvp (id bigint) on commit drop;
with inserted as (
  insert into public.rsvp (
    guest_name, name_norm, category, status, party_size, device_id
  ) values (
    'Public Tiến Bước', 'public tien buoc', 'Tiến bước',
    'self_transport', 2, 'verify-public-group'
  )
  returning id
)
insert into verify_public_rsvp (id)
select id from inserted;

insert into public.companions (rsvp_id, name, joins_bus)
select id, 'Người đi cùng công khai', false
from verify_public_rsvp;

insert into public.rsvp (
  guest_name, name_norm, category, status, party_size, device_id
) values (
  'Private IAS', 'private ias', 'IAS',
  'self_transport', 1, 'verify-private-group'
);

do $verify_public_group_rpc$
begin
  if (
    select count(*) from public.get_public_group_rsvps('tien-buoc')
    where guest_name = 'Public Tiến Bước'
      and companions = array['Người đi cùng công khai']::text[]
  ) <> 1 then
    raise exception 'public Tiến bước RPC omitted safe RSVP data';
  end if;

  if exists (
    select 1 from public.get_public_group_rsvps('ias')
  ) then
    raise exception 'an unpublished group was exposed';
  end if;
end;
$verify_public_group_rpc$;

do $verify_admin_review$
declare
  v_admin uuid := '00000000-0000-4000-8000-000000000006'::uuid;
  v_candidate bigint;
  v_target bigint;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    v_admin, 'authenticated', 'authenticated',
    'verify-admin-0006@example.invalid', 'not-a-real-password',
    now(), now(), now()
  );
  insert into public.admin_users (user_id) values (v_admin);
  perform set_config('request.jwt.claim.sub', v_admin::text, true);

  if not (
    public.get_admin_rsvp_dashboard()
      ?& array['summary', 'current', 'history', 'duplicates',
               'busCurrent', 'busHistory', 'groups']
  ) then
    raise exception 'admin dashboard payload is incomplete';
  end if;

  select id, duplicate_of_id
  into v_candidate, v_target
  from public.rsvp
  where name_norm = 'verify revision'
    and duplicate_status = 'pending'
  order by created_at desc, id desc
  limit 1;

  perform public.admin_review_rsvp_duplicate(
    v_candidate, v_target, 'confirmed'
  );

  if exists (
    select 1 from public.rsvp_latest where id = v_candidate
  ) or not exists (
    select 1 from public.rsvp where id = v_candidate
      and duplicate_status = 'confirmed'
      and duplicate_reviewed_by = v_admin
      and duplicate_reviewed_at is not null
  ) then
    raise exception 'confirmed duplicate was not reviewed/excluded correctly';
  end if;

  perform public.admin_review_rsvp_duplicate(
    v_candidate, v_target, 'rejected'
  );
  if not exists (
    select 1 from public.rsvp_latest where id = v_candidate
  ) then
    raise exception 'rejected duplicate was not restored to rsvp_latest';
  end if;
end;
$verify_admin_review$;

rollback;
