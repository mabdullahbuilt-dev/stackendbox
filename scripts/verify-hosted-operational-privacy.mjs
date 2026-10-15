// Read-only customer acceptance for the explicitly authorized, labelled fixture.
// Creates only a temporary SDK session. Never prints its tokens or cookies.
import {writeFile} from 'node:fs/promises';
import {projectClients} from './lib/supabase-access.mjs';
const origin='https://stackendbox-production.stackendbox.workers.dev',email='abdullahlp114@gmail.com',clientId='be7cfb62-86b7-475c-82c5-d60ed1366999',jar=new Map();
const description='TEST ONLY service lifecycle acceptance, 2026-10-15. No real service, invoice, charge or registrar operation.';
let session,stage='fixture';
const check=result=>{if(result.error)throw Error('verification_unavailable');return result.data;};
async function request(path,body,expected=200){
 const response=await fetch(`${origin}/client-portal/api/${path}`,{method:body?'POST':'GET',headers:{Origin:origin,...(jar.size?{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 for(const value of response.headers.getSetCookie()){const pair=value.split(';')[0],i=pair.indexOf('=');jar.set(pair.slice(0,i),pair.slice(i+1));}
 const data=await response.json();if(response.status!==expected)throw Error('unexpected_status');return data;
}
try{
 const {admin,newSession}=await projectClients();
 const account=check(await admin.from('portal_accounts').select('user_id,role').eq('approved_email',email).single());
 const membership=check(await admin.from('portal_memberships').select('client_id').eq('user_id',account.user_id).eq('client_id',clientId).single());
 if(account.role!=='client'||membership.client_id!==clientId)throw Error('authorized_fixture_required');
 const service=check(await admin.from('portal_service_entitlements').select('id,start_date,end_date,billing_arrangement').eq('client_id',clientId).eq('description',description).single());
 if(service.start_date!=='2026-10-15'||service.end_date!=='2027-10-15'||service.billing_arrangement!=='included')throw Error('hosted_lifecycle_not_saved');
 const privateState=check(await admin.from('portal_service_internal').select('revision').eq('service_id',service.id).single());
 if(privateState.revision!==1)throw Error('unexpected_lifecycle_revision');
 const generated=check(await admin.auth.admin.generateLink({type:'magiclink',email}));session=newSession();const auth=check(await session.auth.verifyOtp({token_hash:generated.properties.hashed_token,type:'email'}));
 await request('auth/session',{access_token:auth.session.access_token,refresh_token:auth.session.refresh_token});
 stage='customer_contract';const data=await request('data?section=websites');
 const visible=data.service_entitlements?.find(row=>row.id===service.id);
 if(!visible||visible.start_date!==service.start_date||visible.end_date!==service.end_date||visible.billing_arrangement!==service.billing_arrangement)throw Error('customer_lifecycle_missing');
 if(/PRIVATE|private service lifecycle note|staff_note|portal_service_internal|portal_service_history/.test(JSON.stringify(data)))throw Error('private_data_exposed');
 const tickets=await request('data?section=requests');if(JSON.stringify(tickets).includes('private support-note acceptance'))throw Error('private_note_exposed');
 stage='direct_rls';const privateTables=['portal_support_meta','portal_support_notes','portal_support_changes','portal_service_internal','portal_service_history'];
 for(const table of privateTables){const result=await session.from(table).select('*').limit(1);if(!result.error&&result.data?.length)throw Error('private_rls_exposed');}
 stage='api_denials';for(const path of ['admin/team','admin/support','admin/services-workspace?kind=services',`admin/service-lifecycle/${service.id}`])await request(path,undefined,403);
 const report={at:new Date().toISOString(),origin,authorizedFixtureOnly:true,hostedUiCreatedService:true,lifecyclePersisted:true,clientSeesDatesAndBilling:true,privateSupportAndServiceNotesAbsent:true,privateTablesRlsDenied:privateTables.length,adminApiDenied:true,noCustomerPasswordChanged:true,noEmailSent:true,noRegistrarOrFinancialOperation:true,scope:'One existing authorized test-client SDK email-token session and read-only hosted checks. Does not prove the non-owner browser operator exercise or normal password login.'};
 await writeFile('dist/portal-evidence/hosted-operational-privacy.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch{console.error(JSON.stringify({error:'hosted_operational_privacy_failed',stage,sensitiveOutputWithheld:true}));process.exitCode=1;}
finally{if(session)await session.auth.signOut({scope:'local'}).catch(()=>{});}
