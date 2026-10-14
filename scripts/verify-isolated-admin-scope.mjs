import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {randomBytes,randomUUID,createHmac} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const status=JSON.parse(await readFile('dist/isolated-auth/local-status.json','utf8')),local=status.env;
if(status.runtime!=='native'||!status.identity?.project_root?.startsWith('/tmp/stackendbox-auth-')||!/^http:\/\/127\.0\.0\.1:\d+$/.test(local.API_URL))throw Error('disposable_local_stack_required');
const options={auth:{persistSession:false,autoRefreshToken:false}},db=createClient(local.API_URL,local.SECRET_KEY,options),auth=createClient(local.API_URL,local.PUBLISHABLE_KEY,options);
const origin='https://isolated.stackendbox.invalid',bridge=randomBytes(32).toString('hex'),jar=new Map();
const check=r=>{if(r.error)throw Error(`local_${String(r.error.code||r.error.status||'error').replace(/[^a-zA-Z0-9_]/g,'')}`);return r.data;};
function totp(secret){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='';for(const char of secret.replace(/=+$/,''))bits+=alphabet.indexOf(char).toString(2).padStart(5,'0');const key=Buffer.from(bits.match(/.{8}/g).map(byte=>parseInt(byte,2))),counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const digest=createHmac('sha1',key).update(counter).digest(),offset=digest.at(-1)&15;return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
let stage='fixture';
try{
  const email=`admin-${randomUUID()}@stackendbox.invalid`,password=randomBytes(24).toString('base64url');
  const user=check(await db.auth.admin.createUser({email,password,email_confirm:true})).user;
  check(await db.from('portal_accounts').insert({user_id:user.id,name:'Isolated administrator',approved_email:email,role:'super_admin'}));
  check(await auth.auth.signInWithPassword({email,password}));
  Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:local.SECRET_KEY,NODE_ENV:'production',PORTAL_APP_URL:origin,STACKENDBOX_BRIDGE_SECRET:bridge,WHOP_MODE:'sandbox',PORTAL_SANDBOX_CHECKOUT_ENABLED:'false',DOMAIN_LIVE_PURCHASES_ENABLED:'false',DOMAIN_LIVE_RENEWALS_ENABLED:'false',DOMAIN_LIVE_MUTATIONS_ENABLED:'false',PORTAL_JOBS_ENABLED:'false'});
  const {handleEdge}=await import(pathToFileURL(resolve('dist/isolated-auth/handler.mjs')).href);
  const request=async(path,body,expected=200)=>{
    const response=await handleEdge(new Request(`${origin}/api/portal/${path}`,{method:body?'POST':'GET',headers:{'x-stackendbox-bridge':bridge,'x-forwarded-for':'192.0.2.251',Origin:origin,...(jar.size?{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));
    for(const cookie of response.headers.getSetCookie()){const part=cookie.split(';')[0],i=part.indexOf('=');jar.set(part.slice(0,i),part.slice(i+1));}
    if(response.status!==expected)throw Error(`local_api_${response.status}_expected_${expected}`);
    return response.json();
  };
  let session=check(await auth.auth.getSession()).session;
  await request('auth/session',{access_token:session.access_token,refresh_token:session.refresh_token});
  stage='mfa_gate';await request('admin/summary',undefined,403);
  const factor=check(await auth.auth.mfa.enroll({factorType:'totp',friendlyName:'DISPOSABLE LOCAL MFA'}));
  check(await auth.auth.mfa.challengeAndVerify({factorId:factor.id,code:totp(factor.totp.secret)}));
  session=check(await auth.auth.getSession()).session;
  await request('auth/session',{access_token:session.access_token,refresh_token:session.refresh_token});
  stage='summary';const customers=await request('admin/summary?scope=customers'),test=await request('admin/summary?scope=test');
  if(customers.counts.active_clients!==0||test.counts.active_clients<50)throw Error('local_scope_count_mismatch');
  const directory=await request('admin/clients?scope=customers');if(directory.clients.length)throw Error('local_customer_filter_failed');
  const labelled=await request('admin/clients?scope=test&q=Isolated');if(!labelled.clients.length||labelled.clients.some(c=>!c.business_name.startsWith('TEST ONLY ')))throw Error('local_test_filter_failed');
  for(const section of ['dashboard','domains','billing','requests']){
    const empty=await request(`admin/workspace?section=${section}&scope=customers`);for(const [key,value] of Object.entries(empty))if(Array.isArray(value)&&value.length&&key!=='factors')throw Error('local_scoped_workspace_leak');
    const populated=await request(`admin/workspace?section=${section}&scope=test`);if(!populated.clients.length)throw Error('local_scoped_clients_missing');
  }
  const emptyRenewals=await request('admin/renewals?scope=customers');if(emptyRenewals.domains.length)throw Error('local_scoped_renewals_leak');
  const testRenewals=await request('admin/renewals?scope=test');if(!testRenewals.domains.length)throw Error('local_test_renewals_missing');
  await request('admin/clients?client_id=invalid',undefined,422);
  await request('auth/logout',{});await request('admin/summary',undefined,401);
  const report={checkedAt:new Date().toISOString(),scope:'Disposable local Supabase Auth/MFA and current application handler, synthetic records only. Does not replace hosted owner administrator acceptance.',mfaEnforced:true,realTotpVerified:true,customerAndTestSummaryPartition:true,scopedDirectorySearch:true,scopedWorkspace:true,scopedRenewals:true,invalidInputRejected:true,logoutEnforced:true,sharedDatabaseChanged:false};
  await writeFile('dist/portal-evidence/isolated-admin-scope.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){console.error(JSON.stringify({error:'isolated_admin_verification_failed',stage,reason:/^local_/.test(error.message)?error.message:'details_withheld'}));process.exitCode=1;}
finally{await auth.auth.signOut({scope:'local'});}
