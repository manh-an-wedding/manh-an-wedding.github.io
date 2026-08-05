-- Sync the database with the updated invitation config:
--   1) add the new RSVP group "Bạn của Mạnh" (submit_rsvp validates the group
--      against public.rsvp_groups, so the dropdown option is rejected until it exists)
--   2) move the server-enforced bus-registration deadline 10.10 -> 13.10
--      (submit_rsvp rejects bus RSVPs when now() > rsvp_settings.bus_deadline)
begin;

insert into public.rsvp_groups (name)
values ('Bạn của Mạnh')
on conflict (name) do nothing;

update public.rsvp_settings
set bus_deadline = timestamptz '2026-10-13 11:30:00+07:00'
where singleton;

commit;
