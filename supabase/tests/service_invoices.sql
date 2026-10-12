begin;
do $$
declare actor uuid; test_id uuid:=gen_random_uuid();
begin
 select user_id into actor from public.portal_accounts where approved_email='mabdullah.built@gmail.com' and role='super_admin' and active;
 if actor is null then raise exception 'Authorized administrator unavailable'; end if;
 perform set_config('portal.test_invoice',test_id::text,true);
 perform public.portal_create_service_invoice(test_id,'be7cfb62-86b7-475c-82c5-d60ed1366999',100,'TEST ONLY rollback visibility invoice',actor);
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1fbf7ec-a937-42df-bca6-cd02da8ad545","email":"abdullahlp114@gmail.com","aal":"aal1"}',true);
do $$ begin
 if exists(select 1 from public.portal_invoices where id=current_setting('portal.test_invoice')::uuid) then raise exception 'Draft leaked through RLS'; end if;
end $$;
reset role;
do $$ declare actor uuid; begin
 select user_id into actor from public.portal_accounts where approved_email='mabdullah.built@gmail.com' and role='super_admin' and active;
 perform public.portal_transition_service_invoice(current_setting('portal.test_invoice')::uuid,'issued',actor);
end $$;
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.portal_invoices where id=current_setting('portal.test_invoice')::uuid and status='issued') then raise exception 'Issued invoice not visible to its client'; end if;
end $$;
rollback;
