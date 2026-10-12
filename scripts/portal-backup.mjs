import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { backupKeys, encryptor } from './lib/backup-crypto.mjs';
import { postgresEnv, projectClients, projectRef } from './lib/supabase-access.mjs';
const root=resolve(process.env.PORTAL_BACKUP_DIR||'');
const relativeRoot=relative(process.cwd(),root);
if(!process.env.PORTAL_BACKUP_DIR || (!isAbsolute(relativeRoot) && relativeRoot !== '..' && !relativeRoot.startsWith('..\\') && !relativeRoot.startsWith('../'))) throw new Error('Backup directory must be outside the repository');
if(!process.env.POSTGRES_BIN) throw new Error('POSTGRES_BIN is required');
const runId=new Date().toISOString().replace(/[:.]/g,'-');
const directory=join(root,runId); await mkdir(directory,{recursive:true});
const keys=await backupKeys(join(root,'keys'));
const manifest={version:1,project:projectRef,startedAt:new Date().toISOString(),status:'running',files:[],objects:[],includesAuth:false,includesObjects:false};
async function encryptedFile(name,source) {
  const path=join(directory,name),{cipher,header}=encryptor(keys.publicKey);
  await writeFile(path,header,{flag:'wx',mode:0o600});
  await pipeline(source,cipher,createWriteStream(path,{flags:'a'}));
  const {appendFile}=await import('node:fs/promises'); await appendFile(path,cipher.getAuthTag());
  const bytes=await readFile(path);
  manifest.files.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
try {
  const connection=await postgresEnv();
  const child=spawn(join(process.env.POSTGRES_BIN,'pg_dump.exe'),['--format=custom','--no-owner','--role=postgres','--schema=public','--schema=auth','--schema=storage','--schema=supabase_migrations'],{env:connection,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',d=>{stderr+=d.toString();});
  const ended=new Promise((resolve,reject)=>{child.on('error',()=>reject(new Error('pg_dump could not start')));child.on('close',code=>code===0?resolve():reject(new Error(`pg_dump failed (${code}); database credentials withheld`)));});
  await Promise.all([encryptedFile('database.dump.enc',child.stdout),ended]);
  manifest.includesAuth=true;
  const {admin}=await projectClients();
  async function walk(prefix='') {
    for(let offset=0;;offset+=100) {
      const {data,error}=await admin.storage.from('portal-documents').list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
      if(error) throw new Error('Storage inventory failed');
      for(const item of data) {
        const path=prefix?`${prefix}/${item.name}`:item.name;
        if(!item.id) {await walk(path);continue;}
        const downloaded=await admin.storage.from('portal-documents').download(path);
        if(downloaded.error) throw new Error('Storage object download failed');
        const name=`object-${manifest.objects.length}.enc`;
        await encryptedFile(name,downloaded.data.stream());
        manifest.objects.push({path,file:name,id:item.id});
      }
      if(data.length<100)break;
    }
  }
  await walk();manifest.includesObjects=true;
  // Object names and metadata are encrypted too. The public summary contains no customer data.
  manifest.status='completed';manifest.completedAt=new Date().toISOString();
  const {Readable}=await import('node:stream');
  await encryptedFile('manifest.enc',Readable.from([Buffer.from(JSON.stringify(manifest))]));
  const summary={runId,status:'completed',project:projectRef,completedAt:manifest.completedAt,encrypted:true,includesAuth:true,objects:manifest.objects.length,files:manifest.files,restoreTested:false};
  await writeFile(join(directory,'summary.json'),JSON.stringify(summary,null,2),{flag:'wx'});
  const size=(await Promise.all(manifest.files.map(f=>stat(join(directory,f.name))))).reduce((n,f)=>n+f.size,0);
  const recorded=await admin.from('portal_backup_runs').insert({kind:'backup',status:'completed',completed_at:manifest.completedAt,bytes:size,artifact_sha256:manifest.files[0].sha256,destination_ref:runId,includes_auth:true,includes_objects:true,detail:{offsite:false,objects:manifest.objects.length}});
  console.log(JSON.stringify({status:'completed',directory,bytes:size,objects:manifest.objects.length,recorded:!recorded.error,offsite:false,keyRecovery:'Windows user DPAPI; independent key escrow still required'}));
} catch(error) {
  await writeFile(join(directory,'failure.json'),JSON.stringify({status:'failed',at:new Date().toISOString(),message:error.message}));
  console.error(error.message);process.exitCode=1;
}
