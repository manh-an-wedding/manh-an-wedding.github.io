begin;

-- The public invitation and /admin share one Supabase client. Once an admin
-- signs in, PostgREST uses the authenticated role for every RPC call in that
-- browser, including the public RSVP form. Keep direct table writes revoked;
-- only allow the validated SECURITY DEFINER submission entry point.
grant execute on function public.submit_rsvp(
  text, text, text, text, text, jsonb, text
) to anon, authenticated;

commit;
