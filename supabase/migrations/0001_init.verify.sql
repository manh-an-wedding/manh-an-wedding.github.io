-- Run AFTER 0001_init.sql. Each SELECT should return the noted result.
-- Delete the test rows afterward.

-- same person, same (null) device, changes mind → latest wins, collapses to 1:
insert into rsvp (guest_name,name_norm,category,status) values ('A','a','IAS','bus');
insert into rsvp (guest_name,name_norm,category,status) values ('A','a','IAS','cannot_attend');
select count(*) as should_be_1 from rsvp_latest where name_norm='a';
select status as should_be_cannot_attend from rsvp_latest where name_norm='a';

-- TWO different devices, same name → BOTH kept (accepted dup, no data loss):
insert into rsvp (guest_name,name_norm,category,status,device_id) values ('B','b','IAS','bus','dev-1');
insert into rsvp (guest_name,name_norm,category,status,device_id) values ('B','b','IAS','bus','dev-2');
select count(*) as should_be_2 from rsvp_latest where name_norm='b';

-- same device re-submits → collapses to latest for that device (still 2 total):
insert into rsvp (guest_name,name_norm,category,status,device_id) values ('B','b','IAS','cannot_attend','dev-1');
select count(*) as still_2 from rsvp_latest where name_norm='b';
select status as dev1_should_be_cannot from rsvp_latest where name_norm='b' and device_id='dev-1';

-- possible_duplicates flags name_norm='b' (2 devices):
select device_count as should_be_2b from possible_duplicates where name_norm='b';

-- wishes_public excludes private:
insert into wishes (name,message,is_public) values ('C','hi',false);
insert into wishes (name,message,is_public) values ('D','congrats',true);
select count(*) as should_be_1_wish from wishes_public where name in ('C','D');

-- bus-seat count IGNORES companions of superseded rsvp rows (risk #5):
-- attach a bus companion to 'a's now-superseded bus row; latest status is cannot_attend
insert into companions (rsvp_id, name, joins_bus)
  select id, 'X', true from rsvp where name_norm='a' and status='bus';
select companion_seats as should_be_0 from bus_seat_count;

-- cleanup
delete from companions where name = 'X';
delete from rsvp where name_norm in ('a','b');
delete from wishes where name in ('C','D');
