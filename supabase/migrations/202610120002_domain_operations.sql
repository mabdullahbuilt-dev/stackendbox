-- Apply before enabling DOMAIN_LIVE_MUTATIONS_ENABLED. No live operations are enabled here.
create table public.portal_domain_operations (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.portal_domains(id),
  client_id uuid not null references public.portal_clients(id),
  actor_id uuid not null references public.portal_accounts(user_id),
  idempotency_key uuid not null unique,
  kind text not null check(kind in ('dns','nameservers','privacy')),
  status text not null check(status in ('applying','verified','review_required','rejected')),
  expected_version text not null,
  input jsonb not null,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- An ambiguous timeout keeps the lock. Never release automatically and retry a mutation.
create unique index portal_domain_operation_lock on public.portal_domain_operations(domain_id)
  where status in ('applying','review_required');
create index portal_domain_operations_client on public.portal_domain_operations(client_id,created_at desc);
alter table public.portal_domain_operations enable row level security;
revoke all on public.portal_domain_operations from anon, authenticated;
grant select on public.portal_domain_operations to authenticated;
grant all on public.portal_domain_operations to service_role;
create policy tenant_read on public.portal_domain_operations for select to authenticated
  using(public.portal_access(client_id));
