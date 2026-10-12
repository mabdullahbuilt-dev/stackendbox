import {readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const dir=process.env.PORTAL_VERCEL_CONFIG;
if(!dir)throw new Error('Authenticated Vercel configuration required');
const {token}=JSON.parse(await readFile(`${dir}/auth.json`,'utf8'));
const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
if(project.projectName!=='stackendbox'||project.projectId!=='prj_K2ZRC5sHMG1y2BE6BetT3mRGOGvz')throw new Error('Wrong project');
const base=`https://api.vercel.com/v9/projects/${project.projectId}`;
async function request(path='',method='GET',body){
 const r=await fetch(`${base}${path}?teamId=${project.orgId}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
 const data=await r.json();if(!r.ok)throw new Error(`Vercel request failed (${r.status}, ${data.error?.code||'unknown'})`);return data;
}
const initial=await request();
if(initial.link?.productionBranch!=='main'||initial.ssoProtection?.deploymentType!=='all_except_custom_domains')throw new Error('Production branch or protection needs review');
const {envs}=await request('/env');
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SPACESHIP_API_KEY','SPACESHIP_API_SECRET','BREVO_CLIENT_API_KEY','BREVO_CLIENT_SENDER_EMAIL','BREVO_CLIENT_SENDER_NAME','BREVO_CLIENT_REPLY_TO','NEXT_PUBLIC_TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','BREVO_API_KEY'];
const missing=required.filter(key=>!envs.some(e=>e.key===key&&e.target.includes('production')&&!e.gitBranch));
if(missing.length)throw new Error(`Missing Production variables: ${missing.join(', ')}`);
const flags={PORTAL_APP_URL:'https://www.stackendbox.com',WHOP_MODE:'sandbox',PORTAL_SANDBOX_CHECKOUT_ENABLED:'false',PORTAL_JOBS_ENABLED:'false',DOMAIN_LIVE_PURCHASES_ENABLED:'false',DOMAIN_LIVE_RENEWALS_ENABLED:'false',DOMAIN_LIVE_MUTATIONS_ENABLED:'false',DOMAIN_MUTATION_ALLOWLIST:''};
for(const [key,value] of Object.entries(flags)){
 const current=envs.find(e=>e.key===key&&e.target.includes('production')&&!e.gitBranch);
 if(current&&current.target.length!==1)throw new Error(`Shared flag ${key} needs separate scopes`);
 if(current)await request(`/env/${current.id}`,'PATCH',{value,type:'plain',target:['production']});
 else await request('/env','POST',{key,value,type:'plain',target:['production']});
 console.log(`${key}: Production configured`);
}
const cron=envs.find(e=>e.key==='CRON_SECRET');
if(cron&&!cron.target.includes('production'))await request(`/env/${cron.id}`,'PATCH',{target:[...cron.target,'production']});
if(!cron)await request('/env','POST',{key:'CRON_SECRET',value:randomBytes(32).toString('hex'),type:'sensitive',target:['production']});
console.log(JSON.stringify({project:initial.name,productionBranch:initial.link.productionBranch,rollbackDeployment:initial.targets?.production?.id,rollbackUrl:initial.targets?.production?.url,requiredProductionVariablesPresent:true,previewProtection:initial.ssoProtection,livePaymentsEnabled:false,liveRegistrarMutationsEnabled:false}));
