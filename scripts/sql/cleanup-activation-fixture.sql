begin;
-- Explicitly authorized second test fixture only. Unexpected dependencies
-- cause FK failure and transaction rollback, never a cascading deletion.
do $$ declare n integer; begin
  if not exists(select 1 from public.portal_clients where id='eada77e8-9934-46d2-a383-e919daf5da93' and business_name='TEST ONLY 2026-10-13 activation')
    or not exists(select 1 from public.portal_accounts where user_id='fa0ef84d-dec3-4683-bb3f-1476f74910cc' and role='client' and approved_email='abdullahlp114+stackendbox-activation@gmail.com')
    then raise exception 'Authorized fixture mismatch'; end if;
  if (select count(*) from public.portal_websites where client_id='be7cfb62-86b7-475c-82c5-d60ed1366999') <> 1
    or (select count(*) from public.portal_requests where client_id='be7cfb62-86b7-475c-82c5-d60ed1366999') <> 1
    or (select count(*) from public.portal_messages where client_id='be7cfb62-86b7-475c-82c5-d60ed1366999') <> 2
    then raise exception 'Original fixture baseline changed'; end if;
  delete from public.portal_provisioning where id='8738ece1-3eda-4820-80ad-3cfadd5be732' and client_id='eada77e8-9934-46d2-a383-e919daf5da93' and auth_user_id='fa0ef84d-dec3-4683-bb3f-1476f74910cc';
  get diagnostics n=row_count; if n <> 1 then raise exception 'Provisioning cleanup mismatch'; end if;
  delete from public.portal_memberships where client_id='eada77e8-9934-46d2-a383-e919daf5da93' and user_id='fa0ef84d-dec3-4683-bb3f-1476f74910cc';
  get diagnostics n=row_count; if n <> 1 then raise exception 'Membership cleanup mismatch'; end if;
  delete from public.portal_clients where id='eada77e8-9934-46d2-a383-e919daf5da93' and business_name='TEST ONLY 2026-10-13 activation';
  get diagnostics n=row_count; if n <> 1 then raise exception 'Client cleanup mismatch'; end if;
  delete from public.portal_accounts where user_id='fa0ef84d-dec3-4683-bb3f-1476f74910cc' and role='client' and approved_email='abdullahlp114+stackendbox-activation@gmail.com';
  get diagnostics n=row_count; if n <> 1 then raise exception 'Account cleanup mismatch'; end if;
  insert into public.portal_audit(action,target_id,detail) values('authorized_test_fixture_removed','eada77e8-9934-46d2-a383-e919daf5da93','{"auth_user_id":"fa0ef84d-dec3-4683-bb3f-1476f74910cc","reason":"Completed authorized activation and two-client isolation acceptance"}');
end $$;
commit;
