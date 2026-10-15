// Real disposable Supabase Auth/TOTP, current API handler and RLS. Never hosted.
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {rolePermissions,routePermission} from '../lib/portal/permissions.ts';
const state=JSON.parse(await readFile('dist/isolated-auth/local-status.json','utf8')),local=state.env;
if(state.runtime!=='native'||!state.identity?.project_root?.startsWith('/tmp/stackendbox-auth-')||!/^http:\/\/127\.0\.0\.1:\d+$/.test(local.API_URL))throw Error('disposable_local_stack_required');
const options={auth:{persistSession:false,autoRefreshToken:false}},db=createClient(local.API_URL,local.SECRET_KEY,options),fresh=()=>createClient(local.API_URL,local.PUBLISHABLE_KEY,options),run=promisify(execFile);
const origin='https://isolated.stackendbox.invalid',bridge=randomBytes(32).toString('hex'),check=r=>{if(r.error)throw Error('local_'+(r.error.code||r.error.status||'database_error'));return r.data;};
function totp(secret){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of secret.replace(/=+$/,''))bits+=alphabet.indexOf(c).toString(2).padStart(5,'0');const key=Buffer.from(bits.match(/.{8}/g).map(v=>parseInt(v,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',key).update(counter).digest(),offset=h.at(-1)&15;return String((h.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
async function user(role,name){const email=`${randomUUID()}@staff-fixture.invalid`,password=randomBytes(24).toString('base64url'),u=check(await db.auth.admin.createUser({email,password,email_confirm:true})).user;check(await db.from('portal_accounts').insert({user_id:u.id,approved_email:email,name,role}));const session=fresh();check(await session.auth.signInWithPassword({email,password}));return {id:u.id,email,session,ip:`2001:db8:${randomBytes(10).toString('hex').match(/.{4}/g).join(':')}:1`,jar:new Map()};}
async function mfa(account){const factor=check(await account.session.auth.mfa.enroll({factorType:'totp',friendlyName:'DISPOSABLE ROLE TEST'}));check(await account.session.auth.mfa.challengeAndVerify({factorId:factor.id,code:totp(factor.totp.secret)}));}
const fixtures=[],outcomes=[];let handleEdge,stage='build';
const nativeFetch=globalThis.fetch,providerCalls=[],mailCalls=[],contactId=randomUUID().replaceAll('-','');
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.origin===new URL(local.API_URL).origin)return nativeFetch(input,init);
 if(url.origin==='https://api.brevo.com'&&url.pathname==='/v3/smtp/email'){mailCalls.push(JSON.parse(init.body));return Response.json({messageId:`isolated-${randomUUID()}`});}
 if(url.origin==='https://spaceship.dev'&&(!init?.method||init.method==='GET')){
  providerCalls.push(url.pathname);
  if(url.pathname===`/api/v1/contacts/${contactId}`)return Response.json({firstName:'Synthetic',lastName:'Holder',email:'fixture@stackendbox.invalid',address1:'Test address',city:'Test city',country:'PK',phone:'+92.1234567890'});
  const name=decodeURIComponent(url.pathname.split('/').at(-1));
  if(/^role-[a-f0-9-]+\.invalid$/.test(name))return Response.json({name,autoRenew:false,isPremium:false,lifecycleStatus:'registered',registrationDate:'2026-10-01T00:00:00Z',expirationDate:'2027-10-01T00:00:00Z',verificationStatus:'success',contacts:{registrant:contactId}});
 }
 throw Error('local_unapproved_provider_request');
};
async function request(account,path,body,expected=200){const response=await handleEdge(new Request(`${origin}/api/portal/${path}`,{method:body?'POST':'GET',headers:{Origin:origin,'x-stackendbox-bridge':bridge,'x-forwarded-for':account.ip,...(account.jar.size?{Cookie:[...account.jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],i=pair.indexOf('=');account.jar.set(pair.slice(0,i),pair.slice(i+1));}const data=await response.json();if(response.status!==expected)throw Error(`local_api_${path.replace(/[^a-z-]/gi,'_')}_${response.status}_expected_${expected}_${data.error||'ok'}`);return data;}
async function cookie(account){const session=check(await account.session.auth.getSession()).session;await request(account,'auth/session',{access_token:session.access_token,refresh_token:session.refresh_token});}
try{
 await build({entryPoints:['platform/edge/handler.ts'],outfile:'dist/isolated-auth/staff-handler.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'local-runtime',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export {}'}));b.onResolve({filter:/^next\/(headers|server)$/},()=>({path:resolve('platform/edge/next-runtime.ts')}));}}]});
 Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:local.SECRET_KEY,NODE_ENV:'production',PORTAL_APP_URL:origin,STACKENDBOX_BRIDGE_SECRET:bridge,WHOP_MODE:'sandbox',PORTAL_SANDBOX_CHECKOUT_ENABLED:'false',DOMAIN_LIVE_PURCHASES_ENABLED:'false',DOMAIN_LIVE_RENEWALS_ENABLED:'false',DOMAIN_LIVE_MUTATIONS_ENABLED:'false',PORTAL_JOBS_ENABLED:'false'});
 Object.assign(process.env,{SPACESHIP_API_KEY:'LOCAL_FIXTURE',SPACESHIP_API_SECRET:'LOCAL_FIXTURE',BREVO_CLIENT_API_KEY:'LOCAL_FIXTURE',BREVO_CLIENT_SENDER_EMAIL:'sender@stackendbox.invalid',BREVO_CLIENT_REPLY_TO:'support@stackendbox.invalid'});
 ({handleEdge}=await import(pathToFileURL(resolve('dist/isolated-auth/staff-handler.mjs')).href));
 stage='owner';await run('wsl',['-d','Ubuntu','--','psql',local.DB_URL,'-X','-v','ON_ERROR_STOP=1','-c','update public.portal_staff_rollout set enabled=false where id'],{windowsHide:true,timeout:30000});const owner=await user('super_admin','DISPOSABLE OWNER');fixtures.push(owner);await mfa(owner);await cookie(owner);
 const clientId=randomUUID();check(await db.from('portal_clients').insert({id:clientId,name:'Role test customer',business_name:'TEST ONLY Role security'}));
 const customer=await user('client','Role test customer');fixtures.push(customer);check(await db.from('portal_memberships').insert({user_id:customer.id,client_id:clientId}));
 const reqId=randomUUID();check(await db.from('portal_requests').insert({id:reqId,client_id:clientId,created_by:customer.id,category:'General support',subject:'TEST ONLY role access',description:'Synthetic local request'}));
 check(await db.from('portal_invoices').insert({client_id:clientId,amount_minor:100,currency:'usd',status:'draft',description:'TEST ONLY private draft'}));
 stage='disabled_gate';const first=await user('staff','DISPOSABLE SUPPORT');fixtures.push(first);
 await request(owner,'admin/team/change',{idempotency_key:randomUUID(),user_id:first.id,role:'support_staff',active:true,expected_revision:0});await mfa(first);await cookie(first);await request(first,'admin/workspace?section=requests',undefined,403);
 stage='isolated_enable';await run('wsl',['-d','Ubuntu','--','psql',local.DB_URL,'-X','-v','ON_ERROR_STOP=1','-c','update public.portal_staff_rollout set enabled=true where id'],{windowsHide:true,timeout:30000});
 for(const role of Object.keys(rolePermissions)){
  stage='role_'+role;const account=await user('staff',`DISPOSABLE ${role}`);fixtures.push(account);
  await request(owner,'admin/team/change',{idempotency_key:randomUUID(),user_id:account.id,role,active:true,expected_revision:0});await cookie(account);await request(account,'auth/identity?admin=1',undefined,403);await mfa(account);await cookie(account);
  const identity=await request(account,'auth/identity?admin=1');if(JSON.stringify(identity.permissions)!==JSON.stringify(rolePermissions[role]))throw Error('local_capability_mismatch');
  const sections={domains:'domains.read',websites:'services.read',billing:'billing.read',requests:'support.read'};
  for(const [section,cap] of Object.entries(sections))await request(account,`admin/workspace?section=${section}`,undefined,rolePermissions[role].includes(cap)?200:403);
  for(const path of ['admin/team','admin/data','admin/health'])await request(account,path,undefined,403);
  await request(account,'admin/team/change',{idempotency_key:randomUUID(),user_id:account.id,role:'operations_admin',active:true,expected_revision:1},403);
  const invoice=await account.session.from('portal_invoices').select('id').eq('client_id',clientId);check(invoice);if(Boolean(invoice.data.length)!==rolePermissions[role].includes('billing.read'))throw Error('local_invoice_rls_mismatch');
  const support=await account.session.from('portal_requests').select('id').eq('id',reqId);check(support);if(Boolean(support.data.length)!==rolePermissions[role].includes('support.read'))throw Error('local_support_rls_mismatch');
  const direct=await account.session.rpc('portal_change_staff',{p_id:randomUUID(),p_actor:owner.id,p_target:account.id,p_role:'operations_admin',p_active:true,p_revision:1});if(!direct.error)throw Error('local_privileged_rpc_exposed');
  if(!(await account.session.from('portal_accounts').update({role:'super_admin'}).eq('user_id',account.id)).error)throw Error('local_account_role_write_exposed');
  if(!(await account.session.from('portal_staff_grants').select('*')).error)throw Error('local_private_grants_exposed');
  const deniedRoute={operations_admin:'admin/team/change',domain_manager:'admin/invoices',billing_manager:'admin/request-status',support_staff:'admin/import-domain',auditor:'admin/invoices'}[role];if(rolePermissions[role].includes(routePermission(deniedRoute,'POST')))throw Error('local_denied_matrix_invalid');await request(account,deniedRoute,{},403);
  if(role==='operations_admin'){
   const provision=await request(account,'admin/clients',{idempotency_key:randomUUID(),name:'TEST ONLY provisioned customer',business_name:'TEST ONLY role provisioning',email:`client-${randomUUID()}@staff-fixture.invalid`,credential_mode:'invitation'});
   if(provision.state!=='invited'||!provision.client_id)throw Error('local_staff_provisioning_failed');
   await request(account,'admin/websites',{idempotency_key:randomUUID(),client_id:clientId,name:'TEST ONLY role website',url:'https://example.com'});
   await request(account,'admin/services',{idempotency_key:randomUUID(),client_id:clientId,service:'Maintenance',description:'TEST ONLY agreed service',status:'included'});
  }
  if(role==='domain_manager'){
   await request(account,'admin/clients',{idempotency_key:randomUUID(),name:'TEST ONLY rejected website',business_name:'TEST ONLY role boundary',email:`reject-${randomUUID()}@staff-fixture.invalid`,credential_mode:'invitation',website:{name:'Unauthorized bundled service',url:'https://example.com'}},403);
   const domain=`role-${randomUUID()}.invalid`,input={idempotency_key:randomUUID(),domain,email:customer.email,account_mode:'existing',client_id:clientId,rights_confirmed:true};
   await request(account,'admin/domain-handoff-preview',{domain,email:customer.email,account_mode:'existing',client_id:clientId});
   await request(account,'admin/activate-domain-client',input);await request(account,'admin/activate-domain-client',input);
   if(check(await db.from('portal_domain_assignments').select('domain_id').eq('client_id',clientId)).length!==1)throw Error('local_assignment_deduplication_failed');
  }
  if(role==='billing_manager'){
   const input={idempotency_key:randomUUID(),client_id:clientId,amount_minor:100,description:'TEST ONLY role invoice'};await request(account,'admin/invoices',input);await request(account,'admin/invoices',input);
  }
  if(role==='support_staff'){
   const input={idempotency_key:randomUUID(),body:'TEST ONLY client-visible staff reply'};await request(account,`requests/${reqId}/messages`,input);await request(account,`requests/${reqId}/messages`,input);
   const directory=await request(account,'admin/clients');if(directory.clients.some(c=>c.portal_domain_assignments?.length||c.portal_websites?.length||c.portal_service_entitlements?.length)||directory.provisioning.length)throw Error('local_support_directory_metadata_leak');
  }
  outcomes.push({role,realPasswordLogin:true,totpMfaRequired:true,allowedReads:true,permittedWrites:role!=='auditor',negativeApiTests:true,directRls:true,noSelfPromotion:true});
 }
 stage='active_session_role_change';await request(owner,'admin/team/change',{idempotency_key:randomUUID(),user_id:first.id,role:'auditor',active:true,expected_revision:1});await request(first,'admin/request-status',{id:reqId,status:'under_review'},403);await request(first,'admin/workspace?section=websites');
 stage='suspension';const change={idempotency_key:randomUUID(),user_id:first.id,role:'auditor',active:false,expected_revision:2};await request(owner,'admin/team/change',change);await request(owner,'admin/team/change',change);await request(first,'auth/identity?admin=1',undefined,403);if(check(await first.session.from('portal_requests').select('id')).length)throw Error('local_revoked_rls_access');
 await request(owner,'admin/team/change',{idempotency_key:randomUUID(),user_id:owner.id,role:'auditor',active:false,expected_revision:0},409);
 stage='invitation';const invite={idempotency_key:randomUUID(),email:`invite-${randomUUID()}@staff-fixture.invalid`,name:'DISPOSABLE INVITED SUPPORT',role:'support_staff'};
 const before=mailCalls.length;await request(owner,'admin/team/invite',invite);await request(owner,'admin/team/invite',invite);if(mailCalls.length-before!==1)throw Error('local_duplicate_staff_email');
 const sent=mailCalls.at(-1).textContent,hash=new URL(sent.split('\n').find(line=>line.startsWith(origin))).hash,params=new URLSearchParams(hash.slice(1)),activated=fresh();
 check(await activated.auth.verifyOtp({token_hash:params.get('token_hash'),type:'invite'}));check(await activated.auth.updateUser({password:randomBytes(24).toString('base64url')}));await activated.auth.signOut({scope:'local'});
 const report={at:new Date().toISOString(),scope:'Disposable native Supabase plus current API handler. API/RLS acceptance only, not the full browser operator exercise. Spaceship and Brevo are labelled local fixtures, with real local Supabase transactions.',roles:outcomes,rolloutGateDenied:true,currentSessionRoleChanges:true,immediateSuspension:true,suspensionRetryIdempotent:true,ownerProtected:true,staffInvitationOneEmail:true,realSupabaseInvitationAccepted:true,fixtureDomainAssignment:true,permittedServiceInvoiceAndReplyWrites:true,hostedPrivilegesEnabled:false,realProvidersInvoked:false};await writeFile('dist/portal-evidence/isolated-staff-authorization.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){console.error(JSON.stringify({error:'isolated_staff_verification_failed',stage,reason:/^local_/.test(error.message)?error.message:'details_withheld'}));process.exitCode=1;}
finally{globalThis.fetch=nativeFetch;await run('wsl',['-d','Ubuntu','--','psql',local.DB_URL,'-X','-v','ON_ERROR_STOP=1','-c','update public.portal_staff_rollout set enabled=false where id'],{windowsHide:true,timeout:30000});for(const account of fixtures)await account.session.auth.signOut({scope:'local'});}
