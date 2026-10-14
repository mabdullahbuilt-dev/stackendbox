// Run after prepare-isolated-supabase.mjs --short-lived-auth.
// Uses one disposable native Auth identity, then removes that entire test stack.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID,randomBytes} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {build} from 'esbuild';
const run=promisify(execFile);
const stack=JSON.parse(await readFile('dist/isolated-auth/local-status.json','utf8'));
const project=stack.identity?.project_root;
if(stack.runtime!=='native'||!/^\/tmp\/stackendbox-auth-[a-zA-Z0-9]+\/project$/.test(project||'')||!/^[a-f0-9]{64}$/.test(stack.identity?.id||'')||!/^http:\/\/127\.0\.0\.1:\d+$/.test(stack.env?.API_URL||''))throw Error('disposable_native_stack_required');
const cli=project.slice(0,-8)+'/bin/supabase';
const checked=result=>{if(result.error)throw Error('local_fixture_failed');return result.data;};
let stage='fixture';
try{
  const local=stack.env,options={auth:{persistSession:false,autoRefreshToken:false}};
  const db=createClient(local.API_URL,local.SECRET_KEY,options),auth=createClient(local.API_URL,local.PUBLISHABLE_KEY,options);
  const email=`expiry-${randomUUID()}@stackendbox.invalid`,password=randomBytes(24).toString('base64url'),clientId=randomUUID();
  const user=checked(await db.auth.admin.createUser({email,password,email_confirm:true})).user;
  checked(await db.from('portal_clients').insert({id:clientId,name:'Expiry fixture',business_name:'TEST ONLY isolated expiry'}));
  checked(await db.from('portal_accounts').insert({user_id:user.id,name:'Expiry fixture',approved_email:email,role:'client'}));
  checked(await db.from('portal_memberships').insert({user_id:user.id,client_id:clientId}));
  const session=checked(await auth.auth.signInWithPassword({email,password})).session;
  if(!session?.expires_at||session.expires_at-Date.now()/1000>65)throw Error('short_lived_auth_fixture_required');
  const bridge=randomBytes(32).toString('hex'),origin='https://isolated.stackendbox.invalid';
  Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:local.SECRET_KEY,NODE_ENV:'production',PORTAL_APP_URL:origin,STACKENDBOX_BRIDGE_SECRET:bridge});
  for(const key of ['SPACESHIP_API_KEY','SPACESHIP_API_SECRET','BREVO_CLIENT_API_KEY','BREVO_API_KEY','WHOP_SANDBOX_API_KEY'])delete process.env[key];
  await build({entryPoints:['platform/edge/handler.ts'],outfile:'dist/isolated-auth/expiry-handler.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'local-runtime',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export {}'}));b.onResolve({filter:/^next\/(headers|server)$/},()=>({path:resolve('platform/edge/next-runtime.ts')}));}}]});
  const {handleEdge}=await import(pathToFileURL(resolve('dist/isolated-auth/expiry-handler.mjs')).href),jar=new Map();
  const request=async(path,body)=>{
    const response=await handleEdge(new Request(origin+'/api/portal/'+path,{method:body?'POST':'GET',headers:{Origin:origin,'x-stackendbox-bridge':bridge,'x-forwarded-for':'192.0.2.250',...(jar.size?{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));
    for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0],index=pair.indexOf('=');jar.set(pair.slice(0,index),pair.slice(index+1));}
    await response.text();return response.status;
  };
  stage='initial_session';
  if(await request('auth/session',{access_token:session.access_token,refresh_token:session.refresh_token})!==200||await request('data?section=dashboard')!==200)throw Error('initial_session_failed');
  checked(await db.auth.admin.signOut(session.access_token,'local'));
  stage='real_token_expiry';
  console.log(JSON.stringify({stage,maximumWaitSeconds:63,sharedDatabaseChanged:false}));
  await new Promise(done=>setTimeout(done,Math.max(0,(session.expires_at-Date.now()/1000+2)*1000)));
  const denied=await request('data?section=dashboard');
  if(denied!==401)throw Error('expired_session_not_denied');
  const report={checkedAt:new Date().toISOString(),realNativeAuth:true,realAccessTokenExpired:Date.now()/1000>session.expires_at,refreshRevoked:true,initialAuthorizedStatus:200,expiredSessionStatus:denied,sharedDatabaseChanged:false,scope:'One disposable local Auth identity and the real application handler. No hosted user or production token-lifetime change.'};
  await writeFile('dist/portal-evidence/expired-session.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch{console.error(JSON.stringify({error:'isolated_expiry_check_failed',stage,sensitiveOutputWithheld:true}));process.exitCode=1;}
finally{
  await run('wsl',['-d','Ubuntu','--',cli,'--workdir',project,'stack','destroy','--stack-id',stack.identity.id,'--yes'],{windowsHide:true,timeout:180000,maxBuffer:4194304});
  await rm('dist/isolated-auth/local-status.json',{force:true});
  console.log(JSON.stringify({disposableExpiryFixtureRemoved:true}));
}
