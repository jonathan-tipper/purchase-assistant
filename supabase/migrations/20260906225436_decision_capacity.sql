-- Keep account workspaces within the portable export contract, including concurrent imports.
create function public.pa_guard_decision_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if auth.role() = 'authenticated' and auth.uid() is distinct from new.user_id then
  raise exception 'Decision owner must match the signed-in user' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('pa_decisions:'||new.user_id::text,0));
 if not exists(select 1 from public.pa_decisions where user_id=new.user_id and id=new.id)
 and (select count(*) from public.pa_decisions where user_id=new.user_id) >= 200 then
  raise exception 'This workspace supports 200 decisions. Export and delete an older decision before adding another.' using errcode='54000';
 end if;
 return new;
end; $$;
create trigger pa_decision_capacity before insert on public.pa_decisions
 for each row execute function public.pa_guard_decision_insert();
revoke all on function public.pa_guard_decision_insert() from public,anon,authenticated;
