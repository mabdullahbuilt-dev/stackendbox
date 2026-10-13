begin;
do $$
declare
  fixture_id uuid := gen_random_uuid();
  claimed_id uuid;
  current_status text;
  current_error text;
begin
  insert into public.portal_email_outbox
    (id,recipient,subject,body,dedupe_key,created_at)
    values (fixture_id,'nobody@example.invalid','Fixture','No email is sent by this SQL test',
      'claim-recovery-fixture-'||fixture_id::text,'2000-01-01'::timestamptz);
  select id into claimed_id from public.portal_claim_email();
  if claimed_id is distinct from fixture_id then raise exception 'Fixture was not claimed'; end if;
  if not exists(select 1 from public.portal_email_outbox
      where id=fixture_id and status='sending' and claimed_at is not null and attempts=1)
    then raise exception 'Claim was not recorded'; end if;
  update public.portal_email_outbox set claimed_at=now()-interval '16 minutes' where id=fixture_id;
  perform public.portal_recover_stale_email_claims();
  select status,last_error into current_status,current_error
    from public.portal_email_outbox where id=fixture_id;
  if current_status<>'review_required' or current_error<>'stale_delivery_outcome_unknown'
    then raise exception 'Stale claim did not become review-only'; end if;
end $$;
rollback;
