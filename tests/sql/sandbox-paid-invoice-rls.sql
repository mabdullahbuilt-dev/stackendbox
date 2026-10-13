begin;
do $$
declare actor record;
begin
  select a.user_id,a.approved_email into actor
    from public.portal_accounts a
    join public.portal_memberships m on m.user_id=a.user_id
    join public.portal_invoices i on i.client_id=m.client_id
    where a.active and a.role='client' and i.status='sandbox_paid'
    limit 1;
  if actor.user_id is null then raise exception 'No active client for paid Sandbox invoice'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object(
    'sub',actor.user_id,'email',actor.approved_email,
    'role','authenticated','aal','aal1')::text,true);
end $$;
set local role authenticated;
do $$
declare visible_paid integer;
begin
  select count(*) into visible_paid from public.portal_invoices where status='sandbox_paid';
  if visible_paid<>1 then raise exception 'Client could not read its paid Sandbox invoice'; end if;
end $$;
rollback;
