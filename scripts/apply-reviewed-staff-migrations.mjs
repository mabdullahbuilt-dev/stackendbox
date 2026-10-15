import {readFile} from 'node:fs/promises';
import {cli,query,projectRef} from './lib/supabase-access.mjs';
let stage='preflight';
try{
 if(projectRef!=='irzjkdxxfvobtabwkqmz')throw Error('existing_project_required');
 const count=await query("select count(*)::int as count from public.portal_accounts where role='staff'");
 if(count[0]?.count!==0)throw Error('existing_staff_requires_owner_review');
 for(const name of ['202610150001_staff_permissions.sql','202610150002_staff_provisioning_guards.sql','202610150003_support_operations.sql']){
  const version=name.slice(0,12),prior=await query(`select version from public.portal_schema_releases where version='${version}'`);
  if(!prior.length){stage=version;await cli(['db','query','--linked','--project-ref',projectRef,await readFile('supabase/migrations/'+name,'utf8')]);}
  if(!(await query(`select version from public.portal_schema_releases where version='${version}'`)).length)throw Error('migration_not_confirmed');
 }
 const gate=await query('select enabled from public.portal_staff_rollout where id');
 if(gate[0]?.enabled!==false)throw Error('hosted_staff_gate_must_remain_disabled');
 console.log(JSON.stringify({migrations:['202610150001','202610150002','202610150003'],verified:true,staffPrivilegesEnabled:false,staffAccountsCreated:0,providerCredentialsChanged:false}));
}catch(error){console.error(JSON.stringify({error:'reviewed_staff_migration_failed',stage,reason:error.message==='existing_staff_requires_owner_review'?error.message:'diagnostic_withheld'}));process.exitCode=1;}
