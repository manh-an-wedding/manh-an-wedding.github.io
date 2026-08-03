-- Verify both signed-out guests and signed-in admins can use the validated
-- RSVP RPC without gaining direct write access to RSVP tables.

begin;

do $verify_authenticated_rsvp_submission$
begin
  if not has_function_privilege(
    'anon',
    'public.submit_rsvp(text,text,text,text,text,jsonb,text)',
    'execute'
  ) then
    raise exception 'anon cannot call submit_rsvp';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.submit_rsvp(text,text,text,text,text,jsonb,text)',
    'execute'
  ) then
    raise exception 'authenticated cannot call submit_rsvp';
  end if;

  if has_table_privilege('authenticated', 'public.rsvp', 'insert')
     or has_table_privilege('authenticated', 'public.companions', 'insert') then
    raise exception 'authenticated gained unsafe direct RSVP table writes';
  end if;
end;
$verify_authenticated_rsvp_submission$;

rollback;
