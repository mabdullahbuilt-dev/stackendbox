begin;
-- Safe rollout: no staff privilege is active until a separately reviewed enable.
create table public.portal_staff_rollout(id boolean primary key default true check(id),enabled boolean not null default false);
insert into public.portal_staff_rollout(id,enabled) values(true,false);
create table public.portal_staff_roles(role text primary key,permissions text[] not null);
insert into public.portal_staff_roles values
('operations_admin',array['clients.read','clients.write','domains.read','domains.assign','services.read','services.write','billing.read','billing.write','support.read','support.write','operations.read','operations.recover']),
('domain_manager',array['clients.read','clients.write','domains.read','domains.assign']),
('billing_manager',array['clients.read','domains.read','billing.read','billing.write']),
('support_staff',array['clients.read','support.read','support.write']),
('auditor',array['clients.read','domains.read','services.read','billing.read','support.read','operations.read']);
create table public.portal_staff_grants(user_id uuid primary key references public.portal_accounts(user_id),role text not null references public.portal_staff_roles(role),active boolean not null default false,revision integer not null default 0,updated_by uuid not null references public.portal_accounts(user_id),updated_at timestamptz not null default now());
create table public.portal_staff_invites(id uuid primary key,email text not null unique check(email=lower(trim(email))),name text not null,role text not null references public.portal_staff_roles(role),actor_id uuid not null references public.portal_accounts(user_id),user_id uuid references auth.users(id),state text not null default 'reserved' check(state in ('reserved','identity_created','dispatching','invited','review_required')),provider_message_id text,created_at timestamptz not null default now());
create table public.portal_staff_changes(id uuid primary key,actor_id uuid not null references public.portal_accounts(user_id),target_id uuid not null references public.portal_accounts(user_id),role text not null,active boolean not null,expected_revision integer not null,created_at timestamptz not null default now());
alter table public.portal_staff_rollout enable row level security;
alter table public.portal_staff_roles enable row level security;
alter table public.portal_staff_grants enable row level security;
alter table public.portal_staff_invites enable row level security;
alter table public.portal_staff_changes enable row level security;
revoke all on public.portal_staff_rollout,public.portal_staff_roles,public.portal_staff_grants,public.portal_staff_invites,public.portal_staff_changes from public,anon,authenticated;
grant select,insert,update on public.portal_staff_invites to service_role;
grant select on public.portal_staff_rollout,public.portal_staff_roles,public.portal_staff_grants,public.portal_staff_changes to service_role;
create function public.portal_actor_can(actor uuid,cap text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portal_accounts a join auth.users u on u.id=a.user_id where a.user_id=actor and a.active and u.email_confirmed_at is not null and lower(u.email)=a.approved_email and (u.banned_until is null or u.banned_until<now()) and
 (a.role='super_admin' or (a.role='staff' and exists(select 1 from public.portal_staff_grants g join public.portal_staff_roles r on r.role=g.role cross join public.portal_staff_rollout s where g.user_id=a.user_id and g.active and s.enabled and cap=any(r.permissions)))))
$$;
create function public.portal_has_permission(cap text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(auth.jwt()->>'aal'='aal2' and public.portal_role() in ('super_admin','staff') and public.portal_actor_can(auth.uid(),cap),false)
$$;
revoke all on function public.portal_actor_can(uuid,text) from public,anon,authenticated;
grant execute on function public.portal_actor_can(uuid,text) to service_role;
revoke all on function public.portal_has_permission(text) from public,anon;
grant execute on function public.portal_has_permission(text) to authenticated,service_role;
create function public.portal_my_permissions() returns text[] language sql stable security definer set search_path='' as $$
 select coalesce((select r.permissions from public.portal_staff_grants g join public.portal_staff_roles r on r.role=g.role cross join public.portal_staff_rollout s where g.user_id=auth.uid() and g.active and s.enabled and public.portal_role()='staff' and auth.jwt()->>'aal'='aal2'),array[]::text[])
$$;
revoke all on function public.portal_my_permissions() from public,anon;
grant execute on function public.portal_my_permissions() to authenticated;
-- Staff membership must never bypass role-specific table permissions.
create or replace function public.portal_access(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.portal_admin() or (public.portal_role()='client' and exists(select 1 from public.portal_memberships m join public.portal_clients c on c.id=m.client_id where m.user_id=auth.uid() and m.client_id=target and c.status='active')),false)
$$;
do $$ declare t text;cap text;begin
 for t,cap in select * from (values
 ('clients','clients.read'),('memberships','clients.read'),('domains','domains.read'),('domain_assignments','domains.read'),
 ('websites','services.read'),('service_entitlements','services.read'),('quotes','billing.read'),('orders','billing.read'),('payments','billing.read'),('invoices','billing.read'),('external_payments','billing.read'),
 ('requests','support.read'),('messages','support.read'),('pricing','billing.read'),('quote_evidence','billing.read'),('ledger','billing.read'),('email_outbox','operations.read'),('audit','operations.read'),('domain_operations','domains.read')) x(t,cap)
 loop execute format('grant select on public.portal_%I to authenticated',t);execute format('create policy staff_read on public.portal_%I for select to authenticated using(public.portal_role()=''staff'' and public.portal_has_permission(%L))',t,cap);end loop;
end $$;
create policy staff_client_accounts on public.portal_accounts for select to authenticated using(role='client' and public.portal_role()='staff' and public.portal_has_permission('clients.read'));
alter policy service_invoice_visibility on public.portal_invoices using(public.portal_admin() or public.portal_has_permission('billing.read') or order_id is not null or status<>'draft');
create function public.portal_change_staff(p_id uuid,p_actor uuid,p_target uuid,p_role text,p_active boolean,p_revision integer) returns void language plpgsql security definer set search_path='' as $$
declare prior public.portal_staff_changes;g public.portal_staff_grants;begin
 if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Owner required';end if;
 if not exists(select 1 from public.portal_accounts where user_id=p_target and role='staff') or p_target=p_actor then raise exception 'Staff target required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_target::text,0));
 select * into prior from public.portal_staff_changes where id=p_id;
 if found then if prior.actor_id<>p_actor or prior.target_id<>p_target or prior.role<>p_role or prior.active<>p_active or prior.expected_revision<>p_revision then raise exception 'Staff request conflict';end if;return;end if;
 select * into g from public.portal_staff_grants where user_id=p_target for update;
 if coalesce(g.revision,0)<>p_revision then raise exception 'Staff revision changed';end if;
 insert into public.portal_staff_grants(user_id,role,active,revision,updated_by) values(p_target,p_role,p_active,p_revision+1,p_actor) on conflict(user_id) do update set role=excluded.role,active=excluded.active,revision=excluded.revision,updated_by=p_actor,updated_at=now();
 update public.portal_accounts set active=p_active where user_id=p_target and role='staff';
 insert into public.portal_staff_changes(id,actor_id,target_id,role,active,expected_revision) values(p_id,p_actor,p_target,p_role,p_active,p_revision);
 insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'staff_permissions_changed',p_target::text,jsonb_build_object('role',p_role,'active',p_active,'revision',p_revision+1));
end $$;
revoke all on function public.portal_change_staff(uuid,uuid,uuid,text,boolean,integer) from public,anon,authenticated;
grant execute on function public.portal_change_staff(uuid,uuid,uuid,text,boolean,integer) to service_role;
create function public.portal_reserve_staff_invite(p_id uuid,p_actor uuid,p_email text,p_name text,p_role text) returns public.portal_staff_invites language plpgsql security definer set search_path='' as $$
declare r public.portal_staff_invites;begin
 if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Owner required';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_email,0));
 select * into r from public.portal_staff_invites where id=p_id or email=p_email for update;
 if found then if r.id<>p_id or r.email<>p_email or r.name<>p_name or r.role<>p_role or r.actor_id<>p_actor then raise exception 'Staff request conflict';end if;return r;end if;
 if exists(select 1 from public.portal_accounts where approved_email=p_email) or exists(select 1 from auth.users where lower(email)=p_email) then raise exception 'Existing identity requires review';end if;
 insert into public.portal_staff_invites(id,email,name,role,actor_id) values(p_id,p_email,p_name,p_role,p_actor) returning * into r;return r;
end $$;
create function public.portal_staff_invite_identity(p_id uuid) returns uuid language sql security definer set search_path='' as $$
 select u.id from public.portal_staff_invites i join auth.users u on lower(u.email)=i.email where i.id=p_id and u.raw_app_meta_data->>'portal_staff_invite_id'=i.id::text
$$;
create function public.portal_commit_staff_invite(p_id uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare r public.portal_staff_invites;begin
 select * into r from public.portal_staff_invites where id=p_id for update;
 if not found or not exists(select 1 from public.portal_accounts where user_id=r.actor_id and role='super_admin' and active) then raise exception 'Owner required';end if;
 if r.user_id is not null then if r.user_id<>p_user then raise exception 'Staff request conflict';end if;return;end if;
 if public.portal_staff_invite_identity(p_id) is distinct from p_user then raise exception 'Staff identity mismatch';end if;
 insert into public.portal_accounts(user_id,approved_email,name,role,active,invitation_status) values(p_user,r.email,r.name,'staff',true,'pending');
 insert into public.portal_staff_grants(user_id,role,active,updated_by) values(p_user,r.role,true,r.actor_id);
 update public.portal_staff_invites set user_id=p_user,state='identity_created' where id=p_id;
 insert into public.portal_audit(actor_id,action,target_id,detail) values(r.actor_id,'staff_identity_prepared',p_user::text,jsonb_build_object('role',r.role,'invite_id',r.id,'rollout_enabled',(select enabled from public.portal_staff_rollout where id)));
end $$;
revoke all on function public.portal_reserve_staff_invite(uuid,uuid,text,text,text),public.portal_staff_invite_identity(uuid),public.portal_commit_staff_invite(uuid,uuid) from public,anon,authenticated;
grant execute on function public.portal_reserve_staff_invite(uuid,uuid,text,text,text),public.portal_staff_invite_identity(uuid),public.portal_commit_staff_invite(uuid,uuid) to service_role;
-- Existing atomic provisioning/handoff functions retain their transaction and
-- uniqueness checks. Replace only the previous owner-only actor predicates.
do $$ declare f regprocedure;source text;before_text text;after_text text;begin
 for f,before_text,after_text in select * from (values
 ('public.portal_begin_provisioning(uuid,uuid,jsonb)'::regprocedure,'not exists(select 1 from public.portal_accounts where user_id=p_actor and role=''super_admin'' and active)','not public.portal_actor_can(p_actor,''clients.write'')'),
 ('public.portal_commit_provisioning(uuid,uuid)'::regprocedure,'not exists(select 1 from public.portal_accounts where user_id=r.actor_id and role=''super_admin'' and active)','not public.portal_actor_can(r.actor_id,''clients.write'')'),
 ('public.portal_commit_domain_handoff(uuid,uuid,uuid,uuid,text,text,text)'::regprocedure,'not exists(select 1 from public.portal_accounts where user_id=p_actor and role=''super_admin'' and active)','not public.portal_actor_can(p_actor,''domains.assign'')'),
 ('public.portal_assign_verified_domain(uuid,uuid,text,text,uuid)'::regprocedure,'not exists(select 1 from public.portal_accounts where user_id=p_actor and role=''super_admin'' and active)','not public.portal_actor_can(p_actor,''domains.assign'')'),
 ('public.portal_create_service_invoice(uuid,uuid,bigint,text,uuid)'::regprocedure,'not exists(select 1 from public.portal_accounts where user_id=p_actor and role=''super_admin'' and active)','not public.portal_actor_can(p_actor,''billing.write'')'),
 ('public.portal_transition_service_invoice(uuid,text,uuid)'::regprocedure,'not exists(select 1 from public.portal_accounts where user_id=p_actor and role=''super_admin'' and active)','not public.portal_actor_can(p_actor,''billing.write'')')) x(f,b,a)
 loop source:=pg_get_functiondef(f);if position(before_text in source)=0 then raise exception 'Unexpected actor predicate, manual review required';end if;execute replace(source,before_text,after_text);end loop;
end $$;
insert into public.portal_schema_releases(version) values('202610150001');
commit;
