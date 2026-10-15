begin;
do $$ declare source text;before_text text;begin
 source:=pg_get_functiondef('public.portal_begin_provisioning(uuid,uuid,jsonb)'::regprocedure);
 before_text:='if r.input is distinct from p_input then';
 if position(before_text in source)=0 then raise exception 'Unexpected provisioning predicate';end if;
 execute replace(source,before_text,'if r.actor_id<>p_actor or r.input is distinct from p_input then');
 source:=pg_get_functiondef('public.portal_commit_provisioning(uuid,uuid)'::regprocedure);
 before_text:='if d is not null then';
 if position(before_text in source)=0 then raise exception 'Unexpected domain provisioning block';end if;
 source:=replace(source,before_text,'if d is not null then if not public.portal_actor_can(r.actor_id,''domains.assign'') then raise exception ''Domain assignment permission required'';end if;');
 before_text:='if w is not null and w<>''null''::jsonb then';
 if position(before_text in source)=0 then raise exception 'Unexpected website provisioning block';end if;
 execute replace(source,before_text,'if w is not null and w<>''null''::jsonb then if not public.portal_actor_can(r.actor_id,''services.write'') then raise exception ''Website assignment permission required'';end if;');
end $$;
insert into public.portal_schema_releases(version) values('202610150002');
commit;
