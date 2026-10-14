insert into portal_accounts values('aaaaaaaa-0000-4000-8000-000000000001','super_admin',true);
insert into portal_accounts values('aaaaaaaa-0000-4000-8000-000000000002','client',true);
do $$
declare t public.portal_ownership_tasks;
begin
 t:=public.portal_create_ownership_task('bbbbbbbb-0000-4000-8000-000000000001','aaaaaaaa-0000-4000-8000-000000000001','fixture.example','registered_holder','fixture-request','{"contact_id":"fixture-contact","lifecycle_status":"registered","expiration_date":"2027-10-13"}');
 if t.status<>'awaiting_consent' or t.revision<>0 then raise exception 'initial task mismatch';end if;
 perform public.portal_create_ownership_task(t.id,t.created_by,t.domain,t.kind,t.request_reference,t.baseline);
 if (select count(*) from public.portal_ownership_task_events)<>1 then raise exception 'duplicate creation event';end if;
 begin perform public.portal_create_ownership_task(t.id,t.created_by,t.domain,'registrar_custody',t.request_reference,t.baseline);raise exception 'expected conflict';exception when others then if sqlerrm='expected conflict' then raise;end if;end;
 begin perform public.portal_create_ownership_task('bbbbbbbb-0000-4000-8000-000000000009','aaaaaaaa-0000-4000-8000-000000000002',t.domain,t.kind,'fixture',t.baseline);raise exception 'expected client denial';exception when others then if sqlerrm='expected client denial' then raise;end if;end;
 begin perform public.portal_progress_ownership_task('cccccccc-0000-4000-8000-000000000001',t.created_by,t.id,0,'verified','fixture');raise exception 'expected completion denial';exception when others then if sqlerrm='expected completion denial' then raise;end if;end;
 begin perform public.portal_progress_ownership_task('cccccccc-0000-4000-8000-000000000001',t.created_by,t.id,0,'awaiting_registrar_confirmation','fixture');raise exception 'expected consent gate';exception when others then if sqlerrm='expected consent gate' then raise;end if;end;
 t:=public.portal_progress_ownership_task('cccccccc-0000-4000-8000-000000000002',t.created_by,t.id,0,'consent_recorded','fixture-consent');
 perform public.portal_progress_ownership_task('cccccccc-0000-4000-8000-000000000002',t.created_by,t.id,0,'consent_recorded','fixture-consent');
 if (select count(*) from public.portal_ownership_task_events)<>2 or t.revision<>1 then raise exception 'duplicate progress';end if;
 begin perform public.portal_progress_ownership_task('cccccccc-0000-4000-8000-000000000003',t.created_by,t.id,0,'review_required','fixture');raise exception 'expected stale denial';exception when others then if sqlerrm='expected stale denial' then raise;end if;end;
 t:=public.portal_progress_ownership_task('cccccccc-0000-4000-8000-000000000004',t.created_by,t.id,1,'awaiting_registrar_confirmation','fixture-provider');
 if t.revision<>2 or t.status<>'awaiting_registrar_confirmation' then raise exception 'progress mismatch';end if;
 if has_table_privilege('authenticated','public.portal_ownership_tasks','SELECT') or has_function_privilege('authenticated','public.portal_progress_ownership_task(uuid,uuid,uuid,integer,text,text)','EXECUTE') then raise exception 'client access exposed';end if;
 if has_table_privilege('service_role','public.portal_ownership_task_events','UPDATE,DELETE') then raise exception 'event mutation exposed';end if;
 if (select count(*) from public.portal_audit)<>3 then raise exception 'atomic audit mismatch';end if;
end $$;
