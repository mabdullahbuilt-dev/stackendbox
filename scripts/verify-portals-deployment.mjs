// Read-only acceptance checks. Never targets the frozen public website.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const production=process.argv.includes('--production-candidate');
const fullSite=process.argv.includes('--full-site');
if(fullSite&&!production)throw Error('Full site checks require the isolated production candidate');
const origin=production?'https://stackendbox-production.stackendbox.workers.dev':'https://stackendbox-static-acceptance.stackendbox.workers.dev';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const results=[];
const manifestResponse=await fetch(`${origin}/client-portal/_assets/release.json`,{signal:AbortSignal.timeout(30000)});
if(!manifestResponse.ok)throw Error('Deployed release metadata unavailable');
const release=await manifestResponse.json();
if(!/^[a-f0-9]{40}$/.test(release.commit)||release.scope!=='portal-only'||release.uncommittedInputs?.length)throw Error('Release not built from committed portal sources');
for(const [path,status] of [['/',fullSite?200:404],['/api/contact',404],['/client-portal/login',200],['/admin/renewals',200],['/client-portal/api/admin/renewals',401]]){
  const start=performance.now(),response=await fetch(origin+path,{signal:AbortSignal.timeout(30000),redirect:'manual'});
  await response.arrayBuffer();
  if(response.status!==status)throw Error(`Unexpected status for ${path}: ${response.status}`);
  if(path.includes('/api/')&&status===401&&response.headers.get('x-stackendbox-release')!==release.commit)throw Error('Backend commit differs from frontend release');
  if(path.startsWith('/client-portal/api/')&&!response.headers.get('content-type')?.includes('application/json'))throw Error('Private API returned a non-JSON fallback');
  results.push({path,status:response.status,elapsedMs:Math.round(performance.now()-start)});
}
for(const file of ['portal.js','portal.css']){
  const response=await fetch(`${origin}/client-portal/_assets/${file}`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Missing deployed ${file}`);
  const hash=sha(Buffer.from(await response.arrayBuffer()));
  if(hash!==sha(await readFile(`dist/portals-only/${file}`)))throw Error(`Deployed asset differs: ${file}`);
  results.push({asset:file,sha256:hash,matchesLocalBuild:true});
}
if(production)for(const file of ['backup-authorization.html','backup-privacy.html']){
  const response=await fetch(`${origin}/${file}`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok||sha(Buffer.from(await response.arrayBuffer()))!==sha(await readFile(`public/${file}`)))throw Error('Approved OAuth notice not preserved');
  results.push({resource:file,approvedOriginalPreserved:true});
}
console.log(JSON.stringify({acceptanceOnly:!production,productionCandidateOnly:production,readOnly:true,release,backendMatchesRelease:true,checks:results},null,2));
