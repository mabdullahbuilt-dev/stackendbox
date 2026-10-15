import {readFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
const run=promisify(execFile);
try{
 const state=JSON.parse(await readFile('dist/isolated-auth/local-status.json','utf8'));
 if(state.runtime!=='native'||!state.identity?.project_root?.startsWith('/tmp/stackendbox-auth-'))throw Error('isolated_runtime_required');
 const database=new URL(state.env.DB_URL);
 if(!['localhost','127.0.0.1'].includes(database.hostname))throw Error('local_database_required');
 const name=process.argv[2]||'202610150001_staff_permissions.sql';
 if(!['202610150001_staff_permissions.sql','202610150002_staff_provisioning_guards.sql','202610150003_support_operations.sql','202610150004_service_lifecycle.sql'].includes(name))throw Error('reviewed_migration_required');
 const version=name.slice(0,12),file=resolve('supabase/migrations/'+name),linux='/mnt/'+file[0].toLowerCase()+file.slice(2).replaceAll('\\','/');
 const prior=await run('wsl',['-d','Ubuntu','--','psql',database.href,'-X','-Atc',`select count(*) from public.portal_schema_releases where version='${version}'`],{windowsHide:true,timeout:60000});
 if(prior.stdout.trim()==='1'){console.log(JSON.stringify({migration:version,isolatedAlreadyApplied:true,hostedProjectChanged:false}));process.exit(0);}
 await run('wsl',['-d','Ubuntu','--','psql',database.href,'-X','-v','ON_ERROR_STOP=1','-f',linux],{windowsHide:true,timeout:60000});
 console.log(JSON.stringify({migration:version,isolatedApplied:true,hostedProjectChanged:false}));
}catch(error){const diagnostic=String(error.stderr||'').split('\n').filter(line=>/ERROR:|FATAL:/.test(line)).map(line=>line.replace(/postgres(?:ql)?:\/\/\S+/g,'[connection withheld]')).slice(-2);console.error(JSON.stringify({error:'isolated_staff_migration_failed',diagnostic,sensitiveOutputWithheld:true}));process.exitCode=1;}
