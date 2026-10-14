// Fresh local PostgreSQL only. No cloud credentials or customer records.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
if(!process.env.POSTGRES_BIN)throw Error('POSTGRES_BIN required');
const dir=await mkdtemp(join(tmpdir(),'stackendbox-handoff-'));
const env={...process.env,PGHOST:'127.0.0.1',PGPORT:'55441',PGDATABASE:'postgres',PGUSER:'postgres',PGPASSWORD:''};
function run(name,args,input){return new Promise((resolve,reject)=>{
  const child=spawn(join(process.env.POSTGRES_BIN,name+'.exe'),args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});let err='';
  child.stdout.resume();child.stderr.on('data',b=>err+=b);child.on('error',reject);child.on(name==='pg_ctl'?'exit':'close',code=>{if(name==='pg_ctl'){child.stdout.destroy();child.stderr.destroy();}code?reject(Error(`${name}: ${err.slice(-1600)}`)):resolve();});child.stdin.on('error',()=>{});child.stdin.end(input);
});}
let started=false;
try{
  await run('initdb',['-D',join(dir,'data'),'-U','postgres','-A','trust']);
  await run('pg_ctl',['-D',join(dir,'data'),'-l',join(dir,'postgres.log'),'-o','-h 127.0.0.1 -p 55441','-w','start']);started=true;
  const base=`create role anon;create role authenticated;create role service_role;
  create table portal_accounts(user_id uuid primary key,role text,active boolean,approved_email text);
  create table portal_clients(id uuid primary key,status text);
  create table portal_memberships(user_id uuid,client_id uuid);
  create table portal_domains(id uuid primary key,protected boolean,name text,lifecycle_status text,expiration_date timestamptz,reconciliation_required boolean,last_synced_at timestamptz);
  create table portal_domain_assignments(domain_id uuid primary key,client_id uuid,legal_holder text,holder_arrangement text,assigned_by uuid,audit_reason text);
  create table portal_audit(actor_id uuid,action text,target_id text,detail jsonb);
  create table portal_schema_releases(version text primary key);`;
  const agency=await readFile('supabase/migrations/202610120004_agency_workflow.sql','utf8');
  await run('psql',['-v','ON_ERROR_STOP=1'],base+agency.slice(agency.indexOf('create function public.portal_assign_verified_domain'),agency.lastIndexOf('commit;')));
  await run('psql',['-v','ON_ERROR_STOP=1'],await readFile('supabase/migrations/202610140001_domain_handoff_requests.sql','utf8'));
  await run('psql',['-v','ON_ERROR_STOP=1'],await readFile('tests/sql/domain-handoff-request.sql','utf8'));
  console.log(JSON.stringify({isolatedPostgres:true,atomicAssignment:true,requestReplay:true,conflictRejected:true,clientRpcDenied:true,ledgerProtected:true,cloudWrites:false}));
}finally{if(started)await run('pg_ctl',['-D',join(dir,'data'),'-m','fast','-w','stop']);}
