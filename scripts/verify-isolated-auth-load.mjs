// Real password/refresh/RLS tests against a disposable native Supabase stack.
// Never imports the hosted project's access helper or provider credentials.
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {randomBytes,randomUUID} from 'node:crypto';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const status=JSON.parse(await readFile('dist/isolated-auth/local-status.json','utf8'));
const local=status.env;
if(status.runtime!=='native'||status.identity?.project_root?.includes('/tmp/stackendbox-auth-')!==true||!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(local.API_URL)||!local.SECRET_KEY||!local.PUBLISHABLE_KEY)throw Error('disposable_local_stack_required');
const origin='https://isolated.stackendbox.invalid',bridge=randomBytes(32).toString('hex');
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(30000)})}};
const db=createClient(local.API_URL,local.SECRET_KEY,options);
const fresh=()=>createClient(local.API_URL,local.PUBLISHABLE_KEY,options);
const measures=[],fixtures=[];
const requested=process.argv.find(value=>value.startsWith('--clients='))?.slice(10);
const concurrencyRuns=requested?[Number(requested)]:[10,25,50];
if(concurrencyRuns.some(value=>![10,25,50].includes(value)))throw Error('bounded_concurrency_required');
const check=result=>{if(result.error){const code=String(result.error.code||result.error.status||'unknown').replace(/[^a-zA-Z0-9_]/g,'');throw Error(`local_database_error_${code}`);}return result.data;};
async function measure(kind,action){const start=performance.now();try{const value=await action();measures.push({kind,ms:performance.now()-start,ok:true});return value;}catch(error){measures.push({kind,ms:performance.now()-start,ok:false});throw error;}}
let stage='seed';
try{
  for(let index=0;index<50;index++){
    const email=`fixture-${randomUUID()}@stackendbox.invalid`,password=randomBytes(24).toString('base64url');
    const user=check(await db.auth.admin.createUser({email,password,email_confirm:true})).user;
    const clientId=randomUUID(),domainId=randomUUID(),invoiceId=randomUUID(),websiteId=randomUUID(),requestId=randomUUID(),name=`fixture-${clientId}.invalid`;
    check(await db.from('portal_clients').insert({id:clientId,name:`Fixture ${index}`,business_name:`TEST ONLY Isolated ${index}`}));
    check(await db.from('portal_accounts').insert({user_id:user.id,name:`Fixture ${index}`,approved_email:email,role:'client'}));
    check(await db.from('portal_memberships').insert({user_id:user.id,client_id:clientId}));
    check(await db.from('portal_domains').insert({id:domainId,name,lifecycle_status:'registered',expiration_date:'2027-10-14T00:00:00Z',auto_renew:false,provider_account:'isolated-fixture'}));
    check(await db.from('portal_domain_assignments').insert({domain_id:domainId,client_id:clientId,holder_arrangement:'licensed',legal_holder:'SYNTHETIC FIXTURE ONLY'}));
    check(await db.from('portal_websites').insert({id:websiteId,client_id:clientId,domain_id:domainId,name:`Fixture website ${index}`,url:`https://${name}`}));
    check(await db.from('portal_invoices').insert({id:invoiceId,client_id:clientId,amount_minor:100,currency:'usd',status:'issued',description:'SYNTHETIC TEST INVOICE'}));
    check(await db.from('portal_requests').insert({id:requestId,client_id:clientId,created_by:user.id,category:'general',subject:'SYNTHETIC TEST REQUEST',description:'Isolated fixture'}));
    fixtures.push({email,password,userId:user.id,clientId,domainId,name,invoiceId,websiteId,requestId});
  }
  stage='application';
  await build({entryPoints:['platform/edge/handler.ts'],outfile:'dist/isolated-auth/handler.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'local-runtime',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export {}'}));b.onResolve({filter:/^next\/(headers|server)$/},()=>({path:resolve('platform/edge/next-runtime.ts')}));}}]});
  Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:local.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:local.PUBLISHABLE_KEY,SUPABASE_SECRET_KEY:local.SECRET_KEY,NODE_ENV:'production',PORTAL_APP_URL:origin,STACKENDBOX_BRIDGE_SECRET:bridge,WHOP_MODE:'sandbox',PORTAL_SANDBOX_CHECKOUT_ENABLED:'false',DOMAIN_LIVE_PURCHASES_ENABLED:'false',DOMAIN_LIVE_RENEWALS_ENABLED:'false',DOMAIN_LIVE_MUTATIONS_ENABLED:'false',PORTAL_JOBS_ENABLED:'false'});
  for(const key of ['SPACESHIP_API_KEY','SPACESHIP_API_SECRET','BREVO_CLIENT_API_KEY','BREVO_API_KEY','WHOP_SANDBOX_API_KEY'])delete process.env[key];
  const {handleEdge}=await import(pathToFileURL(resolve('dist/isolated-auth/handler.mjs')).href);
  const request=async(jar,path,body,expected=200)=>{
    const headers={'x-stackendbox-bridge':bridge,'x-forwarded-for':jar.ip||'192.0.2.254',Origin:origin,...(jar.size?{Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')}:{}),...(body?{'Content-Type':'application/json'}:{})};
    const response=await handleEdge(new Request(`${origin}/api/portal/${path}`,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})}));
    for(const cookie of response.headers.getSetCookie()){const part=cookie.split(';')[0],i=part.indexOf('=');jar.set(part.slice(0,i),part.slice(i+1));}
    const text=await response.text();if(response.status!==expected)throw Error(`local_api_status_${response.status}_expected_${expected}`);
    return response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):text;
  };
  const runs=[];
  for(const concurrent of concurrencyRuns){
    stage=`distinct_${concurrent}`;const before=measures.length,start=performance.now();
    const settled=await Promise.allSettled(fixtures.slice(0,concurrent).map(async(f,index)=>{
      const auth=fresh(),jar=Object.assign(new Map(),{ip:`192.0.2.${index+1}`});
      try{
        const signed=await measure('password_auth',async()=>check(await auth.auth.signInWithPassword({email:f.email,password:f.password})));
        if(signed.user?.id!==f.userId)throw Error('identity_mismatch');
        await measure('refresh',async()=>check(await auth.auth.refreshSession()));
        const session=check(await auth.auth.getSession()).session;
        await measure('portal_session',()=>request(jar,'auth/session',{access_token:session.access_token,refresh_token:session.refresh_token}));
        for(const section of ['dashboard','domains','websites','billing','requests','settings']){
          const data=await measure('portal_data',()=>request(jar,`data?section=${section}`));
          if(data.account?.user_id!==f.userId)throw Error('portal_identity_mismatch');
          for(const [key,rows] of Object.entries(data))if(Array.isArray(rows))for(const row of rows){if(row.client_id&&row.client_id!==f.clientId)throw Error('tenant_leak');if(key==='domains'&&row.name!==f.name)throw Error('domain_leak');}
          if(section==='billing'&&!data.invoices.some(i=>i.id===f.invoiceId))throw Error('own_invoice_missing');
        }
        const other=fixtures[(index+1)%50];
        if(index===0){
          const idempotency_key=randomUUID(),input={client_id:f.clientId,subject:'SYNTHETIC retry acceptance',description:'Disposable support operation',category:'General support',idempotency_key};
          const first=await request(jar,'requests',input),second=await request(jar,'requests',input);
          if(first.id!==second.id||check(await db.from('portal_requests').select('id').eq('id',first.id)).length!==1)throw Error('portal_duplicate_support');
          await request(jar,'requests',{...input,description:'Conflicting retry'},409);
          await request(jar,'requests',{...input,client_id:other.clientId,idempotency_key:randomUUID()},403);
          await request(jar,'requests',{client_id:'invalid'},422);
          await request(jar,`domains/${f.name}/manage`,undefined,503);
          const preserved=await request(jar,'data?section=domains');
          if(!preserved.domains.some(d=>d.name===f.name&&d.expiration_date==='2027-10-14T00:00:00+00:00'))throw Error('portal_snapshot_erased');
        }
        await request(jar,'admin/summary',undefined,403);
        await request(jar,`domains/${other.name}`,undefined,404);
        await request(jar,`invoices/${other.invoiceId}/download`,undefined,404);
        for(const [table,id] of [['domains',other.domainId],['invoices',other.invoiceId],['websites',other.websiteId],['requests',other.requestId]])if(check(await auth.from(`portal_${table}`).select('id').eq('id',id)).length)throw Error('direct_rls_leak');
        const receipt=await request(jar,`invoices/${f.invoiceId}/download`);if(typeof receipt!=='string'||!receipt.includes('StackEndBox'))throw Error('receipt_unavailable');
        await request(jar,'auth/logout',{});await request(jar,'data?section=dashboard',undefined,401);
      }finally{await auth.auth.signOut({scope:'local'});}
    }));
    const sample=measures.slice(before),metrics={};
    for(const kind of ['password_auth','refresh','portal_session','portal_data']){const values=sample.filter(m=>m.kind===kind).map(m=>m.ms).sort((a,b)=>a-b);metrics[kind]={requests:values.length,p50Ms:Math.round(values[Math.ceil(values.length*.5)-1]),p95Ms:Math.round(values[Math.ceil(values.length*.95)-1]),p99Ms:Math.round(values[Math.ceil(values.length*.99)-1])};}
    const errors=settled.filter(r=>r.status==='rejected').map(r=>String(r.reason?.message||'test_failed'));
    runs.push({distinctClients:concurrent,elapsedMs:Math.round(performance.now()-start),failures:errors.length,errors:[...new Set(errors)],metrics});
    console.log(JSON.stringify(runs.at(-1)));
  }
  const report={checkedAt:new Date().toISOString(),runtime:'Supabase native on local WSL',syntheticAuthIdentities:50,runs,allPassed:runs.every(r=>r.failures===0),duplicateSupportTested:true,invalidInputTested:true,providerConfigurationFailurePreservesSnapshot:true,simulatedDistinctIngressIps:true,hostedTenantLoadMeasured:false,workerCpuMeasured:false,hostedSupabaseInvocations:0,providerCalls:0,scope:'Distinct real local Supabase Auth password/refresh sessions, current application handlers, real PostgreSQL/RLS, isolated synthetic data, one simulated gateway IP per client. Provider failure uses absent local credentials. Local handler timings exclude internet, Cloudflare CPU and hosted Supabase invocation costs. No production or shared acceptance fixtures were created.'};
  await writeFile('dist/portal-evidence/isolated-auth-load.json',JSON.stringify(report,null,2));
  if(!report.allPassed)process.exitCode=1;
}catch(error){console.error(JSON.stringify({error:'isolated_auth_test_failed',stage,reason:/^(local_|tenant_|domain_|identity_|portal_|own_|direct_|receipt_)/.test(error.message)?error.message:'details_withheld',createdLocalIdentities:fixtures.length,credentialsWithheld:true}));process.exitCode=1;}
