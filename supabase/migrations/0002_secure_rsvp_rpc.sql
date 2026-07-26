-- Keep private RSVP rows unreadable to public visitors while exposing only the
-- two operations the invitation needs.

create or replace function public.check_rsvp_clash(
  p_name_norm text,
  p_category text,
  p_status text,
  p_device_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_name_norm), '') is null
     or nullif(btrim(p_category), '') is null
     or p_status not in ('self_transport', 'bus', 'cannot_attend') then
    raise exception 'Invalid RSVP clash-check input' using errcode = '22023';
  end if;

  return exists (
    select 1
    from public.rsvp r
    where r.name_norm = btrim(p_name_norm)
      and r.category = p_category
      and r.status = p_status
  ) and not exists (
    select 1
    from public.rsvp r
    where r.name_norm = btrim(p_name_norm)
      and r.category = p_category
      and r.status = p_status
      and coalesce(r.device_id, '') = coalesce(p_device_id, '')
  );
end;
$$;

create or replace function public.submit_rsvp(
  p_guest_name text,
  p_name_norm text,
  p_category text,
  p_status text,
  p_phone text,
  p_companions jsonb,
  p_device_id text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rsvp_id bigint;
  v_companion_count integer;
begin
  if nullif(btrim(p_guest_name), '') is null
     or nullif(btrim(p_name_norm), '') is null
     or nullif(btrim(p_category), '') is null
     or p_status not in ('self_transport', 'bus', 'cannot_attend') then
    raise exception 'Invalid RSVP input' using errcode = '22023';
  end if;

  if p_status = 'bus' and nullif(btrim(p_phone), '') is null then
    raise exception 'Phone is required for bus registration' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_companions, '[]'::jsonb)) <> 'array' then
    raise exception 'Companions must be a JSON array' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) as entry(value)
  where nullif(btrim(entry.value ->> 'name'), '') is not null;

  insert into public.rsvp (
    guest_name,
    name_norm,
    category,
    status,
    phone,
    party_size,
    device_id
  )
  values (
    btrim(p_guest_name),
    btrim(p_name_norm),
    p_category,
    p_status,
    case when p_status = 'bus' then nullif(btrim(p_phone), '') else null end,
    1 + v_companion_count,
    p_device_id
  )
  returning id into v_rsvp_id;

  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_rsvp_id,
    btrim(entry.value ->> 'name'),
    coalesce((entry.value ->> 'joinsBus')::boolean, false),
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) as entry(value)
  where nullif(btrim(entry.value ->> 'name'), '') is not null;

  return v_rsvp_id;
end;
$$;

revoke all on function public.check_rsvp_clash(text, text, text, text) from public;
revoke all on function public.submit_rsvp(text, text, text, text, text, jsonb, text) from public;

grant execute on function public.check_rsvp_clash(text, text, text, text) to anon;
grant execute on function public.submit_rsvp(text, text, text, text, text, jsonb, text) to anon;
