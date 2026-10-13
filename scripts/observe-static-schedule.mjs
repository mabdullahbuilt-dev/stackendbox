import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','tail','--config','wrangler.static.jsonc','--format','json'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
let buffer='',done=false;
const timer=setTimeout(()=>{if(!done){console.log(JSON.stringify({scheduledEventObserved:false,reason:'bounded_observation_timeout'}));child.kill();}},15*60*1000);
child.stdout.on('data',chunk=>{
  buffer+=chunk.toString();
  let start=buffer.indexOf('{');
  while(start>=0){
    let depth=0,quoted=false,escaped=false,end=-1;
    for(let i=start;i<buffer.length;i++){
      const c=buffer[i];
      if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue;}
      if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&--depth===0){end=i+1;break;}
    }
    if(end<0)break;
    try{
      const event=JSON.parse(buffer.slice(start,end));
      if(event.event?.cron&&!done){
        done=true;
        console.log(JSON.stringify({scheduledEventObserved:true,cron:event.event.cron,outcome:event.outcome,cpuTimeMs:event.cpuTime,wallTimeMs:event.wallTime,exceptions:event.exceptions?.length??0,
          completionLog:(event.logs||[]).some(l=>(l.message||[]).some(m=>typeof m==='string'&&m.includes('portal_schedule_complete')))}));
        clearTimeout(timer);child.kill();
      }
    }catch{}
    buffer=buffer.slice(end);start=buffer.indexOf('{');
  }
});
child.stderr.on('data',()=>{});
child.on('error',()=>{clearTimeout(timer);console.error('Schedule observation unavailable. Sensitive output withheld.');process.exitCode=1;});
child.on('exit',code=>{clearTimeout(timer);if(!done&&code)console.log(JSON.stringify({scheduledEventObserved:false,reason:'observer_stopped'}));});
