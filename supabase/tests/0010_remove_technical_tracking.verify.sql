-- Run after migration 0010. All verification data is rolled back.

begin;

do $verify_tracking_schema_removed$
begin
  if pg_catalog.to_regclass('public.page_visits') is not null then
    raise exception 'page_visits table still exists';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('rsvp', 'wishes', 'rsvp_latest', 'possible_duplicates')
      and column_name in (
        'device_id', 'ip', 'candidate_device_id', 'target_device_id'
      )
  ) then
    raise exception 'technical identifier columns still exist';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rsvp'
      and column_name = 'edit_token_hash'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rsvp'
      and column_name = 'invalidated_at'
  ) then
    raise exception 'RSVP edit/invalidation columns are missing';
  end if;

  if pg_catalog.to_regprocedure(
       'public.log_page_visit(text,text)'
     ) is not null
     or pg_catalog.to_regprocedure(
       'public.check_rsvp_clash(text,text,text,text)'
     ) is not null
     or pg_catalog.to_regprocedure(
       'public.submit_rsvp(text,text,text,text,text,jsonb)'
     ) is not null
     or pg_catalog.to_regprocedure(
       'public.submit_wish(text,text,boolean,text)'
     ) is not null then
    raise exception 'legacy tracking RPC still exists';
  end if;

  if pg_catalog.to_regprocedure(
       'public.submit_rsvp(text,text,text,text,text,jsonb,text)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.update_rsvp(bigint,text,text,text,text,text,text,jsonb)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.admin_set_rsvp_invalidated(bigint,boolean,text)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.submit_wish(text,text,boolean)'
     ) is null then
    raise exception 'tracking-free submission RPC is missing';
  end if;
end;
$verify_tracking_schema_removed$;

do $verify_tracking_free_submissions$
declare
  v_first bigint;
  v_second bigint;
  v_third bigint;
  v_before_count bigint;
  v_wish bigint;
begin
  v_first := public.submit_rsvp(
    'Verify No Tracking', 'verify no tracking', 'Tiến bước',
    'self_transport', null, '[]'::jsonb, repeat('a', 64)
  );
  v_second := public.submit_rsvp(
    'Verify No Tracking', 'verify no tracking', 'Tiến bước',
    'cannot_attend', null, '[]'::jsonb, repeat('b', 64)
  );

  if not exists (
       select 1 from public.rsvp
       where id = v_first
         and superseded_by_id = v_second
         and duplicate_of_id is null
     ) then
    raise exception 'same-name/group submission did not supersede the old RSVP';
  end if;

  select count(*) into v_before_count from public.rsvp;
  perform public.update_rsvp(
    v_second, repeat('b', 64),
    'Verify No Tracking', 'verify no tracking', 'Tiến bước',
    'self_transport', null,
    '[{"name":"Updated companion"}]'::jsonb
  );
  if (select count(*) from public.rsvp) <> v_before_count
     or not exists (
       select 1 from public.rsvp r
       where r.id = v_second and r.status = 'self_transport'
         and r.party_size = 2
     )
     or not exists (
       select 1 from public.companions c
       where c.rsvp_id = v_second and c.name = 'Updated companion'
     ) then
    raise exception 'guest edit did not update the existing RSVP in place';
  end if;

  begin
    perform public.update_rsvp(
      v_second, repeat('c', 64),
      'Verify No Tracking', 'verify no tracking', 'Tiến bước',
      'cannot_attend', null, '[]'::jsonb
    );
    raise exception 'update_rsvp accepted an invalid edit token';
  exception when insufficient_privilege then
    null;
  end;

  v_third := public.submit_rsvp(
    'Verify No Tracking', 'verify no tracking', 'IAS',
    'self_transport', null, '[]'::jsonb, repeat('d', 64)
  );
  if not exists (
       select 1 from public.rsvp
       where id = v_second
         and duplicate_of_id = v_third
         and duplicate_status = 'pending'
     )
     or exists (select 1 from public.rsvp_latest where id = v_second)
     or not exists (select 1 from public.rsvp_latest where id = v_third) then
    raise exception 'cross-group duplicate review did not isolate the candidate';
  end if;

  update public.rsvp
  set invalidated_at = now(), invalid_reason = 'verification'
  where id = v_second;
  if exists (select 1 from public.rsvp_latest where id = v_second)
     or exists (select 1 from public.bus_manifest where rsvp_id = v_second) then
    raise exception 'invalidated RSVP remains in an active view';
  end if;

  v_wish := public.submit_wish(
    'Verify Wish No Tracking', 'No technical identifier', true
  );
  if not exists (select 1 from public.wishes where id = v_wish) then
    raise exception 'tracking-free wish submission failed';
  end if;
end;
$verify_tracking_free_submissions$;

rollback;
