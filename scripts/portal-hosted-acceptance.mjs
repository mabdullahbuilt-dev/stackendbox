import {readFile,writeFile} from 'node:fs/promises';
import {projectClients} from './lib/supabase-access.mjs';
const origin='https://stackendbox-portal-preview.vercel.app';
const email=process.env.PORTAL_ACCEPTANCE_EMAIL;
const clientId=process.env.PORTAL_ACCEPTANCE_CLIENT_ID;
if(!email||!clientId||!process.env.PORTAL_VERCEL_CONFIG||!process.env.PORTAL_ACCEPTANCE_REPORT)throw new Error('Explicit authorized test identity and private report path required');
const measurements=[];
const sessions=[];
const supportOnly=process.argv.includes('--support-only');
const recordsOnly=process.argv.includes('--records-only');
const bounded=supportOnly||recordsOnly;
try {
 const {token}=JSON.parse(await readFile(`${process.env.PORTAL_VERCEL_CONFIG}/auth.json`,'utf8'));
 const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
 if(project.projectId!=='prj_K2ZRC5sHMG1y2BE6BetT3mRGOGvz')throw new Error('Wrong project');
 const response=await fetch(`https://api.vercel.com/v9/projects/${project.projectId}?teamId=${project.orgId}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('Project access unavailable');
 const info=await response.json();
 const bypass=Object.entries(info.protectionBypass||{}).find(([,value])=>value.scope==='automation-bypass')?.[0];
 if(!bypass)throw new Error('Existing supported automation bypass unavailable');
 const {admin,newSession}=await projectClients();
 const membership=await admin.from('portal_memberships').select('user_id,portal_clients(business_name),portal_accounts(approved_email,role,active)').eq('client_id',clientId).single();
 const member=membership.data;
 if(membership.error||!member||member.portal_accounts?.approved_email!==email||member.portal_accounts.role!=='client'||!member.portal_accounts.active||!member.portal_clients?.business_name.startsWith('TEST ONLY '))throw new Error('Authorized test fixture could not be verified');
 async function request(jar,path,body,expected=200){
  const start=performance.now();
  const response=await fetch(origin+path,{method:body?'POST':'GET',headers:{'x-vercel-protection-bypass':bypass,Origin:origin,...(jar?.size?{Cookie:[...jar].map(([key,value])=>`${key}=${value}`).join('; ')}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(30000)});
  const firstByteMs=performance.now()-start;
  const text=await response.text();
  for(const cookie of response.headers.getSetCookie()){
   const [pair]=cookie.split(';');const split=pair.indexOf('=');const key=pair.slice(0,split),value=pair.slice(split+1);
   if(/max-age=0/i.test(cookie))jar?.delete(key);else jar?.set(key,value);
  }
  measurements.push({path,status:response.status,firstByteMs:Math.round(firstByteMs),totalMs:Math.round(performance.now()-start),responseBytes:Buffer.byteLength(text)});
  if(response.status!==expected)throw new Error(`Unexpected response for ${path}: ${response.status}`);
  return response.headers.get('content-type')?.includes('application/json')?JSON.parse(text):text;
 }
 // Existing admin-issued one-time email tokens remain in memory. These do not
 // replace or claim to benchmark the browser's password/Turnstile login flow.
 for(let i=0;i<(bounded?2:5);i++){
  const start=performance.now();
  const link=await admin.auth.admin.generateLink({type:'magiclink',email});
  const auth=newSession();
  if(link.error||!link.data.properties?.hashed_token)throw new Error('Test session authorization failed');
  const verified=await auth.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'email'});
  if(verified.error||verified.data.user?.id!==member.user_id||!verified.data.session)throw new Error('Test session validation failed');
  measurements.push({path:'supabase-one-time-email-auth',status:200,totalMs:Math.round(performance.now()-start)});
  const jar=new Map();sessions.push({auth,jar});
  await request(jar,'/api/portal/auth/session',{access_token:verified.data.session.access_token,refresh_token:verified.data.session.refresh_token});
 }
 if(!bounded)await Promise.all(sessions.map(async({jar})=>{
  for(let repeat=0;repeat<2;repeat++)for(const section of ['dashboard','domains','websites','billing','requests']){
   const html=await request(jar,`/client-portal/${section}`);
   if(typeof html!=='string'||!html.includes('CLIENT PORTAL'))throw new Error('Authenticated page did not render');
   const data=await request(jar,`/api/portal/data?section=${section}`);
   if(data.account?.user_id!==member.user_id||data.clients.some(client=>client.id!==clientId)||data.memberships.some(m=>m.client_id!==clientId))throw new Error('Tenant identity mismatch');
  }
 }));
 await request(sessions[0].jar,'/api/portal/admin/workspace',undefined,403);
 await request(new Map(),'/api/portal/data',undefined,401);
 if(recordsOnly){
  for(const {jar} of sessions){
   const websiteData=await request(jar,'/api/portal/data?section=websites');
   if(websiteData.account?.user_id!==member.user_id||websiteData.websites.some(record=>record.client_id!==clientId)||!websiteData.websites.some(record=>record.name==='TEST ONLY Website Assignment Fixture'&&record.url==='https://example.com/'))throw new Error('Website assignment persistence or isolation failed');
   const support=await request(jar,'/api/portal/data?section=requests');
   const record=support.requests.find(record=>record.subject==='TEST ONLY hosted support acceptance');
   if(!record||record.status!=='under_review'||record.client_id!==clientId||!support.messages.some(message=>message.request_id===record.id&&message.body.startsWith('TEST ONLY staff reply acceptance')))throw new Error('Staff reply or status persistence failed');
   const billing=await request(jar,'/api/portal/data?section=billing');
   if(['orders','payments','invoices'].some(table=>(billing[table]||[]).some(record=>record.client_id!==clientId)))throw new Error('Billing isolation failed');
  }
 }
 if(process.argv.includes('--support')||supportOnly){
  const jar=sessions[0].jar;
  const existing=await request(jar,'/api/portal/data?section=requests');
  let record=existing.requests.find(record=>record.subject==='TEST ONLY hosted support acceptance');
  if(!record)record=await request(jar,'/api/portal/requests',{client_id:clientId,subject:'TEST ONLY hosted support acceptance',description:'Authorized temporary client functional acceptance. No real customer work or registrar change requested.',category:'General support'});
  const replyText='TEST ONLY client conversation persistence acceptance';
  if(!existing.messages.some(message=>message.request_id===record.id&&message.body===replyText))await request(jar,`/api/portal/requests/${record.id}/messages`,{body:replyText});
  const reread=await request(sessions[1].jar,'/api/portal/data?section=requests');
  if(!reread.requests.some(saved=>saved.id===record.id))throw new Error('Support persistence failed across independent sessions');
  if(!reread.messages.some(message=>message.request_id===record.id&&message.body===replyText))throw new Error('Support conversation persistence failed');
 }
 const dataTimes=measurements.filter(m=>m.path.startsWith('/api/portal/data?')).map(m=>m.totalMs).sort((a,b)=>a-b);
 const result={at:new Date().toISOString(),origin,concurrentSessions:bounded?2:5,registeredTestClients:1,authenticatedNavigationRequests:bounded?0:100,errors:0,dataRequestMedianMs:dataTimes[Math.floor(dataTimes.length/2)],dataRequestP95Ms:dataTimes[Math.ceil(dataTimes.length*.95)-1],measuredResponseBytes:measurements.reduce((total,m)=>total+(m.responseBytes||0),0),supportPersistence:process.argv.includes('--support')||supportOnly,recordsPersistence:recordsOnly,scope:recordsOnly?'Read-only hosted website, staff reply/status and billing-isolation checks across two independently authenticated client sessions. Website is a labelled fixture, not a registrar asset. No load benchmark or password login claim.':supportOnly?'Hosted support request and conversation persistence across two independent sessions. Not a navigation load benchmark.':'Hosted authenticated navigation and session restoration using authorized one-time email tokens. Not a password/Turnstile login benchmark, five different tenants, registrar acceptance, or provider billing-meter measurement.',measurements};
 await writeFile(process.env.PORTAL_ACCEPTANCE_REPORT,JSON.stringify(result,null,2));
 console.log(JSON.stringify({...result,measurements:undefined}));
}catch(error){
 // Never print SDK objects, request bodies, cookies, keys, links or passwords.
 console.error(error.message?.startsWith('Unexpected response')?error.message:'Hosted acceptance failed. Sensitive diagnostic details withheld.');process.exitCode=1;
}finally{
 for(const session of sessions)await session.auth.auth.signOut({scope:'local'}).catch(()=>{});
}
