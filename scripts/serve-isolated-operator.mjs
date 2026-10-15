// Loopback-only UI exercise. Real local Supabase/Auth/RLS and application APIs.
// Provider transports are explicit fixtures. No hosted credentials are loaded.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomBytes,randomUUID,createHmac} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createClient} from '@supabase/supabase-js';
import {build} from 'esbuild';
import {buildOperatorUi} from './build-isolated-operator-ui.mjs';
const port=4179,origin=`http://127.0.0.1:${port}`,internal='https://operator-fixture.stackendbox.invalid',output=resolve('dist/isolated-operator'),run=promisify(execFile);
const state=JSON.parse(await readFile('dist/isolated-auth/local-status.json','utf8')),local=state.env;
if(state.runtime!=='native'||!state.identity?.project_root?.startsWith('/tmp/stackendbox-auth-')||!/^http:\/\/127\.0\.0\.1:\d+$/.test(local.API_URL))throw Error('disposable_local_stack_required');
const options={auth:{persistSession:false,autoRefreshToken:false}},db=createClient(local.API_URL,local.SECRET_KEY,options),fresh=()=>createClient(local.API_URL,local.PUBLISHABLE_KEY,options),check=result=>{if(result.error)throw Error('isolated_database_failed');return result.data;};
const resumeId=process.env.ISOLATED_OPERATOR_RUN_ID;
if(resumeId&&!/^[a-f0-9]{8}$/.test(resumeId))throw Error('invalid_isolated_resume_id');
const runId=resumeId||randomUUID().slice(0,8),fixtureDomain=`operator-${runId}.invalid`,recoveryDomain=`recovery-${runId}.invalid`,contactId=randomUUID().replaceAll('-',''),bridge=randomBytes(32).toString('hex'),mail=[],events=[],faults={provision_response:false,handoff_response:false};
if(resumeId){try{const previous=JSON.parse(await readFile(output+'/ui-request-evidence.json','utf8'));if(previous.runId===runId)events.push(...previous.events);}catch{}}
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
 if(url.origin===new URL(local.API_URL).origin)return realFetch(input,init);
 if(url.origin==='https://api.brevo.com'&&url.pathname==='/v3/smtp/email'&&init?.method==='POST'){
  const item=JSON.parse(init.body);if(!item.to?.every(to=>to.email.endsWith('.invalid')))throw Error('fixture_recipient_required');
  const id=`fixture-mail-${randomUUID()}`;mail.push({id,email:item.to[0].email,subject:item.subject,text:item.textContent||''});return Response.json({messageId:id});
 }
 if(url.origin==='https://challenges.cloudflare.com'&&url.pathname.endsWith('/siteverify'))return Response.json({success:JSON.parse(init.body).response==='isolated-fixture-verification',hostname:new URL(internal).hostname});
 if(url.origin==='https://api.pwnedpasswords.com')return new Response('00000000000000000000000000000000000:0');
 if(url.origin==='https://spaceship.dev'&&(!init?.method||init.method==='GET')){
  if(url.pathname===`/api/v1/contacts/${contactId}`)return Response.json({firstName:'Synthetic',lastName:'Agency',organization:'ISOLATED FIXTURE AGENCY',email:'holder@operator.invalid',address1:'Fixture street',city:'Fixture city',country:'PK',phone:'+92.1234567890'});
  const domain=[fixtureDomain,recoveryDomain].find(name=>url.pathname===`/api/v1/domains/${name}`);
  if(domain)return Response.json({name:domain,autoRenew:false,isPremium:false,lifecycleStatus:'registered',registrationDate:'2026-10-01T00:00:00Z',expirationDate:'2027-10-01T00:00:00Z',verificationStatus:'success',contacts:{registrant:contactId},nameservers:{provider:'basic',hosts:['ns1.fixture.invalid','ns2.fixture.invalid']}});
  if([fixtureDomain,recoveryDomain].some(name=>url.pathname===`/api/v1/dns/records/${name}`))return Response.json({items:[],total:0});
 }
 throw Error('external_provider_blocked_in_isolated_exercise');
};
function totp(secret){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const c of secret.replace(/=+$/,''))bits+=alphabet.indexOf(c).toString(2).padStart(5,'0');const key=Buffer.from(bits.match(/.{8}/g).map(v=>parseInt(v,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',key).update(counter).digest(),offset=h.at(-1)&15;return String((h.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
const sessions=[];
async function setupIdentity(role,label){
 const email=`${label}-${runId}@operator.invalid`,password=randomBytes(24).toString('base64url'),user=check(await db.auth.admin.createUser({email,password,email_confirm:true})).user;
 check(await db.from('portal_accounts').insert({user_id:user.id,approved_email:email,name:`ISOLATED ${label}`,role}));
 const session=fresh();sessions.push(session);check(await session.auth.signInWithPassword({email,password}));return {id:user.id,email,session};
}
await mkdir(output,{recursive:true});
// Setup only: disposable owner and an existing fixture client. Business steps
// after this point must be performed in the application UI, not through helpers.
const owner=await setupIdentity('super_admin',`owner-${randomUUID().slice(0,8)}`);
let customer,clientId;
if(resumeId){
 const email=`existing-client-${runId}@operator.invalid`,account=check(await db.from('portal_accounts').select('user_id').eq('approved_email',email).single()),membership=check(await db.from('portal_memberships').select('client_id').eq('user_id',account.user_id).single());
 const link=check(await db.auth.admin.generateLink({type:'magiclink',email})),session=fresh();sessions.push(session);check(await session.auth.verifyOtp({type:'magiclink',token_hash:link.properties.hashed_token}));customer={id:account.user_id,email,session};clientId=membership.client_id;
}else{
 customer=await setupIdentity('client','existing-client');clientId=randomUUID();check(await db.from('portal_clients').insert({id:clientId,name:'ISOLATED EXISTING CUSTOMER',business_name:`ISOLATED OPERATOR ${runId}`}));check(await db.from('portal_memberships').insert({user_id:customer.id,client_id:clientId}));
}
const factor=check(await owner.session.auth.mfa.enroll({factorType:'totp',friendlyName:'ISOLATED OWNER SETUP'}));check(await owner.session.auth.mfa.challengeAndVerify({factorId:factor.id,code:totp(factor.totp.secret)}));
await run('wsl',['-d','Ubuntu','--','psql',local.DB_URL,'-X','-v','ON_ERROR_STOP=1','-c','update public.portal_staff_rollout set enabled=true where id'],{windowsHide:true,timeout:30000});
Object.assign(process.env,{NODE_ENV:'development',NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:local.SECRET_KEY,PORTAL_APP_URL:internal,STACKENDBOX_BRIDGE_SECRET:bridge,TURNSTILE_SECRET_KEY:'ISOLATED_FIXTURE',SPACESHIP_API_KEY:'ISOLATED_FIXTURE',SPACESHIP_API_SECRET:'ISOLATED_FIXTURE',BREVO_CLIENT_API_KEY:'ISOLATED_FIXTURE',BREVO_CLIENT_SENDER_EMAIL:'sender@operator.invalid',BREVO_CLIENT_REPLY_TO:'support@operator.invalid',WHOP_MODE:'sandbox',PORTAL_SANDBOX_CHECKOUT_ENABLED:'false',DOMAIN_LIVE_PURCHASES_ENABLED:'false',DOMAIN_LIVE_RENEWALS_ENABLED:'false',DOMAIN_LIVE_MUTATIONS_ENABLED:'false',PORTAL_JOBS_ENABLED:'false'});
await build({entryPoints:['platform/edge/handler.ts'],outfile:output+'/handler.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'isolated-runtime',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export {}'}));b.onResolve({filter:/^next\/(headers|server)$/},()=>({path:resolve('platform/edge/next-runtime.ts')}));}}]});
await buildOperatorUi();
const {handleEdge}=await import(pathToFileURL(output+'/handler.mjs').href),escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'};
// Fetch-based setup controls also work in embedded browsers that treat native
// form navigations as URL-only navigation. Business forms already use fetch.
const fixtureControls='<script>document.querySelectorAll("form").forEach(form=>form.addEventListener("submit",async event=>{event.preventDefault();const response=await fetch(form.action,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(new FormData(form))});if(response.ok)location.assign("/fixture");else document.body.append(" Fixture preparation failed. No recovery result is claimed.");}));</script>';
const server=createServer(async(req,res)=>{
 try{
  if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403).end();return;}
  const url=new URL(req.url,origin);
  if(req.method==='POST'&&req.headers.origin!==origin){res.writeHead(403).end();return;}
  if(url.pathname==='/fixture/fault'&&req.method==='POST'){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const kind=new URLSearchParams(Buffer.concat(chunks).toString()).get('kind');
   if(kind==='handoff_response')faults.handoff_response=true;
   else if(kind==='clear_faults'){faults.provision_response=false;faults.handoff_response=false;}
   else if(kind==='provision_reserved'){
    // Synthetic incomplete reservation is failure setup, never a business repair.
    // The real staff UI must create the identity/membership and recover a lost response.
    const actor=check(await db.from('portal_accounts').select('user_id').eq('approved_email',`operations-${runId}@operator.invalid`).single());
    const input={name:`ISOLATED RESUME ${runId}`,business_name:`ISOLATED RESUME ${runId}`,email:`resume-${runId}@operator.invalid`,status:'active',credential_mode:'invitation'};
    const prior=check(await db.from('portal_provisioning').select('id').eq('email',input.email).maybeSingle());
    if(!prior){const record=check(await db.rpc('portal_begin_provisioning',{p_id:randomUUID(),p_actor:actor.user_id,p_input:input}));check(await db.from('portal_provisioning').update({last_error:'ISOLATED_failure_fixture_before_identity_creation'}).eq('id',record.id));}
    faults.provision_response=true;
   }
   else if(kind==='notification'){
    const key=`isolated-notification-recovery:${runId}`,prior=check(await db.from('portal_email_outbox').select('id').eq('dedupe_key',key).maybeSingle());
    if(!prior)check(await db.from('portal_email_outbox').insert({client_id:clientId,recipient:customer.email,subject:`ISOLATED UNSENT RECOVERY ${runId}`,body:'Synthetic pre-dispatch failure fixture. No real customer message.',dedupe_key:key,status:'review_required',attempts:1,last_error:'configuration_required:BREVO_CLIENT_SENDER_EMAIL'}));
   }else{res.writeHead(400).end();return;}
   events.push({at:new Date().toISOString(),fixtureArmed:kind});res.writeHead(303,{Location:'/fixture'}).end();return;
  }
  if(url.pathname==='/fixture'){
   const links=mail.map(item=>{const line=item.text.split('\n').find(v=>v.startsWith(internal));const link=line?origin+new URL(line).pathname+new URL(line).hash:null;return `<li>${escape(item.email)}: ${escape(item.subject)}${link?` <a href="${escape(link)}">Open invitation</a>`:''}</li>`;}).join('');
   res.writeHead(200,headers).end(`<h1>ISOLATED OPERATOR EXERCISE</h1><p>Local disposable database. Spaceship, Brevo and bot verification are fixtures. This is not production acceptance.</p><p>Fixture domain: ${escape(fixtureDomain)}</p><p>Recovery domain: ${escape(recoveryDomain)}</p><p>Existing client: ${escape(customer.email)}</p><p>Invite operations staff: operations-${runId}@operator.invalid</p><p>Invite domain staff: domains-${runId}@operator.invalid</p><a href="/fixture/owner">Open setup owner session</a> | <a href="/fixture/client">Open setup existing-client session</a> | <a href="/client-portal/login">Normal login</a><h2>Failure setup, not business recovery</h2>${['provision_reserved','handoff_response','notification','clear_faults'].map(kind=>`<form method="post" action="/fixture/fault"><input type="hidden" name="kind" value="${kind}"><button>Prepare ${kind} fixture</button></form>`).join('')}<h2>Captured fixture mailbox</h2><ul>${links||'<li>No fixture mail yet</li>'}</ul><p>Refresh this page after a UI invitation. Mail never leaves this fixture.</p>${fixtureControls}`);return;
  }
  let response;
  if(['/fixture/owner','/fixture/client'].includes(url.pathname)){
   if(url.pathname.endsWith('owner'))check(await owner.session.auth.mfa.challengeAndVerify({factorId:factor.id,code:totp(factor.totp.secret)}));
   const account=url.pathname.endsWith('owner')?owner:customer,s=check(await account.session.auth.getSession()).session;
   response=await handleEdge(new Request(internal+'/api/portal/auth/session',{method:'POST',headers:{Origin:internal,'x-stackendbox-bridge':bridge,'Content-Type':'application/json'},body:JSON.stringify({access_token:s.access_token,refresh_token:s.refresh_token})}));
   if(response.status!==200)throw Error('fixture_session_failed');res.writeHead(303,{'Set-Cookie':response.headers.getSetCookie(),Location:account===owner?'/admin/team':'/client-portal/dashboard','Cache-Control':'no-store'}).end();return;
  }
  if(url.pathname.startsWith('/client-portal/api/')||url.pathname.startsWith('/api/portal/')||url.pathname==='/client-portal/auth/callback'){
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>24000)throw Error('body_limit');chunks.push(chunk);}
   const path=url.pathname.replace(/^\/client-portal\/api\//,'/api/portal/'),h=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')h.set(key,value);h.set('x-stackendbox-bridge',bridge);h.set('x-forwarded-for','127.0.0.1');if(req.method==='POST')h.set('Origin',internal);
   response=await handleEdge(new Request(internal+path+url.search,{method:req.method,headers:h,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));events.push({at:new Date().toISOString(),method:req.method,path,status:response.status});
   if(req.method==='POST'&&path==='/api/portal/admin/clients'&&response.ok&&faults.provision_response){faults.provision_response=false;response=Response.json({error:'Isolated response lost after commit. Retry the same request.'},{status:503});events.push({at:new Date().toISOString(),fixtureFault:'provision_response_lost_after_commit'});}
   if(req.method==='POST'&&path==='/api/portal/admin/activate-domain-client'&&response.ok&&faults.handoff_response){faults.handoff_response=false;response=Response.json({error:'Isolated response lost after commit. Retry the same request.'},{status:503});events.push({at:new Date().toISOString(),fixtureFault:'handoff_response_lost_after_commit'});}
  }else if(['/client-portal/_assets/portal.js','/client-portal/_assets/portal.css'].includes(url.pathname))response=new Response(await readFile(output+'/'+url.pathname.split('/').at(-1)),{headers:{'Content-Type':url.pathname.endsWith('.js')?'text/javascript':'text/css','Cache-Control':'no-store'}});
  else if(url.pathname.startsWith('/fonts/'))response=new Response(await readFile(resolve('node_modules/geist/dist/fonts',url.pathname.includes('mono')?'geist-mono/GeistMono-Variable.woff2':'geist-sans/Geist-Variable.woff2')),{headers:{'Content-Type':'font/woff2'}});
  else if(url.pathname.startsWith('/admin')||url.pathname.startsWith('/client-portal'))response=new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>ISOLATED StackEndBox operator test</title><link rel="stylesheet" href="/client-portal/_assets/portal.css"><aside style="padding:6px;background:#472b00;color:white;position:fixed;bottom:0;z-index:99999;font:12px system-ui">ISOLATED DATABASE / FIXTURE PROVIDERS <a style="color:white" href="/fixture">Test console</a></aside><div id="root"></div><script type="module" src="/client-portal/_assets/portal.js"></script>',{headers});
  else{res.writeHead(303,{Location:'/fixture'}).end();return;}
  const h=Object.fromEntries(response.headers);if(response.headers.getSetCookie().length)h['set-cookie']=response.headers.getSetCookie();res.writeHead(response.status,h).end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(503,{'Content-Type':'text/plain'}).end('Isolated fixture request failed. No external provider call was allowed.');}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
console.log(JSON.stringify({ready:true,url:origin+'/fixture',isolated:true,hostedCredentialsLoaded:false,realProviderCallsAllowed:false}));
async function shutdown(){server.close();await writeFile(output+'/ui-request-evidence.json',JSON.stringify({scope:'Loopback isolated browser exercise. Only API requests observed from the browser, no bodies or credentials.',runId,fixtureDomain,events},null,2));await run('wsl',['-d','Ubuntu','--','psql',local.DB_URL,'-X','-v','ON_ERROR_STOP=1','-c','update public.portal_staff_rollout set enabled=false where id'],{windowsHide:true,timeout:30000});for(const session of sessions)await session.auth.signOut({scope:'local'});process.exit(0);}
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
