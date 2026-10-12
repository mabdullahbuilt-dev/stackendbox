begin;
-- Authorized acceptance identity only. Every test modification rolls back.
do $$ begin
  if not exists(select 1 from public.portal_accounts where user_id='a1fbf7ec-a937-42df-bca6-cd02da8ad545' and approved_email='abdullahlp114@gmail.com' and role='client')
    then raise exception 'Authorized test identity missing'; end if;
end $$;
update auth.users set raw_app_meta_data=raw_app_meta_data || '{"portal_password_change_required":true}',
  raw_user_meta_data=raw_user_meta_data || '{"portal_password_change_required":false}'
where id='a1fbf7ec-a937-42df-bca6-cd02da8ad545';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1fbf7ec-a937-42df-bca6-cd02da8ad545","email":"abdullahlp114@gmail.com","aal":"aal1","app_metadata":{"portal_password_change_required":false}}',true);
do $$ begin
  if public.portal_access('be7cfb62-86b7-475c-82c5-d60ed1366999') then raise exception 'Stale JWT bypassed password replacement'; end if;
  if exists(select 1 from public.portal_websites where client_id='be7cfb62-86b7-475c-82c5-d60ed1366999') then raise exception 'RLS exposed website before replacement'; end if;
  if exists(select 1 from public.portal_requests where client_id='be7cfb62-86b7-475c-82c5-d60ed1366999') then raise exception 'RLS exposed support before replacement'; end if;
end $$;
reset role;
update auth.users set raw_app_meta_data=raw_app_meta_data || '{"portal_password_change_required":false}'
where id='a1fbf7ec-a937-42df-bca6-cd02da8ad545';
set local role authenticated;
do $$ begin
  if not public.portal_access('be7cfb62-86b7-475c-82c5-d60ed1366999') then raise exception 'Access not restored after replacement'; end if;
  if not exists(select 1 from public.portal_websites where client_id='be7cfb62-86b7-475c-82c5-d60ed1366999') then raise exception 'Existing assignment missing'; end if;
end $$;
rollback;
