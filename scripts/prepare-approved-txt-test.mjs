import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cli,projectRef,projectClients} from './lib/supabase-access.mjs';
const [domain,name,value]=process.argv.slice(2),secret='STACKENDBOX_PRODUCTION_DOMAIN_ACCEPTANCE_GRANT';
if(!domain||!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)||domain==='stackendbox.com'||domain.endsWith('.stackendbox.com')||!/^_[a-z0-9-]{1,62}$/.test(name||'')||!value||value.length>128)throw Error('Exact approved TXT parameters required');
let directory;
try{
  const names=JSON.parse(await cli(['secrets','list','--project-ref',projectRef,'--output','json']));
  if(names.some(s=>s.name===secret))throw Error('Existing approval will not be overwritten');
  const {admin}=await projectClients();
  const account=await admin.from('portal_accounts').select('user_id').eq('approved_email','mabdullah.built@gmail.com').eq('role','super_admin').eq('active',true).single();
  if(account.error||!account.data)throw Error('Approved administrator unavailable');
  const grant={domain,actor_id:account.data.user_id,name,value,ttl:300,expires_at:new Date(Date.now()+2*60*60*1000).toISOString()};
  directory=await mkdtemp(join(tmpdir(),'stackendbox-approved-txt-'));
  const run=promisify(execFile),identity=await run('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true});
  const sid=identity.stdout.match(/S-1-5-[0-9-]+/)?.[0];if(!sid)throw Error('Identity unavailable');
  await run('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{windowsHide:true});
  await writeFile(join(directory,'approval.env'),`${secret}=${JSON.stringify(grant)}\n`,{flag:'wx'});
  await cli(['secrets','set','--project-ref',projectRef,'--env-file',join(directory,'approval.env')]);
  console.log(JSON.stringify({domain,name,value,ttl:300,expires_at:grant.expires_at,approvalConfigured:true,ordinaryLiveWritesEnabled:false,providerCredentialsChanged:false}));
}catch{console.error('Scoped TXT approval setup stopped, sensitive output withheld');process.exitCode=1;}
finally{if(directory){await unlink(join(directory,'approval.env')).catch(()=>{});await rmdir(directory).catch(()=>{});}}
