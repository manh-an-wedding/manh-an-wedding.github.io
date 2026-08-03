-- Run after migration 0013. All verification data is rolled back.

begin;

do $verify_rsvp_ip_rate_limit$
declare
  v_attempt integer;
  v_rate_limited boolean := false;
  v_name text;
begin
  update public.rsvp_settings
  set bus_deadline = now() + interval '1 day'
  where singleton = true;

  if to_regclass('private.rsvp_rate_limit_events') is null then
    raise exception 'private RSVP rate-limit table is missing';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'private'
      and table_name = 'rsvp_rate_limit_events'
      and column_name in ('ip', 'ip_address', 'client_ip')
  ) then
    raise exception 'RSVP rate-limit table stores a raw IP column';
  end if;

  if position(
    'rsvp-global-no-tracking' in pg_catalog.pg_get_functiondef(
      'public.submit_rsvp(text,text,text,text,text,jsonb,text)'::regprocedure
    )
  ) = 0 then
    raise exception 'submit_rsvp no longer serializes revision updates globally';
  end if;

  begin
    perform public.submit_rsvp(
      'Verify Null Token', 'verify null token', 'IAS',
      'self_transport', null, '[]'::jsonb, null
    );
    raise exception 'submit_rsvp accepted a null edit token';
  exception when invalid_parameter_value then
    null;
  end;

  perform set_config(
    'request.headers',
    '{"x-forwarded-for":"203.0.113.42"}',
    true
  );

  for v_attempt in 1..20 loop
    v_name := 'Verify IP Limit ' || v_attempt;
    perform public.submit_rsvp(
      v_name,
      public.normalize_guest_name(v_name),
      'IAS',
      'self_transport',
      null,
      '[]'::jsonb,
      repeat(lpad(v_attempt::text, 2, '0'), 32)
    );
  end loop;

  begin
    perform public.submit_rsvp(
      'Verify IP Limit Blocked',
      'verify ip limit blocked',
      'IAS',
      'self_transport',
      null,
      '[]'::jsonb,
      repeat('f', 64)
    );
  exception
    when raise_exception then
      if sqlerrm = 'Too many RSVP submissions; please try again later' then
        v_rate_limited := true;
      else
        raise;
      end if;
  end;

  if not v_rate_limited then
    raise exception 'the twenty-first RSVP from one IP was not rate-limited';
  end if;

  perform set_config(
    'request.headers',
    '{"x-forwarded-for":"203.0.113.43"}',
    true
  );
  perform public.submit_rsvp(
    'Verify Other IP',
    'verify other ip',
    'IAS',
    'self_transport',
    null,
    '[]'::jsonb,
    repeat('e', 64)
  );

  update private.rsvp_rate_limit_events
  set created_at = now() - interval '16 minutes';

  perform set_config(
    'request.headers',
    '{"x-forwarded-for":"203.0.113.42"}',
    true
  );
  perform public.submit_rsvp(
    'Verify Expired Window',
    'verify expired window',
    'IAS',
    'self_transport',
    null,
    '[]'::jsonb,
    repeat('d', 64)
  );

  if exists (
    select 1
    from private.rsvp_rate_limit_events
    where created_at <= now() - interval '15 minutes'
  ) then
    raise exception 'expired RSVP rate-limit events were not cleaned up';
  end if;
end;
$verify_rsvp_ip_rate_limit$;

rollback;
