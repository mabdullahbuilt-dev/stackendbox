begin;
create or replace function public.portal_edit_client(p_client uuid,p_name text,p_business text,p_status text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required'; end if;
  if p_status not in ('active','suspended') or length(trim(p_name)) not between 1 and 100 or length(trim(p_business)) not between 1 and 150 then raise exception 'Invalid client details'; end if;
  perform 1 from public.portal_clients where id=p_client for update;
  if not found then raise exception 'Client not found'; end if;
  update public.portal_clients set name=trim(p_name),business_name=trim(p_business),status=p_status where id=p_client;
  insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'client_details_updated',p_client::text,jsonb_build_object('status',p_status,'login_email_unchanged',true));
end $$;
revoke all on function public.portal_edit_client(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.portal_edit_client(uuid,text,text,text,uuid) to service_role;
insert into public.portal_schema_releases(version) values('202610130002') on conflict do nothing;
commit;
