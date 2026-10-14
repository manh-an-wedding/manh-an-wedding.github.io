-- Close shuttle registration: submit_rsvp / update_rsvp reject status 'bus' once
-- now() is past bus_deadline. Admin edits are not affected.

begin;

update public.rsvp_settings
set bus_deadline = now()
where singleton;

commit;
