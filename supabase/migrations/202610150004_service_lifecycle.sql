begin;
alter table public.portal_service_entitlements add column start_date date,add column end_date date,add column billing_arrangement text check(billing_arrangement in ('included','one_time','monthly','annual','custom')),
 add constraint service_dates_ordered check(start_date is null or end_date is null or end_date>=start_date);
create table public.portal_service_internal (
 service_id uuid primary key references public.portal_service_entitlements(id),staff_note text not null default '' check(length(staff_note)<=5000),
 revision integer not null default 0,updated_by uuid not null references public.portal_accounts(user_id),updated_at timestamptz not null default now()
);
create table public.portal_service_history (
 id uuid primary key,service_id uuid not null references public.portal_service_entitlements(id),actor_id uuid not null references public.portal_accounts(user_id),
 input jsonb not null,previous jsonb not null,created_at timestamptz not null default now()
);
create index portal_service_history_lookup on public.portal_service_history(service_id,created_at desc,id);
alter table public.portal_service_internal enable row level security;
alter table public.portal_service_history enable row level security;
revoke all on public.portal_service_internal,public.portal_service_history from public,anon,authenticated,service_role;
grant select on public.portal_service_internal,public.portal_service_history to authenticated,service_role;
create policy service_read on public.portal_service_internal for select to authenticated using(public.portal_has_permission('services.read'));
create policy service_read on public.portal_service_history for select to authenticated using(public.portal_has_permission('services.read'));
create function public.portal_service_lifecycle(p_id uuid,p_actor uuid,p_service uuid,p_client uuid,p_revision integer,p_start date,p_end date,p_billing text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare prior public.portal_service_history;s public.portal_service_entitlements;m public.portal_service_internal;payload jsonb;begin
 if not public.portal_actor_can(p_actor,'services.write') then raise exception 'Service permission required';end if;
 payload=jsonb_build_object('client_id',p_client,'revision',p_revision,'start_date',p_start,'end_date',p_end,'billing_arrangement',p_billing,'staff_note',p_note);
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into prior from public.portal_service_history where id=p_id;
 if found then if prior.service_id<>p_service or prior.actor_id<>p_actor or prior.input<>payload then raise exception 'Service request conflict';end if;return;end if;
 select * into s from public.portal_service_entitlements where id=p_service and client_id=p_client for update;
 if not found then raise exception 'Service missing';end if;
 if not exists(select 1 from public.portal_clients where id=p_client and status='active') then raise exception 'Active client required';end if;
 select * into m from public.portal_service_internal where service_id=p_service;
 if coalesce(m.revision,0)<>p_revision then raise exception 'Service revision changed';end if;
 update public.portal_service_entitlements set start_date=p_start,end_date=p_end,billing_arrangement=p_billing where id=p_service;
 insert into public.portal_service_internal(service_id,staff_note,revision,updated_by) values(p_service,p_note,p_revision+1,p_actor)
 on conflict(service_id) do update set staff_note=excluded.staff_note,revision=excluded.revision,updated_by=p_actor,updated_at=now();
 insert into public.portal_service_history(id,service_id,actor_id,input,previous) values(p_id,p_service,p_actor,payload,jsonb_build_object('start_date',s.start_date,'end_date',s.end_date,'billing_arrangement',s.billing_arrangement,'staff_note',m.staff_note));
 insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'service_lifecycle_saved',p_service::text,jsonb_build_object('operation_id',p_id,'revision',p_revision+1));
end $$;
revoke all on function public.portal_service_lifecycle(uuid,uuid,uuid,uuid,integer,date,date,text,text) from public,anon,authenticated;
grant execute on function public.portal_service_lifecycle(uuid,uuid,uuid,uuid,integer,date,date,text,text) to service_role;
insert into public.portal_schema_releases(version) values('202610150004');
commit;
