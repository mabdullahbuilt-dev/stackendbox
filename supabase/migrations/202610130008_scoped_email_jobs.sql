begin;
create function public.portal_claim_client_email(client_ids uuid[])
returns setof public.portal_email_outbox language plpgsql security definer set search_path='' as $$
begin
  if client_ids is not null and cardinality(client_ids) not between 1 and 400 then raise exception 'invalid client scope'; end if;
  return query update public.portal_email_outbox
    set status='sending',attempts=attempts+1,claimed_at=now()
    where id=(select e.id from public.portal_email_outbox e
      where (client_ids is null or e.client_id=any(client_ids)) and e.status in ('queued','retry')
        and e.available_at<=now() and e.attempts<5
        and exists(select 1 from public.portal_memberships m join public.portal_accounts a on a.user_id=m.user_id
          where m.client_id=e.client_id and a.active and a.role='client' and a.approved_email=e.recipient)
      order by e.created_at limit 1 for update skip locked)
    returning *;
end $$;
revoke all on function public.portal_claim_client_email(uuid[]) from public,anon,authenticated;
grant execute on function public.portal_claim_client_email(uuid[]) to service_role;
insert into public.portal_schema_releases(version) values('202610130008');
commit;
