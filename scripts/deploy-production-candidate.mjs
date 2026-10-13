import {readFile,mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cli,projectRef} from './lib/supabase-access.mjs';
import {publicProductionConfiguration} from './lib/public-production-config.mjs';
const run=promisify(execFile),origin='https://stackendbox-production.stackendbox.workers.dev';
let directory,stage='scope';
try{
  const config=JSON.parse(await readFile('wrangler.production-candidate.jsonc','utf8'));
  if(config.name!=='stackendbox-production'||config.routes?.length||config.triggers.crons.length)throw Error('unsafe_candidate_scope');
  const bindings=JSON.parse(await cli(['secrets','list','--project-ref',projectRef,'--output','json']));
  if(bindings.some(b=>b.name==='STACKENDBOX_PRODUCTION_CONFIG')&&!process.argv.includes('--resume-candidate'))throw Error('existing_production_binding_not_overwritten');
  const required=['STACKENDBOX_ACCEPTANCE_CONFIG','STACKENDBOX_ACCEPTANCE_SPACESHIP_API_KEY','STACKENDBOX_ACCEPTANCE_SPACESHIP_API_SECRET','STACKENDBOX_ACCEPTANCE_BREVO_API_KEY','STACKENDBOX_ACCEPTANCE_BREVO_CLIENT_API_KEY','STACKENDBOX_ACCEPTANCE_TURNSTILE_SECRET_KEY','STACKENDBOX_ACCEPTANCE_WHOP_SANDBOX_API_KEY','STACKENDBOX_ACCEPTANCE_WHOP_SANDBOX_WEBHOOK_SECRET'];
  if(required.some(name=>!bindings.some(b=>b.name===name)))throw Error('provider_binding_missing');
  stage='build';
  const publicValues=await publicProductionConfiguration();
  await run(process.execPath,['scripts/build-static-edge.mjs','--production','--candidate'],{windowsHide:true,timeout:120000,env:{...process.env,...publicValues}});
  directory=await mkdtemp(join(tmpdir(),'stackendbox-production-candidate-'));
  const user=await run('whoami.exe',['/user','/fo','csv','/nh'],{windowsHide:true});
  const sid=user.stdout.match(/S-1-5-[0-9-]+/)?.[0];if(!sid)throw Error('identity_unavailable');
  await run('icacls.exe',[directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{windowsHide:true});
  const bridge=randomBytes(32).toString('hex');
  const base={NODE_ENV:'production',STACKENDBOX_BRIDGE_SECRET:bridge,PORTAL_APP_URL:origin,VERCEL_ENV:'production'};
  await writeFile(join(directory,'edge.env'),`STACKENDBOX_PRODUCTION_CONFIG=${JSON.stringify(base)}\nSTACKENDBOX_PRODUCTION_TEST_ORIGIN=${origin}\n`,{flag:'wx'});
  await writeFile(join(directory,'worker.json'),JSON.stringify({STACKENDBOX_BRIDGE_SECRET:bridge}),{flag:'wx'});
  stage='edge';
  await cli(['secrets','set','--project-ref',projectRef,'--env-file',join(directory,'edge.env')]);
  await cli(['functions','deploy','stackendbox-production','--project-ref',projectRef,'--no-verify-jwt','--use-api']);
  const boundary=await fetch(`https://${projectRef}.supabase.co/functions/v1/stackendbox-production/api/portal/auth/identity`,{headers:{'x-stackendbox-bridge':bridge},signal:AbortSignal.timeout(30000)});
  if(boundary.status!==401)throw Error('authentication_boundary_failed');
  stage='worker';
  const deployed=await run(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config','wrangler.production-candidate.jsonc','--secrets-file',join(directory,'worker.json')],{windowsHide:true,timeout:120000,maxBuffer:4194304});
  const version=deployed.stdout.match(/Current Version ID:\s*([a-f0-9-]+)/)?.[1];
  console.log(JSON.stringify({origin,version,productionProfileDeployed:true,dnsChanged:false,liveOperationsEnabled:false,providerCredentialsExported:false,privateGatewayBoundary:boundary.status}));
}catch{console.error(JSON.stringify({error:'production_candidate_deployment_failed',stage,sensitiveOutputWithheld:true}));process.exitCode=1;}
finally{if(directory){for(const name of ['edge.env','worker.json'])await unlink(join(directory,name)).catch(()=>{});await rmdir(directory).catch(()=>{});}}
