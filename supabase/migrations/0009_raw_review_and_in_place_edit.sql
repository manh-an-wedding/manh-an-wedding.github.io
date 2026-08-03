-- Add raw-data review state and let admins correct the active RSVP in place.

begin;

alter table public.rsvp
  add column if not exists data_check boolean not null default false;

create or replace view public.rsvp_latest
with (security_invoker = true)
as
select
  r.id,
  r.guest_name,
  r.name_norm,
  r.category,
  r.status,
  r.phone,
  r.party_size,
  r.matched_guest_id,
  r.device_id,
  r.ip,
  r.created_at,
  r.superseded_by_id,
  r.duplicate_of_id,
  r.duplicate_status,
  r.duplicate_reviewed_at,
  r.duplicate_reviewed_by,
  r.data_check
from public.rsvp r
where r.superseded_by_id is null
  and r.duplicate_status is distinct from 'confirmed';

create or replace function public.admin_update_rsvp(
  p_source_id bigint,
  p_guest_name text,
  p_category text,
  p_status text,
  p_phone text,
  p_companions jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.rsvp%rowtype;
  v_name_norm text;
  v_companion_count integer;
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into v_source
  from public.rsvp
  where id = p_source_id
  for update;

  if v_source.id is null
     or v_source.superseded_by_id is not null
     or v_source.duplicate_status = 'confirmed' then
    raise exception 'RSVP is no longer editable' using errcode = '22023';
  end if;

  v_name_norm := public.normalize_guest_name(p_guest_name);
  if nullif(btrim(p_guest_name), '') is null
     or char_length(btrim(p_guest_name)) > 120
     or p_status not in ('self_transport', 'bus', 'cannot_attend')
     or not exists (
       select 1 from public.rsvp_groups g
       where g.name = btrim(p_category)
     ) then
    raise exception 'Invalid RSVP input' using errcode = '22023';
  end if;

  if p_status = 'bus'
     and (
       nullif(btrim(p_phone), '') is null
       or char_length(btrim(p_phone)) > 24
       or btrim(p_phone) !~ '^[0-9+(). -]{6,24}$'
     ) then
    raise exception 'Invalid phone for bus registration' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_companions, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_companions, '[]'::jsonb)) > 9
     or exists (
       select 1
       from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value)
       where jsonb_typeof(entry.value) <> 'object'
          or nullif(btrim(entry.value ->> 'name'), '') is null
          or char_length(btrim(entry.value ->> 'name')) > 120
          or char_length(coalesce(btrim(entry.value ->> 'relation'), '')) > 80
     ) then
    raise exception 'Invalid companions list' using errcode = '22023';
  end if;

  select count(*)::integer
  into v_companion_count
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb));

  update public.rsvp
  set guest_name = btrim(p_guest_name),
      name_norm = v_name_norm,
      category = btrim(p_category),
      status = p_status,
      phone = case when p_status = 'bus' then btrim(p_phone) else null end,
      party_size = 1 + v_companion_count,
      data_check = false
  where id = v_source.id;

  delete from public.companions
  where rsvp_id = v_source.id;

  insert into public.companions (rsvp_id, name, joins_bus, relation)
  select
    v_source.id,
    btrim(entry.value ->> 'name'),
    p_status = 'bus',
    nullif(btrim(entry.value ->> 'relation'), '')
  from jsonb_array_elements(coalesce(p_companions, '[]'::jsonb)) entry(value);

  perform public.flag_rsvp_duplicate_candidates(v_source.id);
  return v_source.id;
end;
$$;

create or replace function public.admin_set_rsvp_data_check(
  p_rsvp_id bigint,
  p_data_check boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_rsvp_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.rsvp
  set data_check = coalesce(p_data_check, false)
  where id = p_rsvp_id;

  if not found then
    raise exception 'RSVP not found' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.admin_create_rsvp_revision(
  bigint,text,text,text,text,jsonb
) from public, anon, authenticated;

revoke all on function public.admin_update_rsvp(
  bigint,text,text,text,text,jsonb
) from public, anon, authenticated;
revoke all on function public.admin_set_rsvp_data_check(bigint,boolean)
from public, anon, authenticated;

grant execute on function public.admin_update_rsvp(
  bigint,text,text,text,text,jsonb
) to authenticated;
grant execute on function public.admin_set_rsvp_data_check(bigint,boolean)
to authenticated;

commit;
