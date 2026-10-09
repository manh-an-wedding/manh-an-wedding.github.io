-- /bus-admin "check all" / "uncheck all": sets every boarding checkbox in one call, keeping notes.

begin;

create or replace function public.set_all_public_bus_guest_checks(
  p_token text,
  p_checked boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(p_token), '') is null
     or not exists (
       select 1
       from public.public_bus_pages page
       where page.access_token = btrim(p_token)
         and page.is_public = true
         and page.includes_phone = true
     ) then
    raise exception 'Invalid public bus access token' using errcode = '42501';
  end if;

  if p_checked is true then
    insert into public.bus_roster_marks (rsvp_id, checked, updated_at)
    select r.id, true, now()
    from public.rsvp_latest r
    where r.status = 'bus'
    on conflict (rsvp_id)
    do update set checked = true, updated_at = now();
  else
    update public.bus_roster_marks
    set checked = false, updated_at = now()
    where checked = true;
  end if;
end;
$$;

revoke all on function public.set_all_public_bus_guest_checks(text, boolean)
from public, anon, authenticated;
grant execute on function public.set_all_public_bus_guest_checks(text, boolean)
to anon, authenticated;

notify pgrst, 'reload schema';

commit;
