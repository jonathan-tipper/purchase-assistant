-- Additive decision workspace. Original items and journal are retained for explicit recovery.
create table public.pa_decisions (
 id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null,
 primary key (user_id,id),
 revision integer not null default 1 check (revision > 0),
 updated_at timestamptz not null default now(),
 constraint pa_decision_payload check (
  jsonb_typeof(payload) = 'object' and payload ?& array['schemaVersion','id','revision','currency','status','candidates'] and octet_length(payload::text) <= 100000
  and payload->>'schemaVersion' = '1' and payload->>'id' = id::text
  and payload->>'revision' = revision::text
  and payload->>'currency' in ('GBP','USD','EUR','JPY')
  and payload->>'status' in ('considering','bought','deferred','passed','returned')
  and jsonb_typeof(payload->'candidates') = 'array'
  and jsonb_array_length(payload->'candidates') between 1 and 3
 )
);
create index pa_decisions_owner_updated on public.pa_decisions (user_id, updated_at desc);
alter table public.pa_decisions enable row level security;
create policy pa_decisions_own on public.pa_decisions for all to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.pa_decisions to authenticated;
revoke all on public.pa_decisions from anon;

create function public.pa_guard_decision_update() returns trigger
language plpgsql set search_path = '' as $$
begin
 if new.id <> old.id or new.user_id <> old.user_id or new.revision <> old.revision + 1 then
  raise exception 'Decision identity is immutable and revision must increment by one' using errcode = '23514';
 end if;
 new.updated_at = now();
 return new;
end; $$;
create trigger pa_decision_revision before update on public.pa_decisions
 for each row execute function public.pa_guard_decision_update();
revoke all on function public.pa_guard_decision_update() from public, anon, authenticated;

-- A service-only admission ledger. Clients cannot grant themselves quota.
create table public.pa_ai_limits (
 singleton boolean primary key default true check (singleton),
 enabled boolean not null default true,
 user_daily_units integer not null default 12 check (user_daily_units between 0 and 1000),
 global_daily_units integer not null default 120 check (global_daily_units between 0 and 10000)
);
insert into public.pa_ai_limits(singleton) values (true);
create table public.pa_ai_runs (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null check (action in ('extract','research')),
 units integer not null check (units between 1 and 4),
 status text not null default 'reserved' check (status in ('reserved','complete','failed')),
 provider_calls integer not null default 0,
 input_tokens integer not null default 0,
 output_tokens integer not null default 0,
 created_at timestamptz not null default now()
);
create index pa_ai_runs_day_owner on public.pa_ai_runs(created_at,user_id);
alter table public.pa_ai_limits enable row level security;
alter table public.pa_ai_runs enable row level security;
revoke all on public.pa_ai_limits,public.pa_ai_runs from public,anon,authenticated;
grant select,insert,update,delete on public.pa_ai_limits,public.pa_ai_runs to service_role;
create function public.pa_reserve_ai_run(p_id uuid,p_user uuid,p_action text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare lim public.pa_ai_limits%rowtype; charge integer; day_start timestamptz; global_used integer; user_used integer;
begin
 if p_action not in ('extract','research') or p_user is null then return false; end if;
 charge := case when p_action = 'research' then 4 else 1 end;
 -- Lock the singleton before checking and inserting: concurrent requests cannot overspend quota.
 select * into lim from public.pa_ai_limits where singleton = true for update;
 if not found or not lim.enabled then return false; end if;
 if exists(select 1 from public.pa_ai_runs where id=p_id) then return false; end if;
 day_start := date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
 select coalesce(sum(units),0),coalesce(sum(units) filter(where user_id=p_user),0)
 into global_used,user_used from public.pa_ai_runs where created_at >= day_start;
 if global_used + charge > lim.global_daily_units or user_used + charge > lim.user_daily_units then return false; end if;
 insert into public.pa_ai_runs(id,user_id,action,units) values(p_id,p_user,p_action,charge);
 return true;
end; $$;
revoke all on function public.pa_reserve_ai_run(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.pa_reserve_ai_run(uuid,uuid,text) to service_role;

-- Harden the existing app-specific trigger functions without altering other apps.
alter function public.pa_handle_new_user() set search_path = '';
alter function public.pa_update_updated_at_column() set search_path = '';
revoke execute on function public.pa_handle_new_user() from public,anon,authenticated;
