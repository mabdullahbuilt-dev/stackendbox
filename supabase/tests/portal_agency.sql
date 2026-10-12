-- Isolated or rolled-back fixtures only. No payment, email or registrar calls.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('aaaaaaaa-0000-4000-8000-000000000001','agency-admin@example.invalid',now()),
('aaaaaaaa-0000-4000-8000-000000000002','agency-client@example.invalid',now());
insert into portal_accounts(user_id,approved_email,name,role) values
('aaaaaaaa-0000-4000-8000-000000000001','agency-admin@example.invalid','Fixture','super_admin'),
('aaaaaaaa-0000-4000-8000-000000000002','agency-client@example.invalid','Fixture','client');
insert into portal_clients(id,name,business_name) values
('aaaaaaaa-0000-4000-8000-000000000011','Fixture A','Local fixture A'),
('aaaaaaaa-0000-4000-8000-000000000012','Fixture B','Local fixture B');
insert into portal_memberships(user_id,client_id) values('aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000011');
insert into portal_domains(id,name,lifecycle_status,expiration_date,last_synced_at) values('aaaaaaaa-0000-4000-8000-000000000021','agency-fixture.invalid','registered',now()+interval '1 year',now());
select portal_assign_verified_domain('aaaaaaaa-0000-4000-8000-000000000021','aaaaaaaa-0000-4000-8000-000000000011','Fixture holder','client_owned','aaaaaaaa-0000-4000-8000-000000000001');
select portal_assign_verified_domain('aaaaaaaa-0000-4000-8000-000000000021','aaaaaaaa-0000-4000-8000-000000000011','Fixture holder','client_owned','aaaaaaaa-0000-4000-8000-000000000001');
do $$ begin
 if (select count(*) from portal_domain_assignments where domain_id='aaaaaaaa-0000-4000-8000-000000000021')<>1 then raise exception 'Duplicate assignment'; end if;
 begin
  perform portal_assign_verified_domain('aaaaaaaa-0000-4000-8000-000000000021','aaaaaaaa-0000-4000-8000-000000000012','Fixture holder','client_owned','aaaaaaaa-0000-4000-8000-000000000001');
  raise exception 'Silent reassignment accepted';
 exception when raise_exception then if sqlerrm<>'Domain already assigned, ownership review required' then raise; end if; end;
end $$;
insert into portal_acquisition_requests(id,client_id,domain,retail_minor,customer_approval,holder_arrangement,legal_holder,created_by) values
('aaaaaaaa-0000-4000-8000-000000000031','aaaaaaaa-0000-4000-8000-000000000011','agency-fixture.invalid',4500,'Fixture approval','client_owned','Fixture holder','aaaaaaaa-0000-4000-8000-000000000001');
insert into portal_external_payments(id,client_id,acquisition_id,source,transaction_reference,amount_minor,paid_at,evidence,reconciliation_status,recorded_by) values
('aaaaaaaa-0000-4000-8000-000000000041','aaaaaaaa-0000-4000-8000-000000000011','aaaaaaaa-0000-4000-8000-000000000031','bank_transfer','fixture-reference',4500,now(),'Private fixture evidence','verified','aaaaaaaa-0000-4000-8000-000000000001');
insert into portal_service_entitlements(client_id,service,description,status,created_by) values
('aaaaaaaa-0000-4000-8000-000000000011','Managed database','Local fixture included service','included','aaaaaaaa-0000-4000-8000-000000000001'),
('aaaaaaaa-0000-4000-8000-000000000012','Maintenance','Other tenant fixture','included','aaaaaaaa-0000-4000-8000-000000000001');
do $$ begin
 begin
  insert into portal_external_payments(id,client_id,acquisition_id,source,transaction_reference,amount_minor,paid_at,evidence,reconciliation_status,recorded_by) values(gen_random_uuid(),'aaaaaaaa-0000-4000-8000-000000000012','aaaaaaaa-0000-4000-8000-000000000031','cash','cross-client',4500,now(),'Fixture','verified','aaaaaaaa-0000-4000-8000-000000000001');
  raise exception 'Cross-client payment accepted';
 exception when foreign_key_violation then null;
 when raise_exception then if sqlerrm<>'External payment must match the approved customer quote' then raise; end if; end;
 if (select status from portal_acquisition_requests where id='aaaaaaaa-0000-4000-8000-000000000031')<>'payment_recorded' then raise exception 'Verified external payment state not saved'; end if;
 if has_column_privilege('authenticated','portal_external_payments','evidence','SELECT') then raise exception 'Internal evidence exposed'; end if;
 if has_function_privilege('authenticated','portal_assign_verified_domain(uuid,uuid,text,text,uuid)','EXECUTE') then raise exception 'Client assignment RPC exposed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-0000-4000-8000-000000000002","email":"agency-client@example.invalid","aal":"aal1"}',true);
do $$ begin
 if (select count(id) from portal_external_payments)<>1 then raise exception 'Payment visibility failed'; end if;
 if (select count(*) from portal_acquisition_requests)<>0 then raise exception 'Admin acquisition leaked'; end if;
 if (select count(*) from portal_service_entitlements)<>1 then raise exception 'Service isolation failed'; end if;
 if (select count(*) from portal_domains where id='aaaaaaaa-0000-4000-8000-000000000021')<>1 then raise exception 'Assigned domain invisible'; end if;
end $$;
reset role;
rollback;
select 'Agency assignment idempotency, payment ownership, evidence privacy and client isolation passed' as result;
