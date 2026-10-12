-- Synthetic fixtures only, all changes roll back. No email or registrar calls.
begin;
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
('eeeeeeee-0000-4000-8000-000000000001','integrity-admin@example.invalid',now(),'{}'),
('eeeeeeee-0000-4000-8000-000000000002','integrity-client@example.invalid',now(),'{"portal_provisioning_id":"eeeeeeee-0000-4000-8000-000000000003"}');
insert into portal_accounts(user_id,approved_email,name,role) values('eeeeeeee-0000-4000-8000-000000000001','integrity-admin@example.invalid','Integrity fixture','super_admin');
do $$ declare p public.portal_provisioning; q public.portal_provisioning; payload jsonb:='{"name":"Integrity client","business_name":"Synthetic fixture","email":"integrity-client@example.invalid","status":"active"}'; begin
 p:=public.portal_begin_provisioning('eeeeeeee-0000-4000-8000-000000000003','eeeeeeee-0000-4000-8000-000000000001',payload);
 q:=public.portal_begin_provisioning('eeeeeeee-0000-4000-8000-000000000004','eeeeeeee-0000-4000-8000-000000000001',payload);
 if p.id<>q.id then raise exception 'Email retry created a second request'; end if;
 p:=public.portal_commit_provisioning(p.id,'eeeeeeee-0000-4000-8000-000000000002');
 q:=public.portal_commit_provisioning(p.id,'eeeeeeee-0000-4000-8000-000000000002');
 if p.client_id<>q.client_id or (select count(*) from portal_memberships where user_id='eeeeeeee-0000-4000-8000-000000000002')<>1 then raise exception 'Duplicate provisioning'; end if;
 if not exists(select 1 from portal_admin_identities where user_id='eeeeeeee-0000-4000-8000-000000000002' and email_consistent) then raise exception 'Admin identity join failed'; end if;
 begin
   delete from auth.users where id='eeeeeeee-0000-4000-8000-000000000002';
   raise exception 'Identity deletion removed business history';
 exception when foreign_key_violation then null; end;
 if has_table_privilege('authenticated','portal_admin_identities','select') then raise exception 'Private Auth view exposed'; end if;
 if has_function_privilege('authenticated','portal_begin_provisioning(uuid,uuid,jsonb)','execute') then raise exception 'Provisioning RPC exposed'; end if;
end $$;
-- A business transaction failure leaves the reserved saga recoverable, without half a client.
insert into auth.users(id,email,raw_app_meta_data) values('eeeeeeee-0000-4000-8000-000000000005','integrity-failed@example.invalid','{"portal_provisioning_id":"eeeeeeee-0000-4000-8000-000000000006"}');
do $$ declare p public.portal_provisioning; before_count int; begin
 select count(*) into before_count from portal_clients;
 p:=portal_begin_provisioning('eeeeeeee-0000-4000-8000-000000000006','eeeeeeee-0000-4000-8000-000000000001','{"name":"Failure fixture","business_name":"Failure fixture","email":"integrity-failed@example.invalid","status":"active","domain_id":"eeeeeeee-0000-4000-8000-000000000099"}');
 begin
   perform portal_commit_provisioning(p.id,'eeeeeeee-0000-4000-8000-000000000005');
   raise exception 'Invalid domain accepted';
 exception when raise_exception then if sqlerrm<>'Domain inventory requires verification' then raise; end if; end;
 if (select count(*) from portal_clients)<>before_count then raise exception 'Partial client survived failure'; end if;
 if exists(select 1 from portal_accounts where user_id='eeeeeeee-0000-4000-8000-000000000005') then raise exception 'Partial account survived failure'; end if;
 if portal_provisioning_identity(p.id)<>'eeeeeeee-0000-4000-8000-000000000005'::uuid then raise exception 'Auth recovery failed'; end if;
end $$;
do $$ declare a uuid; b uuid; d uuid; q uuid; o uuid; t uuid; begin
 select client_id into a from portal_provisioning where id='eeeeeeee-0000-4000-8000-000000000003';
 insert into portal_clients(name,business_name) values('Isolation B','Synthetic fixture B') returning id into b;
 insert into portal_domains(name,lifecycle_status) values('integrity-fixture.invalid','test_fixture') returning id into d;
 insert into portal_domain_assignments(domain_id,client_id,holder_arrangement,legal_holder) values(d,a,'client_owned','Synthetic fixture');
 insert into portal_quotes(client_id,domain,kind,retail_minor,valid_until) values(a,'integrity-fixture.invalid','registration',4500,now()+interval '1 minute') returning id into q;
 insert into portal_orders(client_id,quote_id,domain,kind,amount_minor,currency,accepted_terms_at) values(a,q,'integrity-fixture.invalid','registration',4500,'usd',now()) returning id into o;
 insert into portal_requests(client_id,created_by,category,subject,description) values(a,'eeeeeeee-0000-4000-8000-000000000002','test','Synthetic','Synthetic') returning id into t;
 begin
   insert into portal_payments(client_id,order_id,provider_id,amount_minor,currency,status,environment) values(b,o,'integrity-fixture',4500,'usd','test','sandbox');
   raise exception 'Cross-client payment accepted';
 exception when foreign_key_violation then null; end;
 begin
   insert into portal_messages(client_id,request_id,author_id,body) values(b,t,'eeeeeeee-0000-4000-8000-000000000002','Synthetic');
   raise exception 'Cross-client message accepted';
 exception when foreign_key_violation then null; end;
 begin
   insert into portal_websites(client_id,domain_id,name,url) values(b,d,'Synthetic','https://example.invalid');
   raise exception 'Cross-client domain accepted';
 exception when foreign_key_violation then null; end;
end $$;
rollback;
select 'Provisioning idempotency, identity recovery, rollback, admin joins and history protection passed' as result;
