-- Keep confirmed/rejected duplicate candidates visible to authenticated admins
-- so review decisions can be audited or returned to pending.

begin;

create or replace view public.possible_duplicates
with (security_invoker = true)
as
select
  source.id as candidate_id,
  source.guest_name as candidate_guest_name,
  source.category as candidate_category,
  source.status as candidate_status,
  source.phone as candidate_phone,
  source.device_id as candidate_device_id,
  source.party_size as candidate_party_size,
  source.created_at as candidate_created_at,
  target.id as target_id,
  target.guest_name as target_guest_name,
  target.category as target_category,
  target.status as target_status,
  target.phone as target_phone,
  target.device_id as target_device_id,
  target.party_size as target_party_size,
  target.created_at as target_created_at,
  source.duplicate_status as candidate_duplicate_status,
  source.duplicate_reviewed_at as candidate_duplicate_reviewed_at,
  source.duplicate_reviewed_by as candidate_duplicate_reviewed_by
from public.rsvp source
join lateral (
  with recursive revision_chain as (
    select first_target.*
    from public.rsvp first_target
    where first_target.id = source.duplicate_of_id

    union all

    select next_target.*
    from public.rsvp next_target
    join revision_chain previous
      on next_target.id = previous.superseded_by_id
  )
  select *
  from revision_chain
  order by created_at desc, id desc
  limit 1
) target on true
where source.superseded_by_id is null
  and source.duplicate_status is not null;

commit;
