begin;
insert into portal_accounts values
('aaaaaaaa-0000-4000-8000-000000000001','super_admin',true,'admin@example.invalid'),
('aaaaaaaa-0000-4000-8000-000000000002','client',true,'client@example.invalid');
insert into portal_clients values('aaaaaaaa-0000-4000-8000-000000000003','active');
insert into portal_memberships values('aaaaaaaa-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000003');
insert into portal_domains values('aaaaaaaa-0000-4000-8000-000000000004',false,'fixture.invalid','registered',now()+interval '1 year',false,now());
do $$ declare i integer; begin
 for i in 1..2 loop
 perform portal_commit_domain_handoff('aaaaaaaa-0000-4000-8000-000000000005','aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000004','aaaaaaaa-0000-4000-8000-000000000003','client@example.invalid','Agency holder','licensed');
 end loop;
 if (select count(*) from portal_handoff_requests)<>1 or (select count(*) from portal_domain_assignments)<>1 or (select count(*) from portal_audit where action='domain_handoff_committed')<>1 then raise exception 'Duplicate operation';end if;
 begin
 perform portal_commit_domain_handoff('aaaaaaaa-0000-4000-8000-000000000005','aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000004','aaaaaaaa-0000-4000-8000-000000000003','other@example.invalid','Agency holder','licensed');
 raise exception 'Conflict accepted';
 exception when raise_exception then if sqlerrm<>'Handoff request conflict' then raise;end if;end;
 begin
 perform portal_commit_domain_handoff('aaaaaaaa-0000-4000-8000-000000000006','aaaaaaaa-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000004','aaaaaaaa-0000-4000-8000-000000000003','other@example.invalid','Agency holder','licensed');
 raise exception 'Wrong customer accepted';
 exception when raise_exception then if sqlerrm<>'Approved client identity required' then raise;end if;end;
 if (select count(*) from portal_handoff_requests)<>1 then raise exception 'Failed request persisted';end if;
 if has_function_privilege('authenticated','portal_commit_domain_handoff(uuid,uuid,uuid,uuid,text,text,text)','EXECUTE') then raise exception 'Client RPC exposed';end if;
 if has_table_privilege('authenticated','portal_handoff_requests','SELECT') or has_table_privilege('service_role','portal_handoff_requests','UPDATE') then raise exception 'Ledger exposed or mutable';end if;
end $$;
rollback;
