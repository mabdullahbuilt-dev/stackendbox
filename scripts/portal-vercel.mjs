import {readFile} from 'node:fs/promises';
const configDir=process.env.PORTAL_VERCEL_CONFIG;
if(!configDir) throw new Error('Set PORTAL_VERCEL_CONFIG to the authenticated CLI configuration directory.');
const auth=JSON.parse(await readFile(`${configDir}/auth.json`,'utf8'));
const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
if(project.projectName!=='stackendbox') throw new Error('Wrong project');
const base=`https://api.vercel.com/v9/projects/${project.projectId}/env`;
async function request(url,method='GET',body) {
  const r=await fetch(`${url}?teamId=${project.orgId}`,{method,headers:{Authorization:`Bearer ${auth.token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  const data=await r.json();if(!r.ok) throw new Error(`Vercel ${r.status}: ${data.error?.code||'request_failed'}`);return data;
}
const {envs}=await request(base);
const needed=['SUPABASE_SECRET_KEY','SPACESHIP_API_KEY','SPACESHIP_API_SECRET','WHOP_SANDBOX_API_KEY','WHOP_SANDBOX_COMPANY_ID','NEXT_PUBLIC_TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','BREVO_CLIENT_API_KEY','BREVO_CLIENT_SENDER_EMAIL','BREVO_CLIENT_SENDER_NAME','BREVO_CLIENT_REPLY_TO'];
for(const e of envs) {
  if(needed.includes(e.key)&&!e.target.includes('preview')) {
    await request(`${base}/${e.id}`,'PATCH',{target:[...e.target,'preview']});
    console.log(`${e.key}: existing value retained; Preview added`);
  }
}
const flags={WHOP_MODE:'sandbox',DOMAIN_LIVE_PURCHASES_ENABLED:'false',DOMAIN_LIVE_RENEWALS_ENABLED:'false'};
for(const [key,value] of Object.entries(flags)) {
  if(!envs.some(e=>e.key===key&&e.target.includes('preview'))) {await request(base,'POST',{key,value,type:'plain',target:['preview']});console.log(`${key}: Preview configured`);}
}
console.log(JSON.stringify({variables:(await request(base)).envs.map(e=>({name:e.key,target:e.target,type:e.type}))}));
