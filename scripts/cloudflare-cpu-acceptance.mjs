// Narrow CPU diagnostic after code changes, not a capacity or password-login benchmark.
import {projectClients} from './lib/supabase-access.mjs';
const origin='https://stackendbox-cf-acceptance.stackendbox.workers.dev';
let auth;
try {
  const {admin,newSession}=await projectClients();
  const fixture=await admin.from('portal_memberships').select('user_id,portal_clients(business_name),portal_accounts(approved_email,role,active)').eq('client_id','be7cfb62-86b7-475c-82c5-d60ed1366999').single();
  const m=fixture.data;
  if(fixture.error || m?.portal_accounts?.approved_email!=='abdullahlp114@gmail.com' || m.portal_accounts.role!=='client' || !m.portal_accounts.active || !m.portal_clients.business_name.startsWith('TEST ONLY ')) throw Error('Authorized fixture unavailable');
  const link=await admin.auth.admin.generateLink({type:'magiclink',email:m.portal_accounts.approved_email});
  if(link.error || link.data.user?.id!==m.user_id || !link.data.properties?.hashed_token) throw Error('Fixture session unavailable');
  auth=newSession();
  const login=await auth.auth.verifyOtp({type:'email',token_hash:link.data.properties.hashed_token});
  if(login.error || !login.data.session) throw Error('Fixture session failed');
  const jar=new Map();
  async function call(path,body) {
    const start=performance.now();
    const r=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(30000),method:body?'POST':'GET',headers:{Origin:origin,Cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; '),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
    for(const cookie of r.headers.getSetCookie()){const pair=cookie.split(';')[0],split=pair.indexOf('=');jar.set(pair.slice(0,split),pair.slice(split+1));}
    await r.arrayBuffer();
    console.log(JSON.stringify({path,status:r.status,roundTripMs:Math.round(performance.now()-start),scope:'SDK-issued authorized fixture session, read-only CPU diagnostic'}));
    if(r.status!==200)throw Error('Hosted diagnostic response mismatch');
  }
  await call('/api/portal/auth/session',{access_token:login.data.session.access_token,refresh_token:login.data.session.refresh_token});
  for(const path of ['/client-portal/dashboard','/api/portal/data?section=dashboard','/client-portal/domains','/api/portal/data?section=domains','/client-portal/websites','/api/portal/data?section=websites'])await call(path);
} catch {console.error('Hosted CPU diagnostic failed. Sensitive details withheld.');process.exitCode=1;}
finally{if(auth)await auth.auth.signOut({scope:'local'}).catch(()=>{});}
