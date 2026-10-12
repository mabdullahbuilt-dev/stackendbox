import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join,resolve,dirname,basename,sep} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {createServer} from 'node:net';
import {decryptArtifact} from './lib/backup-crypto.mjs';
const backup=resolve(process.argv[2]||'');
if(!process.argv[2]||!process.env.POSTGRES_BIN||!process.env.PORTAL_DRILL_ROOT)throw new Error('Backup path, POSTGRES_BIN and PORTAL_DRILL_ROOT required');
const summary=JSON.parse(await readFile(join(backup,'summary.json'),'utf8'));
for(const file of summary.files){const bytes=await readFile(join(backup,file.name));if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Backup checksum mismatch');}
const archive=await decryptArtifact(join(backup,'database.dump.enc'),join(dirname(backup),'keys','recipient-private.dpapi'));
const directory=await mkdtemp(join(process.env.PORTAL_DRILL_ROOT,'restore-'));
const password=randomBytes(32).toString('hex');
const env={...process.env,PGHOST:'127.0.0.1',PGPORT:'55439',PGUSER:'postgres',PGDATABASE:'postgres',PGPASSWORD:password,PGSSLMODE:'disable'};
function run(binary,args,input,allowFailure=false){return new Promise((res,rej)=>{const child=spawn(join(process.env.POSTGRES_BIN,binary+'.exe'),args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});const out=[],err=[];child.stdout.on('data',b=>out.push(b));child.stderr.on('data',b=>err.push(b));child.on('error',()=>rej(new Error(`${binary} could not start`)));child.on(binary==='pg_ctl'?'exit':'close',code=>{if(binary==='pg_ctl'){child.stdout.destroy();child.stderr.destroy();}if(code&&!allowFailure)rej(new Error(`${binary} failed: ${Buffer.concat(err).toString().split('\n').filter(l=>/ERROR|FATAL|error:|could not/.test(l)).map(l=>l.slice(0,220)).join(' | ')||code}`));else res({stdout:Buffer.concat(out),stderr:Buffer.concat(err),code});});child.stdin.on('error',()=>{});child.stdin.end(input);});}
let started=false;
try{
  const pipeName=`\\\\.\\pipe\\portal-drill-${randomBytes(12).toString('hex')}`;
  const passwordPipe=createServer(socket=>socket.end(password+'\n'));
  await new Promise((resolve,reject)=>{passwordPipe.once('error',reject);passwordPipe.listen(pipeName,resolve);});
  try {await run('initdb',['-D',join(directory,'data'),'-U','postgres','--auth=scram-sha-256',`--pwfile=${pipeName}`]);}
  finally {passwordPipe.close();}
  await run('pg_ctl',['-D',join(directory,'data'),'-l',join(directory,'postgres.log'),'-o','-h 127.0.0.1 -p 55439','-w','start']);started=true;
  // Only the newly initialized, empty local cluster. No remote connection is accepted.
  await run('psql',['-v','ON_ERROR_STOP=1','-c','drop schema public;']);
  await run('psql',['-v','ON_ERROR_STOP=1','-c',"create role anon; create role authenticated; create role service_role bypassrls; create role supabase_auth_admin; create role supabase_storage_admin; create role authenticator; create role supabase_admin superuser; create role dashboard_user; create role pgbouncer; create schema extensions; create extension pgcrypto with schema extensions;"]);
  await run('pg_restore',['--exit-on-error','--no-owner','-d','postgres'],archive);
  const before=await run('psql',['-t','-A','-c',"select json_build_object('accounts',(select count(*) from portal_accounts),'auth_users',(select count(*) from auth.users),'clients',(select count(*) from portal_clients));"]);
  for(const migration of ['202610120002_domain_operations.sql','202610120003_integrity_provisioning.sql']){
    const relation=migration.startsWith('202610120002')?'portal_domain_operations':'portal_provisioning';
    const existing=await run('psql',['-t','-A','-c',`select to_regclass('public.${relation}') is not null;`]);
    if(existing.stdout.toString().trim()==='t')continue;
    const sql=await readFile(join('supabase','migrations',migration),'utf8');
    await run('psql',['-v','ON_ERROR_STOP=1'],sql);
  }
  await run('psql',['-v','ON_ERROR_STOP=1'],await readFile('supabase/tests/portal_security.sql'));
  await run('psql',['-v','ON_ERROR_STOP=1'],await readFile('supabase/tests/portal_integrity.sql'));
  await run('psql',['-v','ON_ERROR_STOP=1','-c',"insert into portal_clients(id,name,business_name,status) values('dddddddd-0000-4000-8000-000000000001','Persistence fixture','Local restore only','suspended');"]);
  await run('pg_ctl',['-D',join(directory,'data'),'-m','fast','-w','stop']);started=false;
  await run('pg_ctl',['-D',join(directory,'data'),'-l',join(directory,'postgres.log'),'-o','-h 127.0.0.1 -p 55439','-w','start']);started=true;
  const persistence=await run('psql',['-t','-A','-c',"select count(*) from portal_clients where id='dddddddd-0000-4000-8000-000000000001';"]);
  if(persistence.stdout.toString().trim()!=='1')throw new Error('Record did not survive database restart');
  const result={status:'completed',at:new Date().toISOString(),backup:summary.runId,restored:JSON.parse(before.stdout.toString()),migrationValidation:true,rlsTests:true,integrityTests:true,persistenceAfterRestart:true,objects:summary.objects,scope:'Isolated PostgreSQL restore, not a complete hosted Supabase service restore'};
  await writeFile(join(backup,'restore-drill.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
  const stopped=started?await run('pg_ctl',['-D',join(directory,'data'),'-m','fast','-w','stop'],undefined,true):{code:0};
  // Delete only this invocation's new isolated copy, after a confirmed shutdown.
  if(stopped.code===0&&resolve(directory).startsWith(resolve(process.env.PORTAL_DRILL_ROOT)+sep)&&basename(directory).startsWith('restore-'))await rm(directory,{recursive:true});
}
