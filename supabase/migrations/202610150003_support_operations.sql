begin;
create table public.portal_support_meta (
 request_id uuid primary key references public.portal_requests(id),
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 assigned_to uuid references public.portal_accounts(user_id), escalated boolean not null default false,
 revision integer not null default 0, updated_by uuid not null references public.portal_accounts(user_id), updated_at timestamptz not null default now()
);
create index portal_support_assignee on public.portal_support_meta(assigned_to,request_id);
create index portal_requests_queue on public.portal_requests(created_at desc,id desc);
create table public.portal_support_notes (
 id uuid primary key, request_id uuid not null references public.portal_requests(id), author_id uuid not null references public.portal_accounts(user_id),
 body text not null check(length(trim(body)) between 1 and 5000), created_at timestamptz not null default now()
);
create index portal_support_notes_request on public.portal_support_notes(request_id,created_at,id);
create table public.portal_support_changes (
 id uuid primary key, request_id uuid not null references public.portal_requests(id), actor_id uuid not null references public.portal_accounts(user_id),
 input jsonb not null, created_at timestamptz not null default now()
);
create index portal_support_changes_request on public.portal_support_changes(request_id,created_at,id);
alter table public.portal_support_meta enable row level security;
alter table public.portal_support_notes enable row level security;
alter table public.portal_support_changes enable row level security;
revoke all on public.portal_support_meta,public.portal_support_notes,public.portal_support_changes from public,anon,authenticated,service_role;
grant select on public.portal_support_meta,public.portal_support_notes,public.portal_support_changes to authenticated,service_role;
create policy support_read on public.portal_support_meta for select to authenticated using(public.portal_has_permission('support.read'));
create policy support_read on public.portal_support_notes for select to authenticated using(public.portal_has_permission('support.read'));
create policy support_read on public.portal_support_changes for select to authenticated using(public.portal_has_permission('support.read'));
create function public.portal_support_operators() returns table(id uuid,name text) language sql stable security definer set search_path='' as $$
 select a.user_id,a.name from public.portal_accounts a where a.role in ('super_admin','staff') and public.portal_actor_can(a.user_id,'support.write') order by a.name,a.user_id limit 200
$$;
revoke all on function public.portal_support_operators() from public,anon,authenticated;
grant execute on function public.portal_support_operators() to service_role;
create function public.portal_support_change(p_id uuid,p_actor uuid,p_request uuid,p_revision integer,p_priority text,p_assignee uuid,p_escalated boolean,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare prior public.portal_support_changes;m public.portal_support_meta;payload jsonb;begin
 if not public.portal_actor_can(p_actor,'support.write') then raise exception 'Support permission required';end if;
 payload=jsonb_build_object('revision',p_revision,'priority',p_priority,'assigned_to',p_assignee,'escalated',p_escalated,'status',p_status);
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into prior from public.portal_support_changes where id=p_id;
 if found then if prior.actor_id<>p_actor or prior.request_id<>p_request or prior.input<>payload then raise exception 'Support request conflict';end if;return;end if;
 perform 1 from public.portal_requests where id=p_request for update;
 if not found then raise exception 'Support request missing';end if;
 select * into m from public.portal_support_meta where request_id=p_request;
 if coalesce(m.revision,0)<>p_revision then raise exception 'Support revision changed';end if;
 if p_assignee is not null and not public.portal_actor_can(p_assignee,'support.write') then raise exception 'Support assignee unavailable';end if;
 if p_status not in ('submitted','under_review','quoted','approved','in_progress','completed','closed') then raise exception 'Support status invalid';end if;
 insert into public.portal_support_meta(request_id,priority,assigned_to,escalated,revision,updated_by)
 values(p_request,p_priority,p_assignee,p_escalated,p_revision+1,p_actor)
 on conflict(request_id) do update set priority=excluded.priority,assigned_to=excluded.assigned_to,escalated=excluded.escalated,revision=excluded.revision,updated_by=p_actor,updated_at=now();
 update public.portal_requests set status=p_status,updated_at=now() where id=p_request;
 insert into public.portal_support_changes(id,request_id,actor_id,input) values(p_id,p_request,p_actor,payload);
 insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'support_workflow_updated',p_request::text,jsonb_build_object('operation_id',p_id,'status',p_status,'priority',p_priority,'escalated',p_escalated));
end $$;
create function public.portal_support_note(p_id uuid,p_actor uuid,p_request uuid,p_body text)
returns void language plpgsql security definer set search_path='' as $$
declare prior public.portal_support_notes;begin
 if not public.portal_actor_can(p_actor,'support.write') then raise exception 'Support permission required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into prior from public.portal_support_notes where id=p_id;
 if found then if prior.request_id<>p_request or prior.author_id<>p_actor or prior.body<>p_body then raise exception 'Support request conflict';end if;return;end if;
 insert into public.portal_support_notes(id,request_id,author_id,body) values(p_id,p_request,p_actor,p_body);
 insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'support_internal_note_saved',p_request::text,jsonb_build_object('note_id',p_id));
end $$;
revoke all on function public.portal_support_change(uuid,uuid,uuid,integer,text,uuid,boolean,text),public.portal_support_note(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.portal_support_change(uuid,uuid,uuid,integer,text,uuid,boolean,text),public.portal_support_note(uuid,uuid,uuid,text) to service_role;
insert into public.portal_schema_releases(version) values('202610150003');
commit;
