import { writeFile } from 'node:fs/promises';
import { projectClients } from './lib/supabase-access.mjs';
const origin = 'https://stackendbox-cf-acceptance.stackendbox.workers.dev';
const fixtures = [
  { email: 'abdullahlp114@gmail.com', client: 'be7cfb62-86b7-475c-82c5-d60ed1366999' },
  { email: 'abdullahlp114+stackendbox-activation@gmail.com', client: 'eada77e8-9934-46d2-a383-e919daf5da93' },
];
if (!process.env.PORTAL_ACCEPTANCE_REPORT) throw new Error('Private report path required');
const sessions = [], evidence = [];
async function request(jar, path, body, expected = 200) {
  const response = await fetch(origin + path, {
    method: body ? 'POST' : 'GET', redirect: 'manual', signal: AbortSignal.timeout(30000),
    headers: { Origin: origin, Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; '), ...(body ? {'Content-Type':'application/json'} : {}) },
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';'), split = pair.indexOf('=');
    jar.set(pair.slice(0,split), pair.slice(split+1));
  }
  if (response.status !== expected) throw new Error('Hosted response mismatch');
  return response.json();
}
try {
  const {admin,newSession} = await projectClients();
  for (const [index,fixture] of fixtures.entries()) {
    const membership = await admin.from('portal_memberships').select('user_id,portal_clients(business_name),portal_accounts(approved_email,role,active)').eq('client_id',fixture.client).single();
    const m = membership.data;
    if (membership.error || m?.portal_accounts?.approved_email !== fixture.email || m.portal_accounts.role !== 'client' || !m.portal_accounts.active || !m.portal_clients.business_name.startsWith('TEST ONLY ')) throw new Error('Unapproved fixture');
    const link = await admin.auth.admin.generateLink({type:'magiclink',email:fixture.email});
    if (link.error || !link.data.properties?.hashed_token) throw new Error('Session issue failed');
    const auth = newSession(); sessions.push(auth);
    const login = await auth.auth.verifyOtp({type:'email',token_hash:link.data.properties.hashed_token});
    if (login.error || login.data.user?.id !== m.user_id || !login.data.session || login.data.user.app_metadata.portal_password_change_required === true) throw new Error('Fixture setup incomplete');
    const jar = new Map();
    await request(jar,'/api/portal/auth/session',{access_token:login.data.session.access_token,refresh_token:login.data.session.refresh_token});
    const own = await auth.from('portal_clients').select('id').in('id',fixtures.map(f=>f.client));
    if (own.error || own.data.length !== 1 || own.data[0].id !== fixture.client) throw new Error('Direct RLS isolation failed');
    const counts = {};
    for (const [section,tables] of [['websites',['websites']],['requests',['requests','messages']],['billing',['orders','payments','invoices']],['domains',['domains','domain_assignments']]]) {
      const data = await request(jar,`/api/portal/data?section=${section}`);
      if (data.account?.user_id !== m.user_id || data.clients.some(c=>c.id!==fixture.client)) throw new Error('Hosted identity mismatch');
      for (const table of tables) {
        const rows = data[table] || [];
        if (rows.some(r=>table!=='domains' && r.client_id!==fixture.client)) throw new Error('Hosted ownership mismatch');
        counts[table] = rows.length;
      }
    }
    if (index === 0 && (counts.websites < 1 || counts.requests < 1 || counts.messages < 2)) throw new Error('Populated baseline missing');
    if (index === 1 && Object.values(counts).some(count=>count!==0)) throw new Error('New client saw unexpected records');
    const other = fixtures[1-index].client;
    for (const table of ['portal_websites','portal_requests','portal_messages','portal_invoices']) {
      const denied = await auth.from(table).select('id').eq('client_id',other);
      if (denied.error || denied.data.length) throw new Error('Cross-client RLS read failed');
    }
    await request(jar,'/api/portal/admin/workspace',undefined,403);
    evidence.push({testClient:index+1,ownClientOnly:true,crossClientReadsDenied:true,adminApiDenied:true,counts});
  }
  await request(new Map(),'/api/portal/data',undefined,401);
  const report = {at:new Date().toISOString(),origin,registeredTestClients:2,evidence,anonymousDenied:true,scope:'Read-only separate-tenant hosted API and direct Supabase RLS acceptance. SDK-issued test sessions, not a password-login benchmark. No fixture creation, registrar or financial mutation.'};
  await writeFile(process.env.PORTAL_ACCEPTANCE_REPORT,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} catch { console.error('Two-client acceptance failed. Sensitive details withheld.'); process.exitCode=1; }
finally {for(const auth of sessions)await auth.auth.signOut({scope:'local'}).catch(()=>{});}
