import {readFile,cp,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cli,projectRef} from './lib/supabase-access.mjs';
import {publicProductionConfiguration} from './lib/public-production-config.mjs';
const run=promisify(execFile),root='dist/static',changed=new Set(['portal.js','portal.css','portal.html','release.json']);
const command=(args,env=process.env)=>run(process.execPath,args,{env,windowsHide:true,timeout:120000,maxBuffer:4194304});
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function publicSnapshot(directory=root,prefix=''){
  const result={};
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const path=prefix+entry.name;
    if(entry.isDirectory())Object.assign(result,await publicSnapshot(`${directory}/${entry.name}`,`${path}/`));
    else if(!changed.has(path))result[path]=digest(await readFile(`${directory}/${entry.name}`));
  }
  return result;
}
let stage='scope';
try{
  const config=JSON.parse(await readFile('wrangler.production-candidate.jsonc','utf8'));
  if(config.name!=='stackendbox-production'||config.routes?.length||config.triggers.crons.length)throw Error('unsafe_scope');
  const before=await publicSnapshot();
  if(!before['site.js']||!before['index.html'])throw Error('verified_public_artifacts_required');
  // Do not publish local work under an unrelated commit identifier.
  const status=await run('git',['status','--porcelain','--','components/portal','lib/portal','app/api/portal','platform/edge','platform/static','scripts/build-portals-only.mjs'],{windowsHide:true});
  if(status.stdout.trim())throw Error('commit_portal_changes_before_deployment');
  stage='build';
  const values=await publicProductionConfiguration();
  await command(['scripts/build-static-edge.mjs','--production','--backend-only']);
  await command(['scripts/build-portals-only.mjs'],{...process.env,...values});
  for(const name of changed)await cp(`dist/portals-only/${name}`,`${root}/${name}`);
  if(JSON.stringify(before)!==JSON.stringify(await publicSnapshot()))throw Error('public_artifact_changed');
  stage='edge';
  // Existing bridge, provider credentials and configuration remain untouched.
  await cli(['functions','deploy','stackendbox-production','--project-ref',projectRef,'--no-verify-jwt','--use-api']);
  stage='worker';
  const deployed=await command(['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.production-candidate.jsonc']);
  const version=deployed.stdout.match(/Current Version ID:\s*([a-f0-9-]+)/)?.[1];
  const release=JSON.parse(await readFile(`${root}/release.json`,'utf8'));
  console.log(JSON.stringify({origin:'https://stackendbox-production.stackendbox.workers.dev',version,commit:release.commit,publicFilesPreserved:Object.keys(before).length,providerCredentialsChanged:false,dnsChanged:false,cronChanged:false}));
}catch{console.error(JSON.stringify({error:'portal_candidate_deployment_failed',stage,sensitiveOutputWithheld:true}));process.exitCode=1;}
