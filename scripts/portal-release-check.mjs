import { readFile } from 'node:fs/promises';
const dir=process.env.PORTAL_VERCEL_CONFIG;
if(!dir)throw new Error('Authenticated Vercel configuration required');
const {token}=JSON.parse(await readFile(`${dir}/auth.json`,'utf8'));
const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
if(project.projectId!=='prj_K2ZRC5sHMG1y2BE6BetT3mRGOGvz')throw new Error('Wrong project');
async function get(path){const r=await fetch(`https://api.vercel.com${path}${path.includes('?')?'&':'?'}teamId=${project.orgId}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`Vercel preflight failed (${r.status})`);return r.json();}
const [team,info,domains,variables]=await Promise.all([get(`/v2/teams/${project.orgId}`),get(`/v9/projects/${project.projectId}`),get(`/v9/projects/${project.projectId}/domains`),get(`/v9/projects/${project.projectId}/env`)]);
const required={PORTAL_APP_URL:'https://www.stackendbox.com',WHOP_MODE:'sandbox',PORTAL_SANDBOX_CHECKOUT_ENABLED:'false',DOMAIN_LIVE_PURCHASES_ENABLED:'false',DOMAIN_LIVE_RENEWALS_ENABLED:'false',DOMAIN_LIVE_MUTATIONS_ENABLED:'false',DOMAIN_MUTATION_ALLOWLIST:''};
const checks={existingProject:info.name==='stackendbox',productionBranch:info.link?.productionBranch==='main',commercialHosting:['pro','enterprise'].includes(team.billing?.plan),previewProtected:info.ssoProtection?.deploymentType==='all_except_custom_domains',wwwVerified:domains.domains?.some(d=>d.name==='www.stackendbox.com'&&d.verified&&!d.gitBranch&&!d.redirect),rootRedirect:domains.domains?.some(d=>d.name==='stackendbox.com'&&d.redirect==='www.stackendbox.com'),rollbackAvailable:!!info.targets?.production?.id};
for(const [key,value] of Object.entries(required)){
 const env=variables.envs.find(e=>e.key===key&&e.target.includes('production')&&!e.gitBranch);
 const actual=env?await get(`/v9/projects/${project.projectId}/env/${env.id}`):null;
 checks[key]=actual?.value===value;
}
console.log(JSON.stringify({project:info.name,plan:team.billing?.plan,rollbackDeployment:info.targets?.production?.id,checks},null,2));
if(Object.values(checks).some(value=>!value)){console.error('Production release held. Resolve failed preflight checks before publishing.');process.exitCode=1;}
