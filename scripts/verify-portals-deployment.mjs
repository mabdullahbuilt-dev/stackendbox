// Read-only acceptance checks. Never targets the frozen public website.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin='https://stackendbox-static-acceptance.stackendbox.workers.dev';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const results=[];
for(const [path,status] of [['/',404],['/api/contact',404],['/client-portal/login',200],['/admin/renewals',200],['/client-portal/api/admin/renewals',401]]){
  const start=performance.now(),response=await fetch(origin+path,{signal:AbortSignal.timeout(30000),redirect:'manual'});
  await response.arrayBuffer();
  if(response.status!==status)throw Error(`Unexpected status for ${path}: ${response.status}`);
  results.push({path,status:response.status,elapsedMs:Math.round(performance.now()-start)});
}
for(const file of ['portal.js','portal.css']){
  const response=await fetch(`${origin}/client-portal/_assets/${file}`,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw Error(`Missing deployed ${file}`);
  const hash=sha(Buffer.from(await response.arrayBuffer()));
  if(hash!==sha(await readFile(`dist/portals-only/${file}`)))throw Error(`Deployed asset differs: ${file}`);
  results.push({asset:file,sha256:hash,matchesLocalBuild:true});
}
console.log(JSON.stringify({acceptanceOnly:true,readOnly:true,checks:results},null,2));
