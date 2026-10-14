// Fresh local PostgreSQL only. No cloud credentials, customer data or provider calls.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
if(!process.env.POSTGRES_BIN)throw Error('POSTGRES_BIN required');
const dir=await mkdtemp(join(tmpdir(),'stackendbox-ownership-'));
const env={...process.env,PGHOST:'127.0.0.1',PGPORT:'55442',PGDATABASE:'postgres',PGUSER:'postgres',PGPASSWORD:''};
function run(name,args,input){return new Promise((resolve,reject)=>{
 const child=spawn(join(process.env.POSTGRES_BIN,name+'.exe'),args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});let err='';
 child.stdout.resume();child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on(name==='pg_ctl'?'exit':'close',code=>{if(name==='pg_ctl'){child.stdout.destroy();child.stderr.destroy();}code?reject(Error(`${name}: ${err.slice(-1200)}`)):resolve();});child.stdin.on('error',()=>{});child.stdin.end(input);
});}
let started=false;
try{
 await run('initdb',['-D',join(dir,'data'),'-U','postgres','-A','trust']);
 await run('pg_ctl',['-D',join(dir,'data'),'-l',join(dir,'postgres.log'),'-o','-h 127.0.0.1 -p 55442','-w','start']);started=true;
 await run('psql',['-v','ON_ERROR_STOP=1'],`create role anon;create role authenticated;create role service_role;create table portal_accounts(user_id uuid primary key,role text,active boolean);create table portal_domains(name text,protected boolean);create table portal_audit(actor_id uuid,action text,target_id text,detail jsonb);create table portal_schema_releases(version text primary key);`);
 await run('psql',['-v','ON_ERROR_STOP=1'],await readFile('supabase/migrations/202610140002_ownership_review_tasks.sql','utf8'));
 await run('psql',['-v','ON_ERROR_STOP=1'],await readFile('tests/sql/ownership-review-tasks.sql','utf8'));
 console.log(JSON.stringify({isolatedPostgres:true,atomicAudit:true,idempotentProgress:true,staleUpdateRejected:true,consentGate:true,manualCompletionDenied:true,clientAccessDenied:true,cloudWrites:false}));
}finally{if(started)await run('pg_ctl',['-D',join(dir,'data'),'-m','fast','-w','stop']);}
