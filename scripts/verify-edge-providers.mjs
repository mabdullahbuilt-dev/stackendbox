import {randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cli,projectRef} from './lib/supabase-access.mjs';
const setting='STACKENDBOX_ACCEPTANCE_PORTAL_DIAGNOSTICS_TOKEN';
let directory;
try {
  const existing=JSON.parse(await cli(['secrets','list','--project-ref',projectRef,'--output','json']));
  if(existing.some(s=>s.name===setting)) throw Error('existing_diagnostic_not_overwritten');
  const token=randomBytes(32).toString('hex');
  directory=await mkdtemp(join(tmpdir(),'stackendbox-read-check-'));
  const run=promisify(execFile);
  const {stdout}=await run('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true});
  const sid=stdout.match(/S-1-5-[0-9-]+/)?.[0];
  if(!sid)throw Error('identity_unavailable');
  await run('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{windowsHide:true});
  const file=join(directory,'diagnostic.env');
  // This short-lived credential permits only existing read diagnostics.
  await writeFile(file,`${setting}=${token}\n`,{flag:'wx'});
  await cli(['secrets','set','--project-ref',projectRef,'--env-file',file]);
  const identities=process.argv.includes('--email-identities');
  const events=process.argv.includes('--email-events');
  const url='https://stackendbox-static-acceptance.stackendbox.workers.dev/api/portal-diagnostics'+(identities?'?check=email-identities':events?'?check=email-events':'');
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(60000)});
  const result=await response.json();
  console.log(JSON.stringify(identities||events?{http:response.status,...result}:{http:response.status,database:result.database?.ok,registrar:result.registrar?.ok,domainCount:result.registrar?.result?.domainsRead,payments:result.payments?.ok,sandboxPaymentReadAccess:result.payments?.result?.paymentReadAccess,email:result.email?.ok,senderVerified:result.email?.result?.senderVerified,publicWebsiteEmail:result.email?.result?.publicWebsiteEmail,failures:Object.fromEntries(['database','registrar','payments','email'].filter(k=>result[k]?.ok===false).map(k=>[k,result[k].code])),mailSent:false,registrarMutations:false}));
}catch{console.error('Read-only integration diagnostic failed. Sensitive output withheld.');process.exitCode=1;}
finally{
  if(directory){await cli(['secrets','unset',setting,'--project-ref',projectRef,'--yes']).catch(()=>{console.error('Temporary diagnostic cleanup requires attention');process.exitCode=1;});await unlink(join(directory,'diagnostic.env')).catch(()=>{});await rmdir(directory).catch(()=>{});}
}
