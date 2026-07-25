-- Wedding invite schema + views + RLS
-- Apply in the Supabase project SQL editor (or `supabase db reset` locally).

create table if not exists guests (
  id bigint generated always as identity primary key,
  full_name text not null,
  category text,
  expected_size int,
  notes text
);

create table if not exists rsvp (
  id bigint generated always as identity primary key,
  guest_name text not null,
  name_norm text not null,
  category text not null,
  status text not null check (status in ('self_transport','bus','cannot_attend')),
  phone text,
  party_size int not null default 1,
  matched_guest_id bigint references guests(id),
  device_id text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists rsvp_name_norm_idx on rsvp (name_norm, created_at desc);

create table if not exists companions (
  id bigint generated always as identity primary key,
  rsvp_id bigint not null references rsvp(id) on delete cascade,
  name text not null,
  joins_bus boolean not null default false,
  relation text
);

create table if not exists wishes (
  id bigint generated always as identity primary key,
  name text not null,
  message text not null,
  is_public boolean not null default true,
  device_id text,
  ip text,
  created_at timestamptz not null default now()
);

create table if not exists page_visits (
  id bigint generated always as identity primary key,
  device_id text,
  ip text,
  visited_at timestamptz not null default now()
);

-- latest choice per person+device (accepts visible duplicates instead of
-- silently overwriting two different people who share a name — see spec §7)
create or replace view rsvp_latest as
select distinct on (name_norm, coalesce(device_id,'')) *
from rsvp
order by name_norm, coalesce(device_id,''), created_at desc, id desc;

-- names appearing under >1 device_id → possible different people (or same person
-- on 2 devices); the couple reviews these manually via phone/group
create or replace view possible_duplicates as
select name_norm,
       count(distinct coalesce(device_id,'')) as device_count,
       array_agg(distinct guest_name) as names,
       array_agg(distinct category) as groups
from rsvp
group by name_norm
having count(distinct coalesce(device_id,'')) > 1;

-- public wishes wall (no ip/device leak)
create or replace view wishes_public as
select id, name, message, created_at from wishes where is_public = true;

-- autocomplete source: expose ONLY names (never category/notes)
create or replace view guests_public as
select full_name from guests;

-- correct bus-seat counts: only companions of the LATEST rsvp per person
-- (append-only means old rsvp rows still have their old companions; must exclude them)
create or replace view bus_manifest as
select r.guest_name, r.category, r.phone, c.name as companion_name, c.joins_bus
from rsvp_latest r
left join companions c on c.rsvp_id = r.id
where r.status = 'bus';

create or replace view bus_seat_count as
select
  (select count(*) from rsvp_latest where status = 'bus') as guest_seats,
  (select count(*) from companions c
     join rsvp_latest r on r.id = c.rsvp_id
     where c.joins_bus = true) as companion_seats;

-- RLS
alter table rsvp enable row level security;
alter table companions enable row level security;
alter table wishes enable row level security;
alter table page_visits enable row level security;
alter table guests enable row level security;

-- anon may INSERT responses but never SELECT the raw tables
grant insert on rsvp, companions, wishes to anon;
create policy rsvp_insert on rsvp for insert to anon with check (true);
create policy companions_insert on companions for insert to anon with check (true);
create policy wishes_insert on wishes for insert to anon with check (true);
-- (no SELECT policy on rsvp/companions/wishes/guests for anon → reads denied)

-- page_visits: only the Edge Function (service role) writes; anon has no access
revoke all on page_visits from anon;

-- anon may read ONLY the safe views
grant select on guests_public, wishes_public to anon;
-- do NOT grant rsvp_latest/bus_manifest/bus_seat_count/possible_duplicates to anon (admin-only)
