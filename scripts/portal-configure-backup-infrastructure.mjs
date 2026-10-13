// Explicitly owner-approved backup setup. Values stay outside source and stdout.
import {spawn} from 'node:child_process';
import {randomBytes,pbkdf2Sync,createHmac,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,realpath,rm} from 'node:fs/promises';
import {join,resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {cli,query,postgresEnv,projectRef} from './lib/supabase-access.mjs';
import {verifiedRootCertificate} from './lib/offsite-backup.mjs';
const repository='mabdullahbuilt-dev/stackendbox',environment='stackendbox-backups',role='stackendbox_backup_reader';
let setupStage='preflight';
function command(binary,args,input,env=process.env){return new Promise((res,rej)=>{
  const child=spawn(binary,args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});const chunks=[],errors=[];
  child.stdout.on('data',data=>chunks.push(data));child.stderr.on('data',data=>errors.push(data));child.stdin.on('error',()=>{});
  child.on('error',()=>rej(Error('backup_setup_command_failed')));child.on('close',code=>{
    if(code===0)return res(Buffer.concat(chunks).toString());
    const text=Buffer.concat(errors).toString(),error=Error('backup_setup_command_failed');
    error.providerClass=/password authentication failed/i.test(text)?'database_authentication_failed':/root certificate|SSL|certificate/i.test(text)?'database_tls_failed':/permission denied/i.test(text)?'database_permissions_failed':/does not exist/i.test(text)?'database_relation_missing':'provider_command_failed';
    rej(error);
  });child.stdin.end(input);
});}
const api=async(path,body,method='PUT')=>{setupStage=`GitHub ${method} ${path}`;return JSON.parse(await command('gh',['api',path,'--method',method,...(body?['--input','-']:[])],body?JSON.stringify(body):undefined));};
export function scramPassword(password){
  const salt=randomBytes(16),salted=pbkdf2Sync(password,salt,4096,32,'sha256');
  const stored=createHash('sha256').update(createHmac('sha256',salted).update('Client Key').digest()).digest('base64');
  const server=createHmac('sha256',salted).update('Server Key').digest('base64');
  return `SCRAM-SHA-256$4096:${salt.toString('base64')}$${stored}:${server}`;
}
async function secret(name,value){await command('gh',['secret','set',name,'--repo',repository,'--env',environment],value);}
async function scope(){
  if(!process.env.GH_CONFIG_DIR)throw Error('scoped_github_auth_required');
  const user=await api('user',null,'GET');if(user.login!=='mabdullahbuilt-dev')throw Error('backup_github_owner_mismatch');
  const repo=await api(`repos/${repository}`,null,'GET');if(repo.full_name!==repository||repo.default_branch!=='main'||!repo.permissions?.admin)throw Error('backup_repository_scope_invalid');
}
async function githubBoundary(){
  await scope();const branch=await api(`repos/${repository}/branches/main`,null,'GET');
  // Never overwrite existing protection. For this initially unprotected branch,
  // require PRs and prevent force pushes/deletion, including by administrators.
  // Sole repository writer is the owner. No unavailable second reviewer required.
  if(!branch.protected)await api(`repos/${repository}/branches/main/protection`,{required_status_checks:null,enforce_admins:true,required_pull_request_reviews:{dismiss_stale_reviews:true,require_code_owner_reviews:false,required_approving_review_count:0,require_last_push_approval:false},restrictions:null,allow_force_pushes:false,allow_deletions:false,required_conversation_resolution:true});
  const confirmed=await api(`repos/${repository}/branches/main`,null,'GET');if(!confirmed.protected)throw Error('backup_branch_not_protected');
  await api(`repos/${repository}/environments/${environment}`,{deployment_branch_policy:{protected_branches:false,custom_branch_policies:true}});
  const policies=await api(`repos/${repository}/environments/${environment}/deployment-branch-policies`,null,'GET');
  if(policies.branch_policies.some(item=>item.name!=='main'||item.type!=='branch'))throw Error('backup_environment_unexpected_branch');
  if(!policies.branch_policies.length)await api(`repos/${repository}/environments/${environment}/deployment-branch-policies`,{name:'main',type:'branch'},'POST');
  console.log(JSON.stringify({environment,branch:'main',protected:true,onlyMainBranch:true,repositorySecretsWritten:false}));
}
async function databaseAndExport(directory){
  await scope();const repo=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..')),root=await realpath(directory);
  if(root===repo||root.startsWith(repo+sep))throw Error('backup_credentials_must_be_outside_repository');
  const destination=join(root,'stackendbox-backup-runtime.json');
  // Resume only the exact credential this setup generated, never rotate an
  // unrelated existing role. Persist before SQL so a failed stage is recoverable.
  let saved;try{saved=JSON.parse(await readFile(destination,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  setupStage='Read-only database role preflight';
  const existing=await query(`SELECT rolname FROM pg_roles WHERE rolname='${role}'`);if(existing.length&&!saved)throw Error('backup_role_already_exists');
  const current=await postgresEnv();if(!/\.pooler\.supabase\.com$/.test(current.PGHOST)||current.PGPORT!=='5432')throw Error('backup_session_pooler_unverified');
  let password,token,uri;
  if(saved){
    uri=new URL(saved.database_url);
    if(saved.project!==projectRef||saved.role!==role||saved.environment!==environment||uri.hostname!==current.PGHOST||uri.port!==current.PGPORT||decodeURIComponent(uri.username)!==`${role}.${projectRef}`||typeof saved.export_token!=='string'||saved.export_token.length<43)throw Error('backup_saved_scope_invalid');
    password=decodeURIComponent(uri.password);token=saved.export_token;
  }else{
    password=randomBytes(36).toString('base64url');token=randomBytes(48).toString('base64url');
    uri=new URL(`postgresql://${current.PGHOST}:${current.PGPORT}/${current.PGDATABASE}`);uri.username=`${role}.${projectRef}`;uri.password=password;
    await writeFile(destination,JSON.stringify({database_url:uri.href,export_token:token,project:projectRef,role,environment,created_at:new Date().toISOString()}),{flag:'wx',mode:0o600});
  }
  const schemas=['public','auth','storage','supabase_migrations'];
  const grants=schemas.map(schema=>`GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${role}; GRANT SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role}; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ${schema} GRANT SELECT ON TABLES TO ${role}; ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA ${schema} GRANT SELECT ON SEQUENCES TO ${role};`).join('\n');
  if(!existing.length){setupStage='Create read-only backup role and scoped grants';await query(`BEGIN; CREATE ROLE ${role} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION BYPASSRLS CONNECTION LIMIT 2 PASSWORD '${scramPassword(password)}'; ALTER ROLE ${role} SET default_transaction_read_only=on; ${grants} COMMIT; SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname='${role}';`);}
  // Supabase protects auth schema USAGE from direct delegation by postgres.
  // Its delegated built-in read-all role supplies that access without granting
  // DML, administration or membership in postgres/service_role. This is DB-wide
  // read access, not a falsely claimed four-schema permission boundary.
  const authUsage=await query(`SELECT has_schema_privilege('${role}','auth','USAGE') AS available`);
  if(!authUsage[0]?.available){setupStage='Grant supported read-only Auth backup access';await query(`GRANT pg_read_all_data TO ${role} WITH INHERIT TRUE, SET FALSE; SELECT has_schema_privilege('${role}','auth','USAGE') AS available;`);}
  if(!process.env.POSTGRES_BIN)throw Error('postgres_client_required');
  const certificate=await verifiedRootCertificate();
  // Supabase's documented private CA isn't part of Mozilla/system CA bundles.
  // Trust its pinned public certificate for this process, with full host checks.
  const dbEnv={...process.env,PGHOST:current.PGHOST,PGPORT:current.PGPORT,PGUSER:`${role}.${projectRef}`,PGPASSWORD:password,PGDATABASE:current.PGDATABASE,PGSSLMODE:'verify-full',PGSSLROOTCERT:certificate,PGCONNECT_TIMEOUT:'20'};
  setupStage='Verify restricted database login and permissions';
  const checked=await command(join(process.env.POSTGRES_BIN,process.platform==='win32'?'psql.exe':'psql'),['--no-psqlrc','--tuples-only','--no-align','--set','ON_ERROR_STOP=1','--command',"SELECT current_user, (SELECT count(*) FROM auth.users)>=0, has_table_privilege(current_user,'public.portal_clients','SELECT'),has_table_privilege(current_user,'public.portal_clients','INSERT'),has_table_privilege(current_user,'public.portal_clients','UPDATE'),has_table_privilege(current_user,'public.portal_clients','DELETE'),has_schema_privilege(current_user,'public','CREATE');"],undefined,dbEnv);
  if(checked.trim()!==`${role}|t|t|f|f|f|f`)throw Error('backup_readonly_privileges_failed');
  const writes=await query(`SELECT count(*) FILTER (WHERE has_table_privilege('${role}',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) AS writable_tables, count(*) AS checked_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','auth','storage','supabase_migrations') AND c.relkind IN ('r','p');`);
  if(Number(writes[0]?.writable_tables)!==0||Number(writes[0]?.checked_tables)<1)throw Error('backup_unexpected_write_permission');
  const temporary=join(root,`backup-bootstrap-${randomBytes(8).toString('hex')}`);await mkdir(temporary,{mode:0o700});
  try{
    const file=join(temporary,'function.env');await writeFile(file,`STACKENDBOX_BACKUP_EXPORT_TOKEN=${token}\n`,{flag:'wx',mode:0o600});
    setupStage='Set backup-only Edge token';await cli(['secrets','set','--project-ref',projectRef,'--env-file',file]);
    setupStage='Deploy separate backup export function';await cli(['functions','deploy','stackendbox-backup-export','--project-ref',projectRef,'--no-verify-jwt','--use-api']);
    const endpoint=`https://${projectRef}.supabase.co/functions/v1/stackendbox-backup-export`;
    setupStage='Verify deployed backup endpoint';if((await fetch(endpoint,{method:'POST',body:'{}',signal:AbortSignal.timeout(20000)})).status!==401)throw Error('backup_endpoint_anonymous_check_failed');
    const probe=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({operation:'buckets'}),signal:AbortSignal.timeout(20000)});
    if(!probe.ok||!Array.isArray(await probe.json()))throw Error('backup_endpoint_storage_check_failed');
    const denied=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({operation:'delete'}),signal:AbortSignal.timeout(20000)});
    if(denied.status!==400)throw Error('backup_endpoint_scope_check_failed');
    await secret('STACKENDBOX_BACKUP_DATABASE_URL',uri.href);
    await secret('STACKENDBOX_BACKUP_EXPORT_TOKEN',token);
    await secret('STACKENDBOX_BACKUP_PUBLIC_KEY',await readFile(join(root,'recipient.pem'),'utf8'));
    console.log(JSON.stringify({role,readonlyConnectionVerified:true,storageEndpointVerified:true,anonymousDenied:true,mutationsDenied:true,privilegedSupabaseKeySentToGithub:false,environmentSecretsConfigured:3,scheduledJobEnabled:false}));
  }finally{
    if(dirname(temporary)!==root||!temporary.startsWith(join(root,'backup-bootstrap-')))throw Error('backup_temporary_scope_invalid');
    await rm(temporary,{recursive:true,force:true});
  }
}
async function googleCredentials(file){
  await scope();
  const repo=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..')),path=await realpath(file);
  if(path===repo||path.startsWith(repo+sep))throw Error('backup_credentials_must_be_outside_repository');
  const saved=JSON.parse(await readFile(path,'utf8'));
  if(saved.owner!=='mabdullah.built@gmail.com'||saved.folder!=='1myfe2U3XTBILqOVp77dTbSMDGwRkUj7m'||saved.scope!=='https://www.googleapis.com/auth/drive.file'||saved.client_id!=='214822050919-if0hcng6ee5am1f9k7q7r7s0lcllrh28.apps.googleusercontent.com'||typeof saved.client_secret!=='string'||typeof saved.refresh_token!=='string')throw Error('backup_google_scope_invalid');
  const policy=await api(`repos/${repository}/environments/${environment}/deployment-branch-policies`,null,'GET');
  if(policy.branch_policies.length!==1||policy.branch_policies[0].name!=='main'||policy.branch_policies[0].type!=='branch')throw Error('backup_environment_scope_invalid');
  setupStage='Seal approved Google credentials in backup environment';
  await secret('STACKENDBOX_BACKUP_DRIVE_CLIENT_ID',saved.client_id);
  await secret('STACKENDBOX_BACKUP_DRIVE_CLIENT_SECRET',saved.client_secret);
  await secret('STACKENDBOX_BACKUP_DRIVE_REFRESH_TOKEN',saved.refresh_token);
  console.log(JSON.stringify({ownerVerified:true,scope:'drive.file',googleEnvironmentSecretsConfigured:3,reportedRefreshTokenLifetimeSeconds:saved.refresh_token_expires_in,scheduledJobEnabled:false}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv[2]==='--approved-github-boundary')await githubBoundary();
    else if(process.argv[2]==='--approved-database-and-export'&&process.argv[3])await databaseAndExport(process.argv[3]);
    else if(process.argv[2]==='--approved-google-credentials'&&process.argv[3])await googleCredentials(process.argv[3]);
    else throw Error('explicit_setup_stage_required');
  }catch(error){console.error(JSON.stringify({status:'stopped',stage:setupStage,errorType:error?.name||'Error',providerClass:error?.providerClass||null,providerOutputWithheld:true}));process.exitCode=1;}
}
