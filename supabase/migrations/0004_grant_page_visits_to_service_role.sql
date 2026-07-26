begin;

grant insert on table public.page_visits to service_role;
grant usage on sequence public.page_visits_id_seq to service_role;

commit;
