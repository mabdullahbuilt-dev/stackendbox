-- Run with the SQL editor's postgres role. All fixtures are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('ffffffff-0000-4000-8000-000000000001','portal-test-a@example.invalid',now()),
('ffffffff-0000-4000-8000-000000000002','portal-test-b@example.invalid',now()),
('ffffffff-0000-4000-8000-000000000003','portal-test-admin@example.invalid',now());
insert into public.portal_accounts(user_id,approved_email,name,role) values
('ffffffff-0000-4000-8000-000000000001','portal-test-a@example.invalid','Test A','client'),
('ffffffff-0000-4000-8000-000000000002','portal-test-b@example.invalid','Test B','client'),
('ffffffff-0000-4000-8000-000000000003','portal-test-admin@example.invalid','Test Admin','super_admin');
insert into public.portal_clients(id,name,business_name) values
('ffffffff-0000-4000-8000-000000000011','Test A','Test A'),
('ffffffff-0000-4000-8000-000000000012','Test B','Test B');
insert into public.portal_memberships(user_id,client_id) values
('ffffffff-0000-4000-8000-000000000001','ffffffff-0000-4000-8000-000000000011'),
('ffffffff-0000-4000-8000-000000000002','ffffffff-0000-4000-8000-000000000012');
insert into public.portal_websites(client_id,name,url) values
('ffffffff-0000-4000-8000-000000000011','Test A','https://example.invalid'),
('ffffffff-0000-4000-8000-000000000012','Test B','https://example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ffffffff-0000-4000-8000-000000000001","email":"portal-test-a@example.invalid","aal":"aal1"}',true);
do $$ begin
  if (select count(*) from public.portal_websites) <> 1 then raise exception 'Tenant isolation failed'; end if;
  if (select count(*) from public.portal_settings) <> 0 then raise exception 'Client supplier policy leaked'; end if;
  if public.portal_access('ffffffff-0000-4000-8000-000000000012') then raise exception 'Cross tenant access'; end if;
  if has_table_privilege('authenticated','public.portal_orders','INSERT') then raise exception 'Direct order writes allowed'; end if;
  if has_function_privilege('authenticated','public.portal_confirm_payment(text,uuid,text,text,text,bigint,text)','EXECUTE') then raise exception 'Client payment transition allowed'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"ffffffff-0000-4000-8000-000000000003","email":"portal-test-admin@example.invalid","aal":"aal1"}',true);
do $$ begin
  if public.portal_admin() or (select count(*) from public.portal_settings) <> 0 then raise exception 'Admin MFA bypass'; end if;
  if (select count(*) from public.portal_accounts) <> 1 then raise exception 'Admin without MFA can enumerate accounts'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"ffffffff-0000-4000-8000-000000000003","email":"portal-test-admin@example.invalid","aal":"aal2"}',true);
do $$ begin
  if not public.portal_admin() or (select count(*) from public.portal_settings) <> 1 then raise exception 'Verified admin denied'; end if;
end $$;
reset role;
update auth.users set email='changed@example.invalid' where id='ffffffff-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"ffffffff-0000-4000-8000-000000000001","email":"portal-test-a@example.invalid","aal":"aal1"}',true);
do $$ begin
  if public.portal_role() is not null or (select count(*) from public.portal_websites) <> 0 then raise exception 'Old JWT survives changed approved email'; end if;
end $$;
reset role;
insert into public.portal_domains(id,name,protected,lifecycle_status) values('ffffffff-0000-4000-8000-000000000021','protected-fixture.invalid',true,'registered');
do $$ begin
  begin
    insert into public.portal_domain_assignments(domain_id,client_id,holder_arrangement,legal_holder)
    values('ffffffff-0000-4000-8000-000000000021','ffffffff-0000-4000-8000-000000000011','client_owned','Test');
    raise exception 'Protected assignment was allowed';
  exception when raise_exception then
    if sqlerrm <> 'Protected company domain cannot be assigned' then raise; end if;
  end;
end $$;
insert into public.portal_quotes(id,client_id,domain,kind,retail_minor,valid_until)
values('ffffffff-0000-4000-8000-000000000031','ffffffff-0000-4000-8000-000000000011','test-payment.invalid','registration',4500,now()+interval '15 minutes');
insert into public.portal_orders(id,client_id,quote_id,domain,kind,amount_minor,currency,status,accepted_terms_at,checkout_id,company_id)
values('ffffffff-0000-4000-8000-000000000041','ffffffff-0000-4000-8000-000000000011','ffffffff-0000-4000-8000-000000000031','test-payment.invalid','registration',4500,'usd','checkout_ready',now(),'test-checkout-fixture','test-company-fixture');
do $$ declare result text; begin
  perform public.portal_run_simulations();
  if (select status from public.portal_orders where id='ffffffff-0000-4000-8000-000000000041') <> 'checkout_ready' then raise exception 'Unpaid order fulfilled'; end if;
  begin
    perform public.portal_confirm_payment('test-event-bad','ffffffff-0000-4000-8000-000000000041','test-payment','test-checkout-fixture','test-company-fixture',1,'usd');
    raise exception 'Wrong payment amount accepted';
  exception when raise_exception then
    if sqlerrm <> 'Payment mismatch' then raise; end if;
  end;
  result := public.portal_confirm_payment('test-event-good','ffffffff-0000-4000-8000-000000000041','test-payment','test-checkout-fixture','test-company-fixture',4500,'usd');
  if result <> 'verified' then raise exception 'Valid payment failed'; end if;
  result := public.portal_confirm_payment('test-event-good','ffffffff-0000-4000-8000-000000000041','test-payment','test-checkout-fixture','test-company-fixture',4500,'usd');
  if result <> 'duplicate' then raise exception 'Payment replay was not idempotent'; end if;
  result := public.portal_confirm_payment('test-event-second','ffffffff-0000-4000-8000-000000000041','test-payment','test-checkout-fixture','test-company-fixture',4500,'usd');
  if result <> 'duplicate' then raise exception 'Second event for same payment duplicated charge'; end if;
  if (select count(*) from public.portal_invoices where order_id='ffffffff-0000-4000-8000-000000000041') <> 1 then raise exception 'Duplicate invoice'; end if;
  perform public.portal_run_simulations();
  if (select status from public.portal_orders where id='ffffffff-0000-4000-8000-000000000041') <> 'simulated_complete' then raise exception 'Simulation failed'; end if;
  if exists(select 1 from public.portal_domains where name='test-payment.invalid') then raise exception 'Simulation wrote registrar inventory'; end if;
end $$;
rollback;
select 'Tenant isolation, MFA, email revocation, payment validation and replay tests passed. All fixtures rolled back.' as result;
