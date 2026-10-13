begin;
alter table public.portal_domains add column provider_checked_at timestamptz;
alter table public.portal_domains add column next_provider_check_at timestamptz;
create index portal_provider_checks_due on public.portal_domains(next_provider_check_at)
  where provider_account='primary' and not protected;
create function public.portal_claim_provider_checks(client_ids uuid[] default null)
returns setof public.portal_domains language sql security definer set search_path='' as $$
  update public.portal_domains d set next_provider_check_at=now()+interval '15 minutes'
  where d.id in (
    select candidate.id from public.portal_domains candidate
    where candidate.provider='spaceship' and candidate.provider_account='primary' and not candidate.protected
      and candidate.name<>'stackendbox.com'
      and (candidate.next_provider_check_at is null or candidate.next_provider_check_at<=now())
      and exists(select 1 from public.portal_domain_assignments a join public.portal_clients c on c.id=a.client_id
        where a.domain_id=candidate.id and c.status='active' and (client_ids is null or a.client_id=any(client_ids)))
    order by candidate.next_provider_check_at nulls first,candidate.id
    for update skip locked limit 4
  ) returning d.*;
$$;
revoke all on function public.portal_claim_provider_checks(uuid[]) from public,anon,authenticated;
grant execute on function public.portal_claim_provider_checks(uuid[]) to service_role;
insert into public.portal_schema_releases(version) values('202610130009');
commit;
