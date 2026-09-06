-- Transactional integration checks. All fixtures and quota changes roll back.
begin;
do $$
declare
 a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); item uuid := gen_random_uuid();
 run uuid := gen_random_uuid(); n integer; accepted boolean;
 fixture jsonb;
begin
 insert into auth.users(id,email,raw_user_meta_data) values(a,a::text||'@example.invalid','{}'),(b,b::text||'@example.invalid','{}');
 fixture := jsonb_build_object('schemaVersion',1,'id',item,'revision',1,'currency','GBP','status','considering','candidates',jsonb_build_array(jsonb_build_object('name','Test')));
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 set local role authenticated;
 insert into public.pa_decisions(id,user_id,payload) values(item,a,fixture);
 begin
  insert into public.pa_decisions(id,user_id,payload) values(gen_random_uuid(),b,fixture);
  raise exception 'Cross-user insert unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
 reset role;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 set local role authenticated;
 select count(*) into n from public.pa_decisions where id=item;
 if n<>0 then raise exception 'Cross-user read leaked a decision'; end if;
 update public.pa_decisions set revision=2,payload=jsonb_set(payload,'{revision}','2') where id=item;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-user update affected a decision'; end if;
 delete from public.pa_decisions where id=item;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-user delete affected a decision'; end if;
 begin
  perform public.pa_reserve_ai_run(run,b,'research');
  raise exception 'Client quota reservation unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
 reset role;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 set local role authenticated;
 update public.pa_decisions set revision=2,payload=jsonb_set(payload,'{revision}','2') where id=item and revision=1;
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Owner update failed'; end if;
 update public.pa_decisions set revision=2,payload=jsonb_set(payload,'{revision}','2') where id=item and revision=1;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Stale revision update succeeded'; end if;
 begin
  update public.pa_decisions set revision=4,payload=jsonb_set(payload,'{revision}','4') where id=item;
  raise exception 'Skipped revision unexpectedly succeeded';
 exception when check_violation then null;
 end;
 reset role;
 -- Check the export capacity and repeat-import allowance in the same transaction.
 set local role authenticated;
 insert into public.pa_decisions(id,user_id,payload)
 select fresh,a,jsonb_set(fixture,'{id}',to_jsonb(fresh::text)) from (select gen_random_uuid() fresh from generate_series(1,199)) ids;
 begin
  item := gen_random_uuid();
  insert into public.pa_decisions(id,user_id,payload) values(item,a,jsonb_set(fixture,'{id}',to_jsonb(item::text)));
  raise exception 'Workspace capacity exceeded';
 exception when sqlstate '54000' then null;
 end;
 reset role;
 -- Set transaction-local test allowances. Original values return on rollback.
 update public.pa_ai_limits set user_daily_units=4,global_daily_units=10000,enabled=true;
 set local role service_role;
 accepted := public.pa_reserve_ai_run(run,a,'research');
 if not accepted then raise exception 'First quota reservation failed'; end if;
 if public.pa_reserve_ai_run(run,a,'research') then raise exception 'Duplicate reservation accepted'; end if;
 if public.pa_reserve_ai_run(gen_random_uuid(),a,'extract') then raise exception 'User daily quota exceeded'; end if;
 reset role;
 update public.pa_ai_limits set global_daily_units=0;
 set local role service_role;
 if public.pa_reserve_ai_run(gen_random_uuid(),b,'extract') then raise exception 'Global daily quota exceeded'; end if;
 reset role;
 update public.pa_ai_limits set enabled=false,global_daily_units=10000;
 set local role service_role;
 if public.pa_reserve_ai_run(gen_random_uuid(),b,'extract') then raise exception 'Disabled admission accepted'; end if;
 reset role;
 set local role anon;
 begin
  perform count(*) from public.pa_decisions;
  raise exception 'Anonymous table read unexpectedly succeeded';
 exception when insufficient_privilege then null;
 end;
 reset role;
end $$;
select 'PASS: owner isolation, CRUD, revision conflicts, service-only quota, duplicate requests, user/global limits kill switch and workspace capacity' as result;
rollback;
