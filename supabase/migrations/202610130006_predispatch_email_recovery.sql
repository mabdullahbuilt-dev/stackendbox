begin;
create function public.portal_recover_predispatch_emails(target_ids uuid[])
returns integer language plpgsql security definer set search_path='' as $$
declare recovered integer;
begin
  if cardinality(target_ids) not between 1 and 4 then raise exception 'invalid recovery batch'; end if;
  with recovered_rows as (
    update public.portal_email_outbox set status='retry', available_at=now(), claimed_at=null, last_error=null
    where id=any(target_ids) and status='review_required' and attempts=1
      and provider_id is null and last_error='configuration_required:BREVO_CLIENT_SENDER_EMAIL'
    returning id
  )
  insert into public.portal_audit(action,target_id,detail)
    select 'email_predispatch_failure_recovered',id,
      jsonb_build_object('evidence','missing_sender_before_provider_dispatch','automatic_send_performed',false)
    from recovered_rows;
  get diagnostics recovered=row_count;
  return recovered;
end $$;
revoke all on function public.portal_recover_predispatch_emails(uuid[]) from public,anon,authenticated;
grant execute on function public.portal_recover_predispatch_emails(uuid[]) to service_role;
insert into public.portal_schema_releases(version) values('202610130006');
commit;
