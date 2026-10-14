// Bounded read-only Worker telemetry. Discard headers, bodies and logs in memory.
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','tail','--config','wrangler.production-candidate.jsonc','--format','json'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let buffer='',ended=false;const samples=[];
const timer=setTimeout(()=>child.kill(),60000);
child.stdout.on('data',chunk=>{
  buffer+=chunk.toString();let start=buffer.indexOf('{');
  while(start>=0){
    let depth=0,quoted=false,escaped=false,end=-1;
    for(let i=start;i<buffer.length;i++){const c=buffer[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}}
    if(end<0)break;
    try{const event=JSON.parse(buffer.slice(start,end)),url=event.event?.request?.url;
      if(typeof url==='string'&&new URL(url).hostname==='stackendbox-production.stackendbox.workers.dev'&&new URL(url).pathname.startsWith('/client-portal/api/'))samples.push({path:new URL(url).pathname.replace(/\/[0-9a-f-]{36}(?=\/|$)/g,'/:id'),outcome:event.outcome,cpuTimeMs:Number.isFinite(event.cpuTime)?event.cpuTime:null,wallTimeMs:Number.isFinite(event.wallTime)?event.wallTime:null,exceptions:event.exceptions?.length||0});
    }catch{}
    buffer=buffer.slice(end);start=buffer.indexOf('{');
    if(samples.length>=20)child.kill();
  }
});
child.stderr.on('data',()=>{});
child.on('error',()=>{clearTimeout(timer);console.error('Candidate observation unavailable. Sensitive output withheld.');process.exitCode=1;});
child.on('exit',async()=>{if(ended)return;ended=true;clearTimeout(timer);const cpu=samples.map(s=>s.cpuTimeMs).filter(v=>v!==null);const report={checkedAt:new Date().toISOString(),worker:'stackendbox-production',samples,observedRequests:samples.length,maxObservedCpuMs:cpu.length?Math.max(...cpu):null,cpuReported:!!cpu.length,scope:'Actual hosted candidate Worker request telemetry only. No headers, cookies, request bodies or console logs retained. Not distinct hosted tenant load or a billing-meter snapshot.'};await writeFile('dist/portal-evidence/candidate-worker-requests.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,samples:undefined}));});
