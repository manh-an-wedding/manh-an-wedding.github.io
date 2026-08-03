-- Run after migration 0012. All verification state is rolled back.

begin;

do $verify_public_group_tokens$
declare
  v_token text;
begin
  if pg_catalog.to_regprocedure(
       'public.get_public_group_rsvps(text)'
     ) is not null
     or pg_catalog.to_regprocedure(
       'public.get_public_group_rsvps(text,text)'
     ) is null then
    raise exception 'public group RPC signature was not protected';
  end if;

  if exists (
    select 1 from public.public_group_pages
    where access_token is null
       or access_token !~ '^[A-Za-z0-9_-]{16,128}$'
  ) then
    raise exception 'public group page has an invalid access token';
  end if;

  if (
    select count(*) from public.public_group_pages
  ) <> (
    select count(distinct access_token) from public.public_group_pages
  ) then
    raise exception 'public group access tokens are not unique';
  end if;

  begin
    perform * from public.get_public_group_rsvps('tien-buoc', null);
    raise exception 'public group RPC accepted a null token';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform * from public.get_public_group_rsvps(
      'tien-buoc', repeat('x', 36)
    );
    raise exception 'public group RPC accepted an incorrect token';
  exception when insufficient_privilege then
    null;
  end;

  select access_token into v_token
  from public.public_group_pages
  where slug = 'tien-buoc';
  perform * from public.get_public_group_rsvps('tien-buoc', v_token);
end;
$verify_public_group_tokens$;

rollback;
