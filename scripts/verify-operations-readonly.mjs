// Read-only validation of the new admin read models. No user session impersonation.
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {cli,projectRef} from './lib/supabase-access.mjs';
const runtime=resolve('platform/edge/next-runtime.ts');
await build({stdin:{contents:'export {operationsData} from "./lib/portal/operations-data"; export {clientDirectory,operationalHealth} from "./lib/portal/admin-data";',resolveDir:process.cwd(),loader:'ts'},outfile:'dist/edge/read-model-verification.mjs',bundle:true,platform:'node',format:'esm',plugins:[{name:'server-adapters',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'empty'}));b.onLoad({filter:/.*/,namespace:'empty'},()=>({contents:'export {}'}));b.onResolve({filter:/^next\/(headers|server)$/},()=>({path:runtime}));}}]});
try{
  const testEmail=process.env.STACKENDBOX_TEST_CLIENT_EMAIL,testDomain=process.env.STACKENDBOX_TEST_DOMAIN;
  if(!testEmail||!testDomain)throw Error('authorized_test_identity_required');
  const keys=JSON.parse(await cli(['projects','api-keys','--project-ref',projectRef,'--reveal','--output','json']));
  process.env.NEXT_PUBLIC_SUPABASE_URL=`https://${projectRef}.supabase.co`;
  process.env.SUPABASE_SECRET_KEY=keys.find(k=>k.type==='secret')?.api_key;
  if(!process.env.SUPABASE_SECRET_KEY)throw Error('missing_configuration');
  const {operationsData,clientDirectory,operationalHealth}=await import(pathToFileURL(resolve('dist/edge/read-model-verification.mjs')).href);
  const health=await operationalHealth();
  if(health.backups.some(b=>'destination_ref' in b||Object.keys(b.detail).some(k=>!['offsite','objects','checksum_readback_verified'].includes(k))))throw Error('health_response_metadata_exposed');
  console.log(JSON.stringify({healthReadOnly:true,backupRecords:health.backups.length,backupMetadataMinimized:true}));
  const start=Date.now(),snapshot=await operationsData(),operationsMs=Date.now()-start;
  const directory=await clientDirectory(undefined,testEmail);
  if(directory.clients.length!==1)throw Error('expected_authorized_test_client');
  const profile=await clientDirectory(undefined,'',directory.clients[0].id);
  const domain=await clientDirectory(undefined,testDomain);
  if(profile.clients.length!==1||domain.clients[0]?.id!==directory.clients[0].id)throw Error('profile_or_domain_search_mismatch');
  const noMatch=await clientDirectory(undefined,'nonexistent-safe-fixture-987654321');
  if(noMatch.clients.length)throw Error('search_scope_failed');
  console.log(JSON.stringify({readOnly:true,counts:snapshot.counts,queues:Object.fromEntries(['domains','orders','email','operations','ledger','quotes','audit'].map(k=>[k,snapshot[k].length])),emailSearch:true,domainSearch:true,exactProfile:true,noMatch:true,operationsMs,elapsedMs:Date.now()-start,adminBrowserMfaTested:false}));
}catch{console.error('Read-model verification failed. Raw database output withheld.');process.exitCode=1;}
finally{delete process.env.SUPABASE_SECRET_KEY;}
