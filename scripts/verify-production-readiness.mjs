import {randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cli,projectRef} from './lib/supabase-access.mjs';
const name='STACKENDBOX_PRODUCTION_PORTAL_RELEASE_CHECK_TOKEN';let directory;
try{
  const existing=JSON.parse(await cli(['secrets','list','--project-ref',projectRef,'--output','json']));
  if(existing.some(s=>s.name===name))throw Error('existing_check_not_overwritten');
  directory=await mkdtemp(join(tmpdir(),'stackendbox-production-check-'));
  const run=promisify(execFile),identity=await run('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true});
  const sid=identity.stdout.match(/S-1-5-[0-9-]+/)?.[0];if(!sid)throw Error('identity_unavailable');
  await run('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{windowsHide:true});
  const token=randomBytes(32).toString('hex'),file=join(directory,'check.env');
  await writeFile(file,`${name}=${token}\n`,{flag:'wx'});
  await cli(['secrets','set','--project-ref',projectRef,'--env-file',file]);
  const response=await fetch('https://stackendbox-production.stackendbox.workers.dev/api/release-readiness',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
  console.log(JSON.stringify({http:response.status,...await response.json()}));
  if(!response.ok)process.exitCode=1;
}catch{console.error('Production readiness check failed. Sensitive output withheld.');process.exitCode=1;}
finally{if(directory){await cli(['secrets','unset',name,'--project-ref',projectRef,'--yes']).catch(()=>{console.error('Temporary check cleanup requires attention');process.exitCode=1;});await unlink(join(directory,'check.env')).catch(()=>{});await rmdir(directory).catch(()=>{});}}
