begin;
-- Additive migration. A failed validation rolls back every change.
alter table public.portal_clients add column updated_at timestamptz not null default now(),
  add column created_by uuid references public.portal_accounts(user_id),
  add column service_status text not null default 'onboarding';
alter table public.portal_accounts add column updated_at timestamptz not null default now(),
  add column invitation_status text not null default 'not_recorded',
  add column last_login_at timestamptz;
alter table public.portal_domain_assignments add column assigned_by uuid references public.portal_accounts(user_id),
  add column audit_reason text, add column updated_at timestamptz not null default now();
alter table public.portal_domains add column source_version text;
alter table public.portal_orders add column fulfilled_domain_id uuid references public.portal_domains(id);

-- Matching UUIDs alone are insufficient when a child also carries client_id.
alter table public.portal_quotes add constraint portal_quote_identity unique(id,client_id,domain,kind,retail_minor);
alter table public.portal_orders add constraint portal_order_client unique(id,client_id),
  add constraint portal_order_quote_identity foreign key(quote_id,client_id,domain,kind,amount_minor)
  references public.portal_quotes(id,client_id,domain,kind,retail_minor);
alter table public.portal_payments add constraint portal_payment_owner foreign key(order_id,client_id) references public.portal_orders(id,client_id);
alter table public.portal_invoices add constraint portal_invoice_owner foreign key(order_id,client_id) references public.portal_orders(id,client_id);
alter table public.portal_requests add constraint portal_request_client unique(id,client_id);
alter table public.portal_messages add constraint portal_message_owner foreign key(request_id,client_id) references public.portal_requests(id,client_id);
alter table public.portal_domain_assignments add constraint portal_assignment_client unique(domain_id,client_id);
alter table public.portal_websites add constraint portal_website_domain_owner foreign key(domain_id,client_id) references public.portal_domain_assignments(domain_id,client_id);
alter table public.portal_orders add constraint portal_fulfilled_domain_owner foreign key(fulfilled_domain_id,client_id) references public.portal_domain_assignments(domain_id,client_id);
alter table public.portal_quotes add constraint portal_renewal_domain_required check(kind<>'renewal' or (domain_id is not null and expiration_snapshot is not null));

create function public.portal_touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger portal_clients_updated before update on public.portal_clients for each row execute function public.portal_touch_updated_at();
create trigger portal_accounts_updated before update on public.portal_accounts for each row execute function public.portal_touch_updated_at();
create trigger portal_assignments_updated before update on public.portal_domain_assignments for each row execute function public.portal_touch_updated_at();

create table public.portal_provisioning (
  id uuid primary key, actor_id uuid not null references public.portal_accounts(user_id),
  email text not null unique check(email=lower(trim(email))), input jsonb not null,
  state text not null default 'reserved' check(state in ('reserved','committed','inviting','invited','review_required')),
  auth_user_id uuid references auth.users(id), client_id uuid references public.portal_clients(id),
  last_error text, invitation_attempted_at timestamptz, completed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create trigger portal_provisioning_updated before update on public.portal_provisioning for each row execute function public.portal_touch_updated_at();
create table public.portal_backup_runs (
  id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('backup','restore_drill')),
  status text not null check(status in ('running','completed','failed')),
  started_at timestamptz not null default now(), completed_at timestamptz,
  bytes bigint, artifact_sha256 text, destination_ref text, includes_auth boolean not null default false,
  includes_objects boolean not null default false, detail jsonb not null default '{}'
);
create table public.portal_schema_releases(version text primary key, applied_at timestamptz not null default now());
insert into public.portal_schema_releases(version) values('202610120001'),('202610120002'),('202610120003');
do $$ declare t text; begin
  foreach t in array array['portal_provisioning','portal_backup_runs','portal_schema_releases'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy admin_read on public.%I for select to authenticated using(public.portal_admin())',t);
  end loop;
end $$;

create function public.portal_begin_provisioning(p_id uuid,p_actor uuid,p_input jsonb)
returns public.portal_provisioning language plpgsql security definer set search_path='' as $$
declare r public.portal_provisioning; e text:=lower(trim(p_input->>'email'));
begin
  if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required'; end if;
  if e is null or e='' or e is distinct from p_input->>'email' then raise exception 'Normalized email required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(e,0));
  select * into r from public.portal_provisioning where id=p_id or email=e for update;
  if found then
    if r.input is distinct from p_input then raise exception 'Provisioning input conflict'; end if;
    return r;
  end if;
  if exists(select 1 from public.portal_accounts where approved_email=e) then raise exception 'Account already exists'; end if;
  insert into public.portal_provisioning(id,actor_id,email,input) values(p_id,p_actor,e,p_input) returning * into r;
  return r;
end $$;

-- Internal Auth lookup is narrowly scoped to a reserved provisioning request.
-- No passwords, hashes, tokens or arbitrary Auth rows are returned.
create function public.portal_provisioning_identity(p_id uuid) returns uuid
language sql security definer set search_path='' as $$
  select u.id from auth.users u join public.portal_provisioning p on lower(u.email)=p.email
  where p.id=p_id and u.raw_app_meta_data->>'portal_provisioning_id'=p.id::text
$$;

create function public.portal_commit_provisioning(p_id uuid,p_user uuid)
returns public.portal_provisioning language plpgsql security definer set search_path='' as $$
declare r public.portal_provisioning; c uuid; d uuid; w jsonb;
begin
  select * into r from public.portal_provisioning where id=p_id for update;
  if not found then raise exception 'Unknown provisioning request'; end if;
  if r.client_id is not null then
    if r.auth_user_id is distinct from p_user then raise exception 'Identity conflict'; end if;
    return r;
  end if;
  if public.portal_provisioning_identity(p_id) is distinct from p_user then raise exception 'Auth identity not verified'; end if;
  if not exists(select 1 from public.portal_accounts where user_id=r.actor_id and role='super_admin' and active) then raise exception 'Administrator no longer active'; end if;
  c:=nullif(r.input->>'existing_client_id','')::uuid;
  if c is null then
    insert into public.portal_clients(name,business_name,status,created_by)
    values(r.input->>'name',r.input->>'business_name',r.input->>'status',r.actor_id) returning id into c;
  elsif not exists(select 1 from public.portal_clients where id=c and status='active') then raise exception 'Client unavailable'; end if;
  insert into public.portal_accounts(user_id,approved_email,name,role,active,invitation_status)
  values(p_user,r.email,r.input->>'name','client',r.input->>'status'='active','pending');
  insert into public.portal_memberships(user_id,client_id) values(p_user,c);
  d:=nullif(r.input->>'domain_id','')::uuid;
  if d is not null then
    if not exists(select 1 from public.portal_domains where id=d and not protected and name<>'stackendbox.com' and not reconciliation_required and last_synced_at is not null) then raise exception 'Domain inventory requires verification'; end if;
    insert into public.portal_domain_assignments(domain_id,client_id,holder_arrangement,legal_holder,assigned_by,audit_reason)
    values(d,c,r.input->>'holder_arrangement',r.input->>'legal_holder',r.actor_id,'Assigned during client provisioning');
  end if;
  w:=r.input->'website';
  if w is not null and w<>'null'::jsonb then
    insert into public.portal_websites(client_id,domain_id,name,url) values(c,d,w->>'name',w->>'url');
  end if;
  insert into public.portal_audit(actor_id,action,target_id,detail)
  values(r.actor_id,'client_provisioned',c::text,jsonb_build_object('request_id',r.id,'auth_user_id',p_user));
  update public.portal_provisioning set auth_user_id=p_user,client_id=c,state='committed',last_error=null,completed_at=now() where id=p_id returning * into r;
  return r;
end $$;
revoke all on function public.portal_begin_provisioning(uuid,uuid,jsonb),public.portal_provisioning_identity(uuid),public.portal_commit_provisioning(uuid,uuid) from public,anon,authenticated;
grant execute on function public.portal_begin_provisioning(uuid,uuid,jsonb),public.portal_provisioning_identity(uuid),public.portal_commit_provisioning(uuid,uuid) to service_role;
create view public.portal_admin_identities as
select a.user_id,a.approved_email,a.name,a.role,a.active,a.invitation_status,
  u.email_confirmed_at,u.last_sign_in_at,(lower(u.email)=a.approved_email) as email_consistent
from public.portal_accounts a join auth.users u on u.id=a.user_id;
revoke all on public.portal_admin_identities from public,anon,authenticated;
grant select on public.portal_admin_identities to service_role;
commit;
