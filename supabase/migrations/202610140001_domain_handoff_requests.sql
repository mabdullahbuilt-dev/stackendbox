begin;
-- Portal access only. No provider mutation or existing data rewrite.
create table public.portal_handoff_requests (
  id uuid primary key,
  actor_id uuid not null references public.portal_accounts(user_id),
  domain_id uuid not null references public.portal_domains(id),
  client_id uuid not null references public.portal_clients(id),
  approved_email text not null,
  holder_arrangement text not null check(holder_arrangement in ('client_owned','licensed')),
  completed_at timestamptz not null default now()
);
alter table public.portal_handoff_requests enable row level security;
revoke all on public.portal_handoff_requests from public,anon,authenticated,service_role;
grant select on public.portal_handoff_requests to service_role;
create function public.portal_commit_domain_handoff(p_id uuid,p_actor uuid,p_domain uuid,p_client uuid,p_email text,p_holder text,p_arrangement text)
returns public.portal_handoff_requests language plpgsql security definer set search_path='' as $$
declare r public.portal_handoff_requests;
begin
  if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into r from public.portal_handoff_requests where id=p_id;
  if found then
    if r.actor_id<>p_actor or r.domain_id<>p_domain or r.client_id<>p_client or r.approved_email<>p_email or r.holder_arrangement<>p_arrangement then raise exception 'Handoff request conflict'; end if;
    return r;
  end if;
  if not exists(select 1 from public.portal_accounts a join public.portal_memberships m on m.user_id=a.user_id where a.approved_email=p_email and a.role='client' and a.active and m.client_id=p_client) then raise exception 'Approved client identity required'; end if;
  perform public.portal_assign_verified_domain(p_domain,p_client,p_holder,p_arrangement,p_actor);
  insert into public.portal_handoff_requests(id,actor_id,domain_id,client_id,approved_email,holder_arrangement)
    values(p_id,p_actor,p_domain,p_client,p_email,p_arrangement) returning * into r;
  insert into public.portal_audit(actor_id,action,target_id,detail)
    values(p_actor,'domain_handoff_committed',p_domain::text,jsonb_build_object('request_id',p_id,'client_id',p_client,'registered_holder_unchanged',true,'registrar_custody_unchanged',true));
  return r;
end $$;
revoke all on function public.portal_commit_domain_handoff(uuid,uuid,uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.portal_commit_domain_handoff(uuid,uuid,uuid,uuid,text,text,text) to service_role;
insert into public.portal_schema_releases(version) values('202610140001');
commit;
