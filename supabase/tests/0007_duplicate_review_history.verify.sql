-- Verify reviewed duplicate candidates remain available for audit and undo.

begin;

do $verify_review_history$
declare
  v_admin uuid := '00000000-0000-4000-8000-000000000007'::uuid;
  v_candidate bigint;
  v_target bigint;
begin
  insert into auth.users (
    id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    v_admin, 'authenticated', 'authenticated',
    'verify-admin-0007@example.invalid', 'not-a-real-password',
    now(), now(), now()
  );

  insert into public.rsvp (
    guest_name, name_norm, category, status, party_size, device_id
  ) values (
    'Verify Reviewed Duplicate', 'verify reviewed duplicate',
    'Tiến bước', 'self_transport', 1, 'review-target-device'
  ) returning id into v_target;

  insert into public.rsvp (
    guest_name, name_norm, category, status, party_size, device_id,
    duplicate_of_id, duplicate_status,
    duplicate_reviewed_at, duplicate_reviewed_by
  ) values (
    'Verify Reviewed Duplicate', 'verify reviewed duplicate',
    'IAS', 'self_transport', 1, 'review-candidate-device',
    v_target, 'rejected', now(), v_admin
  ) returning id into v_candidate;

  if not exists (
    select 1
    from public.possible_duplicates d
    where d.candidate_id = v_candidate
      and d.target_id = v_target
      and d.candidate_duplicate_status = 'rejected'
      and d.candidate_duplicate_reviewed_by = v_admin
  ) then
    raise exception 'reviewed duplicate is missing from admin review history';
  end if;
end;
$verify_review_history$;

rollback;
