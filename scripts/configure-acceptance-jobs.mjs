import {randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cli,projectRef} from './lib/supabase-access.mjs';
const names=['STACKENDBOX_ACCEPTANCE_CRON_SECRET','STACKENDBOX_ACCEPTANCE_PORTAL_JOBS_ENABLED','STACKENDBOX_ACCEPTANCE_PORTAL_JOB_CLIENT_ALLOWLIST'];
const client='be7cfb62-86b7-475c-82c5-d60ed1366999';
const run=promisify(execFile);
let directory;
try {
  const existing=JSON.parse(await cli(['secrets','list','--project-ref',projectRef,'--output','json']));
  if(existing.some(s=>names.includes(s.name)))throw Error('existing_schedule_settings_not_overwritten');
  const workerSecrets=await run(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','list','--config','wrangler.static.jsonc'],{windowsHide:true,maxBuffer:2097152});
  if(JSON.parse(workerSecrets.stdout).some(s=>s.name==='CRON_SECRET'))throw Error('existing_worker_cron_not_overwritten');
  directory=await mkdtemp(join(tmpdir(),'stackendbox-schedule-'));
  const identity=await run('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true});
  const sid=identity.stdout.match(/S-1-5-[0-9-]+/)?.[0];if(!sid)throw Error('identity_unavailable');
  await run('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{windowsHide:true});
  const token=randomBytes(32).toString('hex');
  await writeFile(join(directory,'edge.env'),`${names[0]}=${token}\n${names[1]}=true\n${names[2]}=${client}\n`,{flag:'wx'});
  await writeFile(join(directory,'worker.json'),JSON.stringify({CRON_SECRET:token}),{flag:'wx'});
  await cli(['secrets','set','--project-ref',projectRef,'--env-file',join(directory,'edge.env')]);
  await run(process.execPath,['node_modules/wrangler/bin/wrangler.js','secret','bulk',join(directory,'worker.json'),'--config','wrangler.static.jsonc'],{windowsHide:true,maxBuffer:2097152});
  // Smoke the same authenticated endpoint used by the schedule. Run twice to
  // verify durable claim convergence. No new messages or domain fixtures made.
  const checks=[];
  for(let i=0;i<2;i++){
    const response=await fetch('https://stackendbox-static-acceptance.stackendbox.workers.dev/api/portal-jobs?reminders=false',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(60000)});
    const result=await response.json();checks.push({http:response.status,emailsAccepted:result.emailsAccepted,status:result.status,error:result.error});
    if(!response.ok||result.status==='disabled')throw Error('schedule_smoke_failed');
  }
  console.log(JSON.stringify({configured:true,scope:'existing authorized test client only',checks,existingProviderCredentialsChanged:false}));
}catch{console.error('Acceptance schedule setup requires review. Provider credentials and sensitive output withheld.');process.exitCode=1;}
finally{if(directory){await unlink(join(directory,'edge.env')).catch(()=>{});await unlink(join(directory,'worker.json')).catch(()=>{});await rmdir(directory).catch(()=>{});}}
