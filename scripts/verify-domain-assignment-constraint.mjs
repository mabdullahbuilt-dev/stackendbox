import {query,projectClients} from './lib/supabase-access.mjs';
const domain=process.argv[2];
if(!domain||!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain))throw Error('Verified domain required');
let stage='connection';
try{
  const sql=`begin; do $$ declare d uuid; original public.portal_domain_assignments; temporary_client uuid; begin
  select id into d from public.portal_domains where name='${domain}' and provider_account='primary';
  select * into original from public.portal_domain_assignments where domain_id=d;
  if original.client_id is null then raise exception 'Acceptance domain must already be assigned'; end if;
  insert into public.portal_clients(name,business_name) values('TEST ONLY transactional duplicate probe','TEST ONLY transactional duplicate probe') returning id into temporary_client;
  begin
    insert into public.portal_domain_assignments(domain_id,client_id,legal_holder,holder_arrangement) values(d,temporary_client,original.legal_holder,original.holder_arrangement);
    raise exception 'Duplicate assignment was allowed';
  exception when unique_violation then null;
  end;
  if (select client_id from public.portal_domain_assignments where domain_id=d)<>original.client_id then raise exception 'Original assignment changed'; end if;
  end $$;
  rollback;
  select true as duplicate_rejected,
    (select count(*)=1 from public.portal_domain_assignments a join public.portal_domains d on d.id=a.domain_id where d.name='${domain}' and d.provider_account='primary') as original_assignment_present,
    (select count(*)=0 from public.portal_clients where name='TEST ONLY transactional duplicate probe') as temporary_client_rolled_back;`;
  stage='transaction';
  const result=await query(sql);
  stage='evidence';
  const evidence=result[0];
  if(!evidence?.duplicate_rejected||!evidence.original_assignment_present||!evidence.temporary_client_rolled_back)throw Error('Constraint evidence unavailable');
  const {admin}=await projectClients();
  const retained=await admin.from('portal_domains').select('id,portal_domain_assignments(client_id)').eq('name',domain).eq('provider_account','primary').single();
  if(retained.error||!retained.data?.portal_domain_assignments)throw Error('Persistence verification failed');
  console.log(JSON.stringify({domain,...evidence,postTransactionAssignmentPresent:true,registrarOperationsPerformed:false,authIdentitiesCreated:false}));
}catch(error){console.error(JSON.stringify({error:'constraint_acceptance_failed',stage,code:typeof error.code==='string'?error.code:undefined,sqlError:stage==='transaction'?(error.stderr||'').match(/ERROR:\s+([^\r\n]+)/)?.[1]:undefined,sensitiveOutputWithheld:true}));process.exitCode=1;}
