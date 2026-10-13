begin;
create function public.portal_claim_selected_email(target_ids uuid[])
returns setof public.portal_email_outbox language plpgsql security definer set search_path='' as $$
begin
  if cardinality(target_ids) not between 1 and 4 then raise exception 'invalid email batch'; end if;
  return query update public.portal_email_outbox
    set status='sending', attempts=attempts+1,claimed_at=now()
    where id=(select id from public.portal_email_outbox
      where id=any(target_ids) and status in ('queued','retry')
        and available_at<=now() and attempts<5
      order by created_at limit 1 for update skip locked)
    returning *;
end $$;
revoke all on function public.portal_claim_selected_email(uuid[]) from public,anon,authenticated;
grant execute on function public.portal_claim_selected_email(uuid[]) to service_role;
insert into public.portal_schema_releases(version) values('202610130007');
commit;
