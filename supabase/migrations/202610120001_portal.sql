begin;

create table public.portal_clients (
  id uuid primary key default gen_random_uuid(), name text not null, business_name text not null,
  status text not null default 'active' check (status in ('active','suspended','deactivated')),
  created_at timestamptz not null default now()
);
create table public.portal_accounts (
  user_id uuid primary key references auth.users(id), approved_email text not null unique,
  name text not null, role text not null check (role in ('super_admin','staff','client')),
  active boolean not null default true, created_at timestamptz not null default now(),
  check (approved_email = lower(trim(approved_email)))
);
create table public.portal_memberships (
  user_id uuid references public.portal_accounts(user_id), client_id uuid references public.portal_clients(id),
  primary key (user_id,client_id)
);
create index portal_memberships_client on public.portal_memberships(client_id);

-- Consult the authoritative Auth row as well as the JWT. A changed email or
-- revoked account cannot keep using an old token to read tenant records.
create function public.portal_role() returns text language sql stable security definer set search_path='' as $$
  select a.role from public.portal_accounts a join auth.users u on u.id=a.user_id
  where a.user_id=auth.uid() and a.active and u.email_confirmed_at is not null
    and lower(u.email)=a.approved_email and lower(auth.jwt()->>'email')=a.approved_email
    and (u.banned_until is null or u.banned_until < now())
$$;
create function public.portal_admin() returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(public.portal_role()='super_admin' and auth.jwt()->>'aal'='aal2',false)
$$;
create function public.portal_access(target uuid) returns boolean language sql stable security definer set search_path='' as $$
  select coalesce(public.portal_admin() or (
    public.portal_role() in ('client','staff') and exists (
      select 1 from public.portal_memberships m join public.portal_clients c on c.id=m.client_id
      where m.user_id=auth.uid() and m.client_id=target and c.status='active'
    )),false)
$$;
revoke all on function public.portal_role(), public.portal_admin(), public.portal_access(uuid) from public, anon;
grant execute on function public.portal_role(), public.portal_admin(), public.portal_access(uuid) to authenticated, service_role;

create table public.portal_domains (
  id uuid primary key default gen_random_uuid(), provider text not null default 'spaceship',
  provider_account text not null default 'primary', name text not null,
  protected boolean not null default false, lifecycle_status text not null,
  registration_date timestamptz, expiration_date timestamptz, auto_renew boolean,
  verification_status text, nameservers jsonb not null default '{}', security jsonb not null default '{}',
  last_synced_at timestamptz, reconciliation_required boolean not null default false,
  unique(provider,provider_account,name), check(name=lower(name)),
  check(name <> 'stackendbox.com' or protected)
);
create table public.portal_domain_assignments (
  domain_id uuid primary key references public.portal_domains(id), client_id uuid not null references public.portal_clients(id),
  holder_arrangement text not null check (holder_arrangement in ('client_owned','licensed')),
  legal_holder text not null, manual_renewal boolean not null default true,
  assigned_at timestamptz not null default now()
);
create index portal_assignments_client on public.portal_domain_assignments(client_id);
create function public.portal_protect_domain() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.portal_domains where id=new.domain_id and (protected or name='stackendbox.com')) then
    raise exception 'Protected company domain cannot be assigned';
  end if;
  return new;
end $$;
create trigger portal_assignment_guard before insert or update on public.portal_domain_assignments for each row execute function public.portal_protect_domain();

create table public.portal_websites (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  domain_id uuid references public.portal_domains(id), name text not null, url text not null check(url ~ '^https://'),
  status text not null default 'Managed by StackEndBox', project_status text not null default 'active',
  last_verified_at timestamptz, created_at timestamptz not null default now()
);
create table public.portal_pricing (
  id uuid primary key default gen_random_uuid(), domain text not null, kind text not null check(kind in ('registration','renewal')),
  supplier_minor bigint not null check(supplier_minor>0), fees_minor bigint not null default 0 check(fees_minor>=0),
  currency text not null default 'usd' check(currency='usd'), years int not null default 1 check(years=1),
  source text not null, verified_at timestamptz not null, valid_until timestamptz not null,
  premium boolean not null, requirements_verified boolean not null default false,
  contact_ids jsonb not null default '{}', verified_by uuid not null references public.portal_accounts(user_id),
  created_at timestamptz not null default now(), check(valid_until>verified_at)
);
create table public.portal_settings (
  id boolean primary key default true check(id), allowed_tlds text[] not null default '{}',
  max_supplier_minor bigint not null default 0 check(max_supplier_minor>=0),
  tolerance_minor bigint not null default 0 check(tolerance_minor>=0),
  registration_minor bigint not null default 4500 check(registration_minor>0),
  markup_basis_points int not null default 3000 check(markup_basis_points between 0 and 10000)
);
insert into public.portal_settings(id) values(true);
create table public.portal_quotes (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  domain text not null, domain_id uuid references public.portal_domains(id), kind text not null check(kind in ('registration','renewal')),
  retail_minor bigint not null check(retail_minor>0), currency text not null default 'usd' check(currency='usd'),
  years int not null default 1 check(years=1), expiration_snapshot timestamptz,
  valid_until timestamptz not null, created_at timestamptz not null default now()
);
create table public.portal_quote_evidence (
  quote_id uuid primary key references public.portal_quotes(id), pricing_id uuid not null references public.portal_pricing(id),
  supplier_minor bigint not null, fees_minor bigint not null, source text not null,
  markup_basis_points int not null, verified_at timestamptz not null, contact_ids jsonb not null
);
create table public.portal_orders (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  quote_id uuid not null unique references public.portal_quotes(id), domain text not null,
  kind text not null check(kind in ('registration','renewal')), environment text not null default 'sandbox' check(environment='sandbox'),
  amount_minor bigint not null check(amount_minor>0), currency text not null check(currency='usd'),
  status text not null default 'awaiting_payment' check(status in ('awaiting_payment','checkout_creating','checkout_ready','paid','simulation_queued','simulated_complete','action_required','declined','refunded','disputed')),
  accepted_terms_at timestamptz not null, checkout_id text unique, checkout_url text, company_id text,
  payment_id text unique, paid_at timestamptz, created_at timestamptz not null default now()
);
create unique index portal_domain_order_lock on public.portal_orders(domain,environment)
  where status in ('awaiting_payment','checkout_creating','checkout_ready','paid','simulation_queued','action_required');
create table public.portal_payments (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  order_id uuid not null references public.portal_orders(id), provider_id text not null unique,
  amount_minor bigint not null, currency text not null, status text not null, environment text not null check(environment='sandbox'),
  created_at timestamptz not null default now()
);
create table public.portal_invoices (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  order_id uuid not null unique references public.portal_orders(id), amount_minor bigint not null,
  currency text not null, status text not null, description text not null,
  created_at timestamptz not null default now()
);
create table public.portal_ledger (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.portal_orders(id),
  category text not null, amount_minor bigint, currency text not null default 'usd',
  reconciliation_status text not null default 'unreconciled', unique(order_id,category)
);
create table public.portal_events (
  id text primary key, event_type text not null, payment_id text not null, order_id uuid references public.portal_orders(id),
  status text not null, created_at timestamptz not null default now()
);
create table public.portal_jobs (
  id uuid primary key default gen_random_uuid(), order_id uuid unique references public.portal_orders(id),
  kind text not null check(kind='sandbox_fulfillment'), status text not null default 'queued',
  attempts int not null default 0, available_at timestamptz not null default now(),
  result jsonb, created_at timestamptz not null default now()
);
create table public.portal_requests (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  created_by uuid not null references public.portal_accounts(user_id), category text not null,
  subject text not null, description text not null,
  status text not null default 'submitted' check(status in ('submitted','under_review','quoted','approved','in_progress','completed','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.portal_messages (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.portal_requests(id),
  client_id uuid not null references public.portal_clients(id), author_id uuid not null references public.portal_accounts(user_id),
  body text not null, created_at timestamptz not null default now()
);
create table public.portal_documents (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  name text not null, storage_path text not null unique, mime_type text not null, size_bytes bigint not null,
  created_at timestamptz not null default now()
);
create table public.portal_notifications (
  id uuid primary key default gen_random_uuid(), client_id uuid not null references public.portal_clients(id),
  title text not null, body text not null, created_at timestamptz not null default now()
);
create table public.portal_email_outbox (
  id uuid primary key default gen_random_uuid(), client_id uuid references public.portal_clients(id),
  recipient text not null, subject text not null, body text not null, dedupe_key text not null unique,
  status text not null default 'queued', attempts int not null default 0, available_at timestamptz not null default now(),
  provider_id text, last_error text, created_at timestamptz not null default now()
);
create table public.portal_audit (
  id bigint generated always as identity primary key, actor_id uuid, action text not null,
  target_id text, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.portal_rate_limits (key text primary key, count int not null, expires_at timestamptz not null);
create function public.portal_rate_limit(p_key text,p_limit int,p_seconds int) returns boolean
language plpgsql security definer set search_path='' as $$
declare n int;
begin
  insert into public.portal_rate_limits as r(key,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
  on conflict(key) do update set count=case when r.expires_at<now() then 1 else r.count+1 end,
    expires_at=case when r.expires_at<now() then now()+make_interval(secs=>p_seconds) else r.expires_at end
  returning count into n;
  return n<=p_limit;
end $$;

-- Only the trusted backend can advance a payment after verifying Whop.
create function public.portal_confirm_payment(p_event text,p_order uuid,p_payment text,p_checkout text,p_company text,p_amount bigint,p_currency text)
returns text language plpgsql security definer set search_path='' as $$
declare o public.portal_orders; existing uuid;
begin
  select * into o from public.portal_orders where id=p_order for update;
  if not found then raise exception 'Unknown order'; end if;
  if o.environment<>'sandbox' or o.checkout_id is distinct from p_checkout or o.company_id is distinct from p_company
    or o.amount_minor<>p_amount or o.currency<>p_currency then raise exception 'Payment mismatch'; end if;
  if exists(select 1 from public.portal_events where id=p_event) then return 'duplicate'; end if;
  select order_id into existing from public.portal_payments where provider_id=p_payment;
  if existing is not null and existing<>o.id then raise exception 'Payment already allocated'; end if;
  if o.payment_id is not null and o.payment_id<>p_payment then raise exception 'Order already paid'; end if;
  insert into public.portal_events(id,event_type,payment_id,order_id,status) values(p_event,'payment.succeeded',p_payment,o.id,'verified');
  if o.payment_id=p_payment then return 'duplicate'; end if;
  if o.status not in ('checkout_ready','checkout_creating','action_required') then raise exception 'Invalid payment transition'; end if;
  insert into public.portal_payments(client_id,order_id,provider_id,amount_minor,currency,status,environment)
    values(o.client_id,o.id,p_payment,p_amount,p_currency,'confirmed','sandbox');
  update public.portal_orders set status='simulation_queued',payment_id=p_payment,paid_at=now() where id=o.id;
  insert into public.portal_jobs(order_id,kind) values(o.id,'sandbox_fulfillment') on conflict(order_id) do nothing;
  insert into public.portal_invoices(client_id,order_id,amount_minor,currency,status,description)
    values(o.client_id,o.id,p_amount,p_currency,'sandbox_paid',o.kind||' - '||o.domain||' (sandbox)') on conflict(order_id) do nothing;
  insert into public.portal_ledger(order_id,category,amount_minor,reconciliation_status)
    values(o.id,'sandbox_gross_'||o.kind,p_amount,'sandbox'),(o.id,'processor_fee',null,'unreconciled'),(o.id,'supplier_expense',0,'simulation_only');
  insert into public.portal_notifications(client_id,title,body) values(o.client_id,'Sandbox payment confirmed','Payment verified. Registrar fulfillment is simulated. No real domain was purchased or renewed.');
  insert into public.portal_audit(action,target_id,detail) values('payment_verified',o.id::text,jsonb_build_object('payment',p_payment,'environment','sandbox'));
  return 'verified';
end $$;
create function public.portal_run_simulations() returns int language plpgsql security definer set search_path='' as $$
declare j public.portal_jobs; n int:=0;
begin
  for j in select * from public.portal_jobs where status='queued' and available_at<=now() order by created_at limit 20 for update skip locked loop
    if exists(select 1 from public.portal_orders where id=j.order_id and environment='sandbox' and status='simulation_queued' and payment_id is not null) then
      update public.portal_jobs set status='completed',attempts=attempts+1,result='{"simulated":true,"registrar_called":false}' where id=j.id;
      update public.portal_orders set status='simulated_complete' where id=j.order_id;
      -- Intentionally no write to real registrar domain inventory or expiration.
      n:=n+1;
    end if;
  end loop;
  return n;
end $$;
create function public.portal_claim_email() returns setof public.portal_email_outbox language sql security definer set search_path='' as $$
  update public.portal_email_outbox set status='sending', attempts=attempts+1
  where id=(select id from public.portal_email_outbox where status in ('queued','retry') and available_at<=now() and attempts<5 order by created_at limit 1 for update skip locked)
  returning *
$$;
revoke all on function public.portal_rate_limit(text,int,int),public.portal_confirm_payment(text,uuid,text,text,text,bigint,text),public.portal_run_simulations(),public.portal_claim_email() from public,anon,authenticated;
grant execute on function public.portal_rate_limit(text,int,int),public.portal_confirm_payment(text,uuid,text,text,text,bigint,text),public.portal_run_simulations(),public.portal_claim_email() to service_role;

-- No direct browser writes. Backend writes require explicit authorization.
do $$ declare t text; begin
  foreach t in array array['clients','accounts','memberships','domains','domain_assignments','websites','pricing','settings','quotes','quote_evidence','orders','payments','invoices','ledger','events','jobs','requests','messages','documents','notifications','email_outbox','audit','rate_limits'] loop
    execute format('alter table public.portal_%I enable row level security',t);
    execute format('revoke all on public.portal_%I from anon, authenticated',t);
    execute format('grant all on public.portal_%I to service_role',t);
  end loop;
  foreach t in array array['websites','quotes','orders','payments','invoices','requests','messages','documents','notifications','domain_assignments'] loop
    execute format('grant select on public.portal_%I to authenticated',t);
    execute format('create policy tenant_read on public.portal_%I for select to authenticated using (public.portal_access(client_id))',t);
    execute format('create index on public.portal_%I(client_id)',t);
  end loop;
  foreach t in array array['pricing','settings','quote_evidence','ledger','events','jobs','email_outbox','audit'] loop
    execute format('grant select on public.portal_%I to authenticated',t);
    execute format('create policy admin_read on public.portal_%I for select to authenticated using (public.portal_admin())',t);
  end loop;
end $$;
grant select on public.portal_accounts,public.portal_memberships,public.portal_clients,public.portal_domains to authenticated;
create policy account_read on public.portal_accounts for select to authenticated using(public.portal_admin() or (user_id=auth.uid() and public.portal_role() is not null));
create policy membership_read on public.portal_memberships for select to authenticated using(public.portal_admin() or (user_id=auth.uid() and public.portal_role() is not null));
create policy client_read on public.portal_clients for select to authenticated using(public.portal_access(id));
create policy domain_read on public.portal_domains for select to authenticated using(public.portal_admin() or (not protected and exists(select 1 from public.portal_domain_assignments a where a.domain_id=id and public.portal_access(a.client_id))));
grant usage,select on sequence public.portal_audit_id_seq to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portal-documents','portal-documents',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp','text/plain'])
on conflict(id) do nothing;
-- No storage policies are granted: the authorized backend issues brief signed URLs.
commit;
