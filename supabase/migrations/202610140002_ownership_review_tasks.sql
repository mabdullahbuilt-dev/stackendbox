begin;
-- Staff-only follow-up. No registrar mutation or legal-completion state exists.
create table public.portal_ownership_tasks (
 id uuid primary key,domain text not null check(domain=lower(domain) and domain<>'stackendbox.com' and domain not like '%.stackendbox.com'),
 kind text not null check(kind in ('registered_holder','registrar_custody','external_registrar')),
 status text not null default 'awaiting_consent' check(status in ('awaiting_consent','consent_recorded','awaiting_registrar_confirmation','review_required','cancelled')),
 revision integer not null default 0 check(revision>=0),request_reference text not null check(length(trim(request_reference)) between 3 and 200),
 baseline jsonb not null,created_by uuid not null references public.portal_accounts(user_id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create unique index portal_ownership_active on public.portal_ownership_tasks(domain,kind) where status<>'cancelled';
create index portal_ownership_updated on public.portal_ownership_tasks(updated_at desc);
create table public.portal_ownership_task_events (
 id uuid primary key,task_id uuid not null references public.portal_ownership_tasks(id),actor_id uuid not null references public.portal_accounts(user_id),
 status text not null,evidence_reference text not null check(length(trim(evidence_reference)) between 3 and 200),
 expected_revision integer not null,created_at timestamptz not null default now()
);
create index portal_ownership_events_task on public.portal_ownership_task_events(task_id,created_at desc);
alter table public.portal_ownership_tasks enable row level security;
alter table public.portal_ownership_task_events enable row level security;
revoke all on public.portal_ownership_tasks,public.portal_ownership_task_events from public,anon,authenticated,service_role;
grant select on public.portal_ownership_tasks,public.portal_ownership_task_events to service_role;
create function public.portal_create_ownership_task(p_id uuid,p_actor uuid,p_domain text,p_kind text,p_reference text,p_baseline jsonb)
returns public.portal_ownership_tasks language plpgsql security definer set search_path='' as $$
declare r public.portal_ownership_tasks;
begin
 if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required';end if;
 if exists(select 1 from public.portal_domains where name=p_domain and protected) then raise exception 'Protected domain';end if;
 if (p_baseline->>'lifecycle_status') is distinct from 'registered' or coalesce(p_baseline->>'contact_id','')='' or coalesce(p_baseline->>'expiration_date','')='' then raise exception 'Verified baseline required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into r from public.portal_ownership_tasks where id=p_id;
 if found then
  if r.created_by<>p_actor or r.domain<>p_domain or r.kind<>p_kind or r.request_reference<>p_reference then raise exception 'Task request conflict';end if;
  return r;
 end if;
 insert into public.portal_ownership_tasks(id,domain,kind,request_reference,baseline,created_by) values(p_id,p_domain,p_kind,p_reference,p_baseline,p_actor) returning * into r;
 insert into public.portal_ownership_task_events(id,task_id,actor_id,status,evidence_reference,expected_revision) values(p_id,p_id,p_actor,r.status,p_reference,0);
 insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'ownership_review_opened',p_id::text,jsonb_build_object('domain',p_domain,'kind',p_kind,'registrar_operation_performed',false));
 return r;
end $$;
create function public.portal_progress_ownership_task(p_id uuid,p_actor uuid,p_task uuid,p_revision integer,p_status text,p_reference text)
returns public.portal_ownership_tasks language plpgsql security definer set search_path='' as $$
declare r public.portal_ownership_tasks;e public.portal_ownership_task_events;
begin
 if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into e from public.portal_ownership_task_events where id=p_id;
 if found then
  if e.task_id<>p_task or e.actor_id<>p_actor or e.expected_revision<>p_revision or e.status<>p_status or e.evidence_reference<>p_reference then raise exception 'Task request conflict';end if;
  select * into r from public.portal_ownership_tasks where id=p_task;return r;
 end if;
 select * into r from public.portal_ownership_tasks where id=p_task for update;
 if not found or r.revision<>p_revision then raise exception 'Task changed, refresh before updating';end if;
 if r.status='cancelled' or p_status=r.status or p_status not in ('awaiting_consent','consent_recorded','awaiting_registrar_confirmation','review_required','cancelled') then raise exception 'Invalid task transition';end if;
 if p_status='awaiting_registrar_confirmation' and r.status<>'consent_recorded' then raise exception 'Record consent before registrar follow-up';end if;
 update public.portal_ownership_tasks set status=p_status,revision=revision+1,updated_at=now() where id=p_task returning * into r;
 insert into public.portal_ownership_task_events(id,task_id,actor_id,status,evidence_reference,expected_revision) values(p_id,p_task,p_actor,p_status,p_reference,p_revision);
 insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'ownership_review_progress',p_task::text,jsonb_build_object('status',p_status,'revision',r.revision,'registrar_operation_performed',false,'legal_transfer_verified',false));
 return r;
end $$;
revoke all on function public.portal_create_ownership_task(uuid,uuid,text,text,text,jsonb),public.portal_progress_ownership_task(uuid,uuid,uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.portal_create_ownership_task(uuid,uuid,text,text,text,jsonb),public.portal_progress_ownership_task(uuid,uuid,uuid,integer,text,text) to service_role;
insert into public.portal_schema_releases(version) values('202610140002');
commit;
