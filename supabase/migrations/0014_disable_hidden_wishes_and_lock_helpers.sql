-- Disable backend surfaces for UI sections that remain hidden and remove
-- direct access to the RLS event-trigger helper when it exists.

begin;

revoke execute on function public.submit_wish(text,text,boolean)
from public, anon, authenticated;

revoke select on table public.wishes_public
from public, anon, authenticated;

revoke select (id, name, message, is_public, created_at)
on table public.wishes
from public, anon, authenticated;

drop policy if exists wishes_public_read on public.wishes;

do $lock_rls_auto_enable$
begin
  if pg_catalog.to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() '
      || 'from public, anon, authenticated';
  end if;
end;
$lock_rls_auto_enable$;

notify pgrst, 'reload schema';

commit;
