-- Run after migration 0014. Privilege assertions do not mutate data.

begin;

do $verify_hidden_wishes_and_helpers$
begin
  if has_function_privilege(
       'anon', 'public.submit_wish(text,text,boolean)', 'execute'
     )
     or has_function_privilege(
       'authenticated', 'public.submit_wish(text,text,boolean)', 'execute'
     ) then
    raise exception 'hidden Wishes RPC remains publicly executable';
  end if;

  if has_table_privilege('anon', 'public.wishes_public', 'select')
     or has_table_privilege('authenticated', 'public.wishes_public', 'select')
     or has_column_privilege('anon', 'public.wishes', 'name', 'select')
     or has_column_privilege('anon', 'public.wishes', 'message', 'select') then
    raise exception 'hidden Wishes data remains publicly readable';
  end if;

  if pg_catalog.to_regprocedure('public.rls_auto_enable()') is not null
     and (
       has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')
       or has_function_privilege(
         'authenticated', 'public.rls_auto_enable()', 'execute'
       )
     ) then
    raise exception 'rls_auto_enable remains callable by application roles';
  end if;

  if not has_function_privilege(
       'anon',
       'public.submit_rsvp(text,text,text,text,text,jsonb,text)',
       'execute'
     )
     or not has_function_privilege(
       'authenticated',
       'public.update_rsvp(bigint,text,text,text,text,text,text,jsonb)',
       'execute'
     )
     or not has_function_privilege(
       'anon', 'public.get_public_group_rsvps(text,text)', 'execute'
     ) then
    raise exception 'required public RSVP RPC privilege was removed';
  end if;
end;
$verify_hidden_wishes_and_helpers$;

rollback;
