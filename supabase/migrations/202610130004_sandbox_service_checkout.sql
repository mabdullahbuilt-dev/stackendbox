begin;

-- A service-invoice sandbox payment is deliberately separate from a domain order.
-- It must never enter the registrar fulfillment queue.
alter table public.portal_invoices add constraint portal_invoice_id_client_unique unique(id,client_id);
create table public.portal_invoice_checkouts (
  invoice_id uuid primary key references public.portal_invoices(id),
  client_id uuid not null references public.portal_clients(id),
  environment text not null default 'sandbox' check (environment = 'sandbox'),
  status text not null default 'awaiting_checkout' check (status in ('awaiting_checkout','checkout_creating','checkout_ready','paid','action_required')),
  company_id text,
  checkout_id text unique,
  checkout_url text,
  payment_id text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint portal_invoice_checkout_owner foreign key (invoice_id,client_id) references public.portal_invoices(id,client_id)
);
create table public.portal_invoice_payment_events (
  id text primary key,
  invoice_id uuid not null references public.portal_invoices(id),
  payment_id text not null,
  event_type text not null,
  created_at timestamptz not null default now()
);
create table public.portal_invoice_payments (
  provider_id text primary key,
  invoice_id uuid not null unique references public.portal_invoices(id),
  client_id uuid not null references public.portal_clients(id),
  amount_minor bigint not null check(amount_minor>0),
  currency text not null check(currency='usd'),
  status text not null check(status in ('provider_confirmed','review_required')),
  environment text not null default 'sandbox' check(environment='sandbox'),
  processor_fee_minor bigint,
  created_at timestamptz not null default now(),
  constraint portal_invoice_payment_owner foreign key (invoice_id,client_id) references public.portal_invoices(id,client_id)
);
alter table public.portal_invoice_checkouts enable row level security;
alter table public.portal_invoice_payment_events enable row level security;
alter table public.portal_invoice_payments enable row level security;
revoke all on public.portal_invoice_checkouts,public.portal_invoice_payment_events,public.portal_invoice_payments from anon,authenticated;
grant all on public.portal_invoice_checkouts,public.portal_invoice_payment_events,public.portal_invoice_payments to service_role;

create function public.portal_reserve_service_invoice_checkout(p_invoice uuid,p_company text)
returns text language plpgsql security definer set search_path='' as $$
declare i public.portal_invoices; c public.portal_invoice_checkouts;
begin
  select * into i from public.portal_invoices where id=p_invoice for update;
  if i.id is null or i.order_id is not null or i.status<>'issued' or i.currency<>'usd' or i.amount_minor<1 then
    raise exception 'Issued service invoice required';
  end if;
  insert into public.portal_invoice_checkouts(invoice_id,client_id,company_id)
    values(p_invoice,i.client_id,p_company) on conflict(invoice_id) do nothing;
  select * into c from public.portal_invoice_checkouts where invoice_id=p_invoice for update;
  if c.company_id is distinct from p_company then raise exception 'Checkout company mismatch'; end if;
  if c.status='awaiting_checkout' then
    update public.portal_invoice_checkouts set status='checkout_creating' where invoice_id=p_invoice;
    return 'create';
  end if;
  if c.status='checkout_ready' then return 'ready'; end if;
  return 'requires_reconciliation';
end $$;
create function public.portal_finish_service_invoice_checkout(p_invoice uuid,p_checkout text,p_url text)
returns void language plpgsql security definer set search_path='' as $$
declare i public.portal_invoices;
begin
  select * into i from public.portal_invoices where id=p_invoice for update;
  if i.id is null or i.status<>'issued' or i.order_id is not null then raise exception 'Issued service invoice required'; end if;
  update public.portal_invoice_checkouts set status='checkout_ready',checkout_id=p_checkout,checkout_url=p_url
    where invoice_id=p_invoice and status='checkout_creating';
  if not found then raise exception 'Checkout state mismatch'; end if;
end $$;

create function public.portal_confirm_service_invoice_payment(
  p_event text,p_invoice uuid,p_payment text,p_checkout text,p_company text,p_client uuid,p_amount bigint,p_currency text
) returns text language plpgsql security definer set search_path='' as $$
declare i public.portal_invoices; c public.portal_invoice_checkouts;
begin
  select * into i from public.portal_invoices where id=p_invoice for update;
  select * into c from public.portal_invoice_checkouts where invoice_id=p_invoice for update;
  if i.id is null or c.invoice_id is null or i.order_id is not null or i.client_id<>p_client or c.client_id<>p_client
    or c.environment<>'sandbox' or i.amount_minor<>p_amount or i.currency<>p_currency
    or c.checkout_id is distinct from p_checkout or c.company_id is distinct from p_company then
    raise exception 'Service invoice payment mismatch';
  end if;
  if exists(select 1 from public.portal_invoice_payment_events where id=p_event) then return 'duplicate'; end if;
  if c.payment_id=p_payment and c.status='paid' then return 'duplicate'; end if;
  if c.payment_id is not null or c.status not in ('checkout_ready','action_required') or i.status<>'issued' then
    raise exception 'Invalid service invoice payment transition';
  end if;
  if exists(select 1 from public.portal_invoice_checkouts where payment_id=p_payment and invoice_id<>p_invoice)
    or exists(select 1 from public.portal_payments where provider_id=p_payment) then
    raise exception 'Payment already allocated';
  end if;
  insert into public.portal_invoice_payment_events(id,invoice_id,payment_id,event_type)
    values(p_event,p_invoice,p_payment,'payment.succeeded');
  insert into public.portal_invoice_payments(provider_id,invoice_id,client_id,amount_minor,currency,status)
    values(p_payment,p_invoice,p_client,p_amount,p_currency,'provider_confirmed');
  update public.portal_invoice_checkouts set status='paid',payment_id=p_payment,paid_at=now() where invoice_id=p_invoice;
  update public.portal_invoices set status='sandbox_paid' where id=p_invoice;
  insert into public.portal_audit(action,target_id,detail) values
    ('sandbox_service_invoice_payment_verified',p_invoice::text,jsonb_build_object('environment','sandbox','amount_minor',p_amount));
  return 'verified';
end $$;
revoke all on function public.portal_reserve_service_invoice_checkout(uuid,text),public.portal_finish_service_invoice_checkout(uuid,text,text),public.portal_confirm_service_invoice_payment(text,uuid,text,text,text,uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.portal_reserve_service_invoice_checkout(uuid,text),public.portal_finish_service_invoice_checkout(uuid,text,text),public.portal_confirm_service_invoice_payment(text,uuid,text,text,text,uuid,bigint,text) to service_role;

create or replace function public.portal_transition_service_invoice(p_id uuid,p_action text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare i public.portal_invoices;
begin
  if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required'; end if;
  select * into i from public.portal_invoices where id=p_id for update;
  if not found or i.order_id is not null then raise exception 'Service invoice required'; end if;
  if p_action not in ('issued','void') then raise exception 'Unsupported invoice transition'; end if;
  if i.status=p_action then return; end if;
  if i.status not in ('draft','issued') then raise exception 'Invoice cannot be changed'; end if;
  if p_action='void' and exists(select 1 from public.portal_invoice_checkouts where invoice_id=p_id and status<>'awaiting_checkout') then
    raise exception 'Checkout requires reconciliation before voiding';
  end if;
  update public.portal_invoices set status=p_action where id=p_id;
  insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'service_invoice_status_changed',p_id::text,jsonb_build_object('status',p_action,'payment_not_confirmed',true));
end $$;

insert into public.portal_schema_releases(version) values('202610130004');
commit;
