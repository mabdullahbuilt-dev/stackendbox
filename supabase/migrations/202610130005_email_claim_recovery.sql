begin;

-- A provider request can succeed even when its response is lost. An abandoned
-- claim must be reviewed, never silently retried into a duplicate email.
alter table public.portal_email_outbox add column claimed_at timestamptz;
update public.portal_email_outbox
  set status='review_required', last_error='legacy_sending_outcome_unknown'
  where status='sending';

create or replace function public.portal_claim_email()
returns setof public.portal_email_outbox language sql security definer set search_path='' as $$
  update public.portal_email_outbox
    set status='sending', attempts=attempts+1, claimed_at=now()
  where id=(
    select id from public.portal_email_outbox
    where status in ('queued','retry') and available_at<=now() and attempts<5
    order by created_at limit 1 for update skip locked
  )
  returning *
$$;

create function public.portal_recover_stale_email_claims()
returns integer language plpgsql security definer set search_path='' as $$
declare recovered integer;
begin
  update public.portal_email_outbox
    set status='review_required', last_error='stale_delivery_outcome_unknown'
    where status='sending' and claimed_at < now()-interval '15 minutes';
  get diagnostics recovered = row_count;
  return recovered;
end $$;

revoke all on function public.portal_recover_stale_email_claims() from public,anon,authenticated;
grant execute on function public.portal_recover_stale_email_claims() to service_role;

insert into public.portal_schema_releases(version) values('202610130005');
commit;
