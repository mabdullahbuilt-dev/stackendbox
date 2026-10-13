import {createHash,randomBytes} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {cli,projectRef,projectClients} from './lib/supabase-access.mjs';
const names=['STACKENDBOX_ACCEPTANCE_CRON_SECRET','STACKENDBOX_ACCEPTANCE_PORTAL_JOBS_ENABLED'];
const expected=new Set(['f8842e099b34','29c4be9a96d7','46621d374040','54d536910014']);
const supportTest=process.argv.includes('--support-acceptance');
let directory;
try{
  const {admin}=await projectClients();
  const result=await admin.from('portal_email_outbox').select('id,status,attempts,provider_id,recipient,subject').eq('status',supportTest?'queued':'retry');
  if(result.error)throw Error('read_failed');
  const rows=result.data.filter(row=>supportTest
    ?row.id==='cb845beb-66ed-402c-8d5a-000879514525'&&row.recipient==='abdullahlp114@gmail.com'&&row.subject==='Support update: TEST ONLY hosted support acceptance'
    :expected.has(createHash('sha256').update(row.id).digest('hex').slice(0,12)));
  if(rows.length!==(supportTest?1:4)||rows.some(row=>row.attempts!==(supportTest?0:1)||row.provider_id))throw Error('reviewed_batch_changed');
  const bindings=JSON.parse(await cli(['secrets','list','--project-ref',projectRef,'--output','json']));
  if(bindings.some(s=>names.includes(s.name)))throw Error('existing_control_not_overwritten');
  directory=await mkdtemp(join(tmpdir(),'stackendbox-email-dispatch-'));
  const run=promisify(execFile);
  const {stdout}=await run('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true});
  const sid=stdout.match(/S-1-5-[0-9-]+/)?.[0];
  if(!sid)throw Error('identity_unavailable');
  await run('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{windowsHide:true});
  const token=randomBytes(32).toString('hex'),file=join(directory,'dispatch.env');
  await writeFile(file,`${names[0]}=${token}\n${names[1]}=true\n`,{flag:'wx'});
  await cli(['secrets','set','--project-ref',projectRef,'--env-file',file]);
  const url=new URL('https://stackendbox-static-acceptance.stackendbox.workers.dev/api/portal-jobs');
  for(const row of rows)url.searchParams.append('email_id',row.id);
  const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(60000)});
  const payload=await response.json();
  console.log(JSON.stringify({http:response.status,emailsAccepted:payload.emailsAccepted??0,error:payload.error??null,selectedRecords:rows.length,bulkQueueProcessing:false}));
  const saved=await admin.from('portal_email_outbox').select('status,attempts,provider_id').in('id',rows.map(row=>row.id));
  if(saved.error)throw Error('verification_failed');
  console.log(JSON.stringify({accepted:saved.data.filter(row=>row.status==='accepted'&&row.provider_id).length,reviewRequired:saved.data.filter(row=>row.status==='review_required').length,stillRetry:saved.data.filter(row=>row.status==='retry').length,inboxDeliveryNotClaimed:true}));
}catch{console.error('Selected email dispatch stopped. Sensitive output withheld.');process.exitCode=1;}
finally{if(directory){await cli(['secrets','unset',...names,'--project-ref',projectRef,'--yes']).catch(()=>{console.error('Temporary dispatch control cleanup requires attention');process.exitCode=1;});await unlink(join(directory,'dispatch.env')).catch(()=>{});await rmdir(directory).catch(()=>{});}}
