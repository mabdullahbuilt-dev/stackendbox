// Read-only validation of the deployed database relationships used by the
// summary. This does not impersonate an administrator browser/MFA session.
import {projectClients} from './lib/supabase-access.mjs';
import {writeFile} from 'node:fs/promises';
const {admin:db}=await projectClients(),at=new Date().toISOString(),until=new Date(Date.now()+30*86400000).toISOString(),scopes={};
try{
  for(const scope of ['customers','test']){
    const filter=(q,key)=>scope==='test'?q.ilike(key,'TEST ONLY %'):q.not(key,'ilike','TEST ONLY %');
    const related=table=>db.from(`portal_${table}`).select('client_id,portal_clients!inner(business_name)',{count:'exact',head:true});
    const queries={
      active_clients:filter(db.from('portal_clients').select('*',{count:'exact',head:true}).eq('status','active'),'business_name'),
      assigned_domains:filter(related('domain_assignments'),'portal_clients.business_name'),
      expires_30_days:filter(db.from('portal_domains').select('id,portal_domain_assignments!inner(portal_clients!inner(business_name))',{count:'exact',head:true}).eq('protected',false).gte('expiration_date',at).lte('expiration_date',until),'portal_domain_assignments.portal_clients.business_name'),
      unpaid_invoices:filter(related('invoices').eq('status','issued'),'portal_clients.business_name'),
      open_support:filter(related('requests').not('status','in','(completed,closed)'),'portal_clients.business_name'),
    };
    const results=await Promise.all(Object.values(queries));
    if(results.some(r=>r.error||r.count===null))throw Error('summary_query_failed');
    scopes[scope]=Object.fromEntries(Object.keys(queries).map((key,index)=>[key,results[index].count]));
  }
  const total=await db.from('portal_clients').select('id',{count:'exact',head:true}).eq('status','active');
  if(total.error||scopes.customers.active_clients+scopes.test.active_clients!==total.count)throw Error('partition_mismatch');
  const result={at,scopes,activeClientPartitionVerified:true,readOnly:true,hostedAdminMfaRetested:false};
  await writeFile('docs/portal/summary-scopes-2026-10-14.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch{console.error('Summary query validation failed. Sensitive diagnostics withheld.');process.exitCode=1;}
