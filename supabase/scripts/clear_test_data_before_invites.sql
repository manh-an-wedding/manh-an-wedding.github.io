-- Run this once, manually, immediately before sending the invitation links.
-- It removes test submissions only. It intentionally preserves:
--   auth.users, public.admin_users, public.rsvp_groups,
--   public.rsvp_settings, public.public_group_pages and rate-limit config.
-- Do not add CASCADE: an unexpected dependency should stop this script.

begin;

truncate table
  public.companions,
  public.rsvp_duplicate_review_history,
  public.rsvp,
  public.wishes,
  public.guests
restart identity;

truncate table private.rsvp_rate_limit_events restart identity;

commit;

select 'rsvp' as dataset, count(*) as remaining_rows from public.rsvp
union all
select 'companions', count(*) from public.companions
union all
select 'duplicate review history', count(*)
from public.rsvp_duplicate_review_history
union all
select 'wishes', count(*) from public.wishes
union all
select 'guests', count(*) from public.guests
union all
select 'rate-limit events', count(*) from private.rsvp_rate_limit_events;
