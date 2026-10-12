import { readFile } from 'node:fs/promises';
const dir=process.env.PORTAL_VERCEL_CONFIG;
if(!dir)throw new Error('Authenticated Vercel configuration required');
const {token}=JSON.parse(await readFile(`${dir}/auth.json`,'utf8'));
const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
if(project.projectId!=='prj_K2ZRC5sHMG1y2BE6BetT3mRGOGvz')throw new Error('Wrong project');
async function get(path){const r=await fetch(`https://api.vercel.com${path}${path.includes('?')?'&':'?'}teamId=${project.orgId}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`Vercel preflight failed (${r.status})`);return r.json();}
const [team,info,domains,variables]=await Promise.all([get(`/v2/teams/${project.orgId}`),get(`/v9/projects/${project.projectId}`),get(`/v9/projects/${project.projectId}/domains`),get(`/v9/projects/${project.projectId}/env`)]);
const required={PORTAL_APP_URL:'https://www.stackendbox.com',WHOP_MODE:'sandbox',PORTAL_SANDBOX_CHECKOUT_ENABLED:'false',PORTAL_JOBS_ENABLED:'false',DOMAIN_LIVE_PURCHASES_ENABLED:'false',DOMAIN_LIVE_RENEWALS_ENABLED:'false',DOMAIN_LIVE_MUTATIONS_ENABLED:'false',DOMAIN_MUTATION_ALLOWLIST:''};
const checks={existingProject:info.name==='stackendbox',productionBranch:info.link?.productionBranch==='main',previewProtected:['all_except_custom_domains','prod_deployment_urls_and_all_previews'].includes(info.ssoProtection?.deploymentType),wwwVerified:domains.domains?.some(d=>d.name==='www.stackendbox.com'&&d.verified&&!d.gitBranch&&!d.redirect),rootRedirect:domains.domains?.some(d=>d.name==='stackendbox.com'&&d.redirect==='www.stackendbox.com'),rollbackAvailable:!!info.targets?.production?.id};
checks.productionSecretScopes=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SPACESHIP_API_KEY','SPACESHIP_API_SECRET','BREVO_CLIENT_API_KEY','BREVO_CLIENT_SENDER_EMAIL','BREVO_CLIENT_SENDER_NAME','BREVO_CLIENT_REPLY_TO','NEXT_PUBLIC_TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','BREVO_API_KEY','CRON_SECRET'].every(key=>variables.envs.some(e=>e.key===key&&e.target.includes('production')&&!e.gitBranch));
for(const [key,value] of Object.entries(required)){
 const env=variables.envs.find(e=>e.key===key&&e.target.includes('production')&&!e.gitBranch);
 const actual=env?await get(`/v9/projects/${project.projectId}/env/${env.id}`):null;
 checks[key]=actual?.value===value;
}
const technicalConfigurationReady=Object.values(checks).every(Boolean);
const commercialPlanPermitsUse=['pro','enterprise'].includes(team.billing?.plan);
console.log(JSON.stringify({project:info.name,plan:team.billing?.plan,rollbackDeployment:info.targets?.production?.id,technicalConfigurationReady,commercialPlanPermitsUse,checks,scope:'Configuration preflight, separate from build and end-to-end acceptance tests'},null,2));
if(!technicalConfigurationReady){console.error('Technical configuration checks failed.');process.exitCode=1;}
else if(!commercialPlanPermitsUse)console.error('Technical configuration passed. Commercial publication remains held by the Hobby usage policy. Development verification can continue.');
