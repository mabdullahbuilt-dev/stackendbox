// Read-only inspection of the existing production candidate. Never deploys.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const origin='https://stackendbox-production.stackendbox.workers.dev';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const assets=[['/','index.html'],['/site.js','site.js'],['/site.css','site.css'],['/client-portal/_assets/portal.js','portal.js'],['/client-portal/_assets/portal.css','portal.css'],['/client-portal/_assets/release.json','release.json'],['/robots.txt','robots.txt'],['/sitemap.xml','sitemap.xml']];
const checks=await Promise.all(assets.map(async([path,file])=>{
  const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  const bytes=Buffer.from(await response.arrayBuffer()),text=bytes.toString('utf8');
  const local=await readFile('dist/static/'+file);
  const acceptanceOrigins=[...new Set(text.match(/https?:\/\/(?:stackendbox-(?:static-|cf-)?acceptance|stackendbox-portal-preview)[^\s"'<>)]*/g)||[])];
  return {path,status:response.status,bytes:bytes.length,sha256:sha(bytes),matchesPreparedArtifact:sha(bytes)===sha(local),acceptanceOriginCount:acceptanceOrigins.length,candidateNoindex:response.headers.get('x-robots-tag'),...(file==='release.json'?{release:JSON.parse(text)}:{})};
}));
const result={checkedAt:new Date().toISOString(),origin,checks,passed:checks.every(c=>c.status===200&&c.matchesPreparedArtifact&&c.acceptanceOriginCount===0),scope:'Deployed bytes and acceptance URL scan. Browser functionality and secret-configuration checks are separate. Candidate noindex is intentional and must be removed in the separately approved main-domain build.'};
console.log(JSON.stringify(result,null,2));
if(!result.passed)process.exitCode=1;
