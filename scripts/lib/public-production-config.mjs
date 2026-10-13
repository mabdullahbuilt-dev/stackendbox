import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function publicProductionConfiguration(){
  const directory=process.env.PORTAL_VERCEL_CONFIG;
  if(!directory)throw Error('Existing authenticated Vercel configuration required for public-site parity');
  const {token}=JSON.parse(await readFile(join(directory,'auth.json'),'utf8'));
  const base='https://api.vercel.com/v9/projects/prj_K2ZRC5sHMG1y2BE6BetT3mRGOGvz/env';
  const get=async suffix=>{const r=await fetch(`${base}${suffix}?teamId=team_7Q8We1Dt1iS6ZWjLovf5Qf4c`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Public configuration read failed');return r.json();};
  const names=['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_COMPANY_EMAIL','NEXT_PUBLIC_CAL_URL','NEXT_PUBLIC_CONTACT_PHONE','NEXT_PUBLIC_WHATSAPP_URL','NEXT_PUBLIC_GITHUB_URL','NEXT_PUBLIC_LINKEDIN_URL','NEXT_PUBLIC_X_URL','NEXT_PUBLIC_ANALYTICS_ENDPOINT','NEXT_PUBLIC_TURNSTILE_SITE_KEY'];
  const {envs}=await get(''),values={};
  for(const name of names){
    const record=envs.find(e=>e.key===name&&e.target.includes('production')&&!e.gitBranch);
    if(!record)continue;
    if(record.type==='sensitive')throw Error('Public setting unexpectedly non-exportable');
    const value=(await get(`/${record.id}`)).value;
    if(typeof value!=='string'||/placeholder|redacted/i.test(value))throw Error('Public setting unverified');
    values[name]=value;
  }
  return values;
}
