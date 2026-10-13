-- Keep shuttle registration open: a null bus_deadline never trips the
-- `now() > v_bus_deadline` check in submit_rsvp / update_rsvp.

begin;

alter table public.rsvp_settings
  alter column bus_deadline drop not null;

update public.rsvp_settings
set bus_deadline = null
where singleton;

commit;
