begin;
alter table public.portal_invoices alter column order_id drop not null;
create policy service_invoice_visibility on public.portal_invoices as restrictive for select to authenticated using(public.portal_admin() or order_id is not null or status<>'draft');
create function public.portal_create_service_invoice(p_id uuid,p_client uuid,p_amount bigint,p_description text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare i public.portal_invoices;
begin
 if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required'; end if;
 if not exists(select 1 from public.portal_clients where id=p_client and status='active') or p_amount not between 1 and 100000000 or length(trim(p_description)) not between 1 and 500 then raise exception 'Invalid invoice'; end if;
 select * into i from public.portal_invoices where id=p_id for update;
 if found then
   if i.client_id=p_client and i.amount_minor=p_amount and i.description=trim(p_description) and i.order_id is null then return; end if;
   raise exception 'Invoice idempotency conflict';
 end if;
 insert into public.portal_invoices(id,client_id,order_id,amount_minor,currency,status,description) values(p_id,p_client,null,p_amount,'usd','draft',trim(p_description));
 insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'service_invoice_drafted',p_id::text,jsonb_build_object('client_id',p_client,'amount_minor',p_amount));
end $$;
create function public.portal_transition_service_invoice(p_id uuid,p_action text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
declare i public.portal_invoices;
begin
 if not exists(select 1 from public.portal_accounts where user_id=p_actor and role='super_admin' and active) then raise exception 'Administrator required'; end if;
 select * into i from public.portal_invoices where id=p_id for update;
 if not found or i.order_id is not null then raise exception 'Service invoice required'; end if;
 if p_action not in ('issued','void') then raise exception 'Unsupported invoice transition'; end if;
 if i.status=p_action then return; end if;
 if i.status not in ('draft','issued') then raise exception 'Invoice cannot be changed'; end if;
 update public.portal_invoices set status=p_action where id=p_id;
 insert into public.portal_audit(actor_id,action,target_id,detail) values(p_actor,'service_invoice_status_changed',p_id::text,jsonb_build_object('status',p_action,'payment_not_confirmed',true));
end $$;
revoke all on function public.portal_create_service_invoice(uuid,uuid,bigint,text,uuid),public.portal_transition_service_invoice(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.portal_create_service_invoice(uuid,uuid,bigint,text,uuid),public.portal_transition_service_invoice(uuid,text,uuid) to service_role;
insert into public.portal_schema_releases(version) values('202610130003');
commit;
