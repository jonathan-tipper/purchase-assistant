-- Paid assistant admission checks this after verifying the bearer and app client.
-- Browsers cannot inspect auth.sessions or invoke this helper themselves.
create function public.pa_has_live_session(p_session uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.sessions s
    where s.id = p_session and s.user_id = p_user
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function public.pa_has_live_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.pa_has_live_session(uuid, uuid) to service_role;
comment on function public.pa_has_live_session(uuid, uuid) is
  'Service-only Purchase Assistant session admission; caller must verify bearer, identity and registered OAuth client first.';
