-- The admin UI edits the active RSVP in place through admin_update_rsvp.
-- This legacy revision RPC still referenced device_id/ip columns removed in 0010.

begin;

drop function if exists public.admin_create_rsvp_revision(
  bigint, text, text, text, text, jsonb
);

notify pgrst, 'reload schema';

commit;
