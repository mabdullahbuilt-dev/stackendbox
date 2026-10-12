-- Run only in a newly restored local test database. These are not real customers.
begin;
insert into auth.users(id,email,email_confirmed_at)
select md5('capacity-user-'||n)::uuid,'capacity-'||n||'@example.invalid',now() from generate_series(1,400) n;
insert into portal_accounts(user_id,approved_email,name,role)
select md5('capacity-user-'||n)::uuid,'capacity-'||n||'@example.invalid','Isolated capacity fixture '||n,'client' from generate_series(1,400) n;
insert into portal_clients(id,name,business_name)
select md5('capacity-client-'||n)::uuid,'Capacity fixture '||n,'Isolated test only' from generate_series(1,400) n;
insert into portal_memberships(user_id,client_id)
select md5('capacity-user-'||n)::uuid,md5('capacity-client-'||n)::uuid from generate_series(1,400) n;
insert into portal_domains(id,name,lifecycle_status,expiration_date,last_synced_at)
select md5('capacity-domain-'||n)::uuid,'capacity-'||n||'.invalid','registered',now()+interval '1 year',now() from generate_series(1,400) n;
insert into portal_domain_assignments(domain_id,client_id,holder_arrangement,legal_holder)
select md5('capacity-domain-'||n)::uuid,md5('capacity-client-'||n)::uuid,'client_owned','Isolated fixture holder '||n from generate_series(1,400) n;
insert into portal_websites(client_id,domain_id,name,url)
select md5('capacity-client-'||n)::uuid,md5('capacity-domain-'||n)::uuid,'Isolated website '||n,'https://capacity-'||n||'.invalid' from generate_series(1,400) n;
insert into portal_requests(client_id,created_by,category,subject,description)
select md5('capacity-client-'||n)::uuid,md5('capacity-user-'||n)::uuid,'support','Isolated request','No external notification' from generate_series(1,400) n;
commit;
analyze;
set role authenticated;
do $$ declare n integer; begin
 for n in 1..400 loop
  perform set_config('request.jwt.claims',json_build_object('sub',md5('capacity-user-'||n)::uuid,'email','capacity-'||n||'@example.invalid','aal','aal1')::text,true);
  if (select count(*) from portal_clients)<>1 or
     (select count(*) from portal_domains)<>1 or
     (select count(*) from portal_websites)<>1 or
     (select count(*) from portal_requests)<>1 or
     not exists(select 1 from portal_domains where name='capacity-'||n||'.invalid') then
   raise exception 'Tenant isolation failed for fixture %',n;
  end if;
 end loop;
end $$;
reset role;
