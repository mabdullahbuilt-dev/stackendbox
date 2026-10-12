begin;

create table public.portal_acquisition_requests (
  id uuid primary key, client_id uuid not null references public.portal_clients(id),
  domain text not null check(domain=lower(domain) and domain<>'stackendbox.com'),
  retail_minor bigint not null check(retail_minor>0), currency text not null default 'usd' check(currency='usd'),
  customer_approval text not null check(length(trim(customer_approval))>0),
  holder_arrangement text not null check(holder_arrangement in ('client_owned','licensed')),
  legal_holder text not null check(length(trim(legal_holder))>0),
  pricing_id uuid references public.portal_pricing(id),
  status text not null default 'awaiting_payment' check(status in ('awaiting_payment','payment_recorded','review_required','cancelled')),
  created_by uuid not null references public.portal_accounts(user_id), created_at timestamptz not null default now(),
  unique(id,client_id)
);
create table public.portal_external_payments (
  id uuid primary key, client_id uuid not null references public.portal_clients(id),
  acquisition_id uuid, source text not null check(source in ('bank_transfer','cash','external_processor')),
  transaction_reference text not null check(length(trim(transaction_reference))>0),
  amount_minor bigint not null check(amount_minor>0), currency text not null default 'usd' check(currency='usd'),
  paid_at timestamptz not null, evidence text not null check(length(trim(evidence))>0),
  reconciliation_status text not null check(reconciliation_status in ('unreconciled','verified')),
  recorded_by uuid not null references public.portal_accounts(user_id), created_at timestamptz not null default now(),
  unique(source,transaction_reference),
  foreign key(acquisition_id,client_id) references public.portal_acquisition_requests(id,client_id)
);
create table public.portal_service_entitlements (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  website_id uuid references public.portal_websites(id),
  service text not null check(service in ('Website development','Website hosting','Managed database','Website performance optimization','Integrations','Maintenance','Technical support')),
  description text not null, status text not null check(status in ('included','provisioned','suspended')),
  created_by uuid not null references public.portal_accounts(user_id), created_at timestamptz not null default now()
);
alter table public.portal_websites add constraint portal_website_client unique(id,client_id);
alter table public.portal_service_entitlements add constraint portal_service_website_owner foreign key(website_id,client_id) references public.portal_websites(id,client_id);

create function public.portal_external_payment_guard() returns trigger language plpgsql set search_path='' as $$
declare expected bigint;
begin
  select retail_minor into expected from public.portal_acquisition_requests where id=new.acquisition_id and client_id=new.client_id for update;
  if expected is null or expected<>new.amount_minor then raise exception 'External payment must match the approved customer quote'; end if;
  if new.paid_at>now() then raise exception 'Payment date cannot be in the future'; end if;
  return new;
end $$;
create trigger portal_external_payment_guard before insert on public.portal_external_payments for each row execute function public.portal_external_payment_guard();
create function public.portal_external_payment_state() returns trigger language plpgsql set search_path='' as $$
begin
  if new.reconciliation_status='verified' then
    update public.portal_acquisition_requests set status='payment_recorded' where id=new.acquisition_id and status='awaiting_payment';
  end if;
  return new;
end $$;
create trigger portal_external_payment_state after insert on public.portal_external_payments for each row execute function public.portal_external_payment_state();

alter table public.portal_acquisition_requests enable row level security;
alter table public.portal_external_payments enable row level security;
alter table public.portal_service_entitlements enable row level security;
revoke all on public.portal_acquisition_requests, public.portal_external_payments, public.portal_service_entitlements from anon, authenticated;
grant select on public.portal_acquisition_requests, public.portal_service_entitlements to authenticated;
grant select(id,client_id,acquisition_id,source,transaction_reference,amount_minor,currency,paid_at,reconciliation_status,created_at) on public.portal_external_payments to authenticated;
grant all on public.portal_acquisition_requests, public.portal_external_payments, public.portal_service_entitlements to service_role;
create policy admin_read on public.portal_acquisition_requests for select to authenticated using(public.portal_admin());
create policy tenant_read on public.portal_external_payments for select to authenticated using(public.portal_access(client_id));
create policy tenant_read on public.portal_service_entitlements for select to authenticated using(public.portal_access(client_id));

-- All callers use service_role after the application's role and MFA checks.
-- The transaction saves assignment and audit together and preserves retries.
create function public.portal_assign_verified_domain(p_domain uuid,p_client uuid,p_holder text,p_arrangement text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare d public.portal_domains; a public.portal_domain_assignments;
begin
  if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required'; end if;
  if not exists(select 1 from public.portal_clients where id=p_client and status='active') then raise exception 'Active client required'; end if;
  select * into d from public.portal_domains where id=p_domain for update;
  if not found or d.protected or d.name='stackendbox.com' or d.lifecycle_status<>'registered' or d.expiration_date is null or d.reconciliation_required or d.last_synced_at is null or d.last_synced_at<now()-interval '5 minutes' then raise exception 'Verified registrar record required'; end if;
  if trim(p_holder)='' or p_arrangement not in ('client_owned','licensed') then raise exception 'Holder arrangement required'; end if;
  select * into a from public.portal_domain_assignments where domain_id=p_domain;
  if found then
    if a.client_id=p_client and a.legal_holder=p_holder and a.holder_arrangement=p_arrangement then return; end if;
    raise exception 'Domain already assigned, ownership review required';
  end if;
  insert into public.portal_domain_assignments(domain_id,client_id,legal_holder,holder_arrangement,assigned_by,audit_reason)
    values(p_domain,p_client,p_holder,p_arrangement,p_actor,'Contractual rights and holder arrangement confirmed by administrator');
  insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'domain_assigned',p_domain::text,jsonb_build_object('client_id',p_client));
end $$;
revoke all on function public.portal_assign_verified_domain(uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.portal_assign_verified_domain(uuid,uuid,text,text,uuid) to service_role;
insert into public.portal_schema_releases(version) values('202610120004');
commit;
