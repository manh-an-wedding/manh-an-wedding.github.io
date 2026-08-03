begin;

do $$
begin
  if pg_catalog.to_regprocedure(
    'public.admin_create_rsvp_revision(bigint,text,text,text,text,jsonb)'
  ) is not null then
    raise exception 'obsolete admin_create_rsvp_revision RPC still exists';
  end if;

  if pg_catalog.to_regprocedure(
    'public.admin_update_rsvp(bigint,text,text,text,text,jsonb)'
  ) is null then
    raise exception 'active admin_update_rsvp RPC is missing';
  end if;
end;
$$;

rollback;
