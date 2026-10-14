import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {projectClients} from './lib/supabase-access.mjs';
const origin='https://stackendbox-production.stackendbox.workers.dev',prefix='/client-portal/api/';
const email='abdullahlp114@gmail.com',clientId='be7cfb62-86b7-475c-82c5-d60ed1366999';
const metrics=[],jar=new Map();let session,stage='fixture';
const forbidden=new Set(['provider','provider_account','source_version','nameservers','contact_ids','company_id','provider_id','storage_path','audit_reason','assigned_by','created_by','supplier_minor','fees_minor','checkout_id','checkout_url','payment_id']);
function inspect(value){
  if(Array.isArray(value)){value.forEach(inspect);return;}
  if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)){if(forbidden.has(key))throw Error('private_field_exposed');inspect(child);}
}
async function request(path,body,expected=200){
  const start=performance.now();
  const response=await fetch(origin+prefix+path,{method:body?'POST':'GET',headers:{Origin:origin,...(jar.size?{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(30000)});
  for(const cookie of response.headers.getSetCookie()){
    if(cookie.startsWith('sb-')&&(!/HttpOnly/i.test(cookie)||!/Secure/i.test(cookie)||!/SameSite=Lax/i.test(cookie)))throw Error('cookie_protection_missing');
    const pair=cookie.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1));
  }
  const text=await response.text();
  const timing=Object.fromEntries([...(response.headers.get('server-timing')||'').matchAll(/\b(auth_user|account|backend);dur=([0-9.]+)/g)].map(match=>[match[1],Number(match[2])]));
  metrics.push({path,status:response.status,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(text),serverTimingMs:timing});
  if(response.status!==expected)throw Error('unexpected_status');
  return response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):text;
}
try{
  const {admin,newSession}=await projectClients();
  const member=await admin.from('portal_memberships').select('user_id,portal_clients(business_name),portal_accounts(approved_email,role,active)').eq('client_id',clientId).single();
  if(member.error||member.data?.portal_accounts?.approved_email!==email||member.data.portal_accounts.role!=='client'||!member.data.portal_accounts.active||!member.data.portal_clients?.business_name.startsWith('TEST ONLY '))throw Error('fixture_mismatch');
  stage='authorized_session';
  const link=await admin.auth.admin.generateLink({type:'magiclink',email});session=newSession();
  if(link.error||!link.data.properties?.hashed_token)throw Error('session_unavailable');
  const auth=await session.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'email'});
  if(auth.error||!auth.data.session||auth.data.user?.id!==member.data.user_id)throw Error('session_unavailable');
  stage='session_cookie_boundary';
  await request('auth/session',{access_token:auth.data.session.access_token,refresh_token:auth.data.session.refresh_token});
  stage='customer_contract';let invoice;
  for(const section of ['dashboard','domains','websites','renewals','billing','requests','documents','settings']){
    const data=await request(`data?section=${section}`);inspect(data);
    if(data.account?.user_id!==member.data.user_id)throw Error('identity_mismatch');
    for(const rows of Object.values(data))if(Array.isArray(rows))for(const row of rows)if(row?.client_id&&row.client_id!==clientId)throw Error('tenant_mismatch');
    if(section==='domains'&&!data.domains.some(d=>d.name==='test123.buzz'&&d.expiration_date&&d.auto_renew===false))throw Error('verified_domain_missing');
    if(section==='websites'&&!data.websites.length)throw Error('saved_website_missing');
    if(section==='requests'&&!data.messages.length)throw Error('saved_messages_missing');
    if(section==='billing')invoice=data.invoices.find(i=>i.status!=='draft');
  }
  inspect(await request('domains/test123.buzz'));
  stage='domain_read';const live=await request('domains/test123.buzz/manage');inspect(live);
  if(live.changesEnabled!==false||!live.detail.expirationDate)throw Error('domain_gate_invalid');
  stage='authorization';
  await request('admin/workspace',undefined,403);
  await request('domains/dubaicarrecovery.site',undefined,404);
  await request('domains/test123.buzz/unrecognized',undefined,404);
  const other=await session.from('portal_domains').select('id').eq('name','dubaicarrecovery.site');
  if(other.error||other.data.length)throw Error('direct_rls_failure');
  const privatePrices=await session.from('portal_pricing').select('id');
  if(!privatePrices.error&&privatePrices.data.length)throw Error('supplier_price_rls_failure');
  if(invoice){const receipt=await request(`invoices/${invoice.id}/download`);if(typeof receipt!=='string'||!receipt.includes('StackEndBox'))throw Error('receipt_failed');}
  stage='deployed_artifacts';
  const artifacts={};
  for(const file of ['portal.js','portal.css','release.json']){
    const response=await fetch(`${origin}/client-portal/_assets/${file}`,{signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error('artifact_unavailable');
    const bytes=Buffer.from(await response.arrayBuffer()),local=await readFile(`dist/static/${file}`);
    const hash=value=>createHash('sha256').update(value).digest('hex');
    if(hash(bytes)!==hash(local))throw Error('artifact_mismatch');artifacts[file]=hash(bytes);
  }
  const sorted=metrics.filter(m=>m.path.startsWith('data?')).map(m=>m.ms).sort((a,b)=>a-b);
  const report={at:new Date().toISOString(),origin,commit:JSON.parse(await readFile('dist/static/release.json','utf8')).commit,customerDtoPassed:true,privateFieldsAbsent:true,assignedDomainPresent:true,storedWebsiteAndSupportPresent:true,unassignedDomainDenied:true,adminDenied:true,directRlsPassed:true,receiptDownload:!!invoice,liveChangesDisabled:true,artifacts,medianDataMs:sorted[Math.floor(sorted.length/2)],maxDataMs:sorted.at(-1),metrics,scope:'One existing authorized test tenant, one SDK email-token session, read-only hosted requests. No password-login load claim, new accounts, notifications or registrar mutations.'};
  await writeFile(process.env.PORTAL_CONTRACT_REPORT||'docs/portal/customer-contract-2026-10-14.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,metrics:undefined,artifacts:undefined}));
}catch(error){const reason=['cookie_protection_missing','session_unavailable','unexpected_status','private_field_exposed','artifact_unavailable','artifact_mismatch','tenant_mismatch','identity_mismatch','verified_domain_missing','saved_website_missing','saved_messages_missing','domain_gate_invalid','direct_rls_failure','supplier_price_rls_failure'].includes(error.message)?error.message:'diagnostic_withheld';console.error(JSON.stringify({error:'customer_contract_failed',reason,stage,metrics,sensitiveOutputWithheld:true}));process.exitCode=1;}
finally{if(session)await session.auth.signOut({scope:'local'}).catch(()=>{});}
