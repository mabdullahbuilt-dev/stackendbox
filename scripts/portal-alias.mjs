import { readFile } from 'node:fs/promises';
const config=process.env.PORTAL_VERCEL_CONFIG;
const deployment=process.env.PORTAL_PREVIEW_DEPLOYMENT;
if(!config || !deployment)throw new Error('Provide authenticated config and Preview deployment URL.');
const {token}=JSON.parse(await readFile(`${config}/auth.json`,'utf8'));
const project=JSON.parse(await readFile('.vercel/project.json','utf8'));
if(project.projectName!=='stackendbox')throw new Error('Wrong project');
const alias='stackendbox-portal-preview.vercel.app';
async function request(path,method='GET',body,allowMissing=false) {
  const r=await fetch(`https://api.vercel.com${path}?teamId=${project.orgId}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(allowMissing && r.status===404)return null;
  const result=await r.json();
  if(!r.ok)throw new Error(`Vercel ${r.status}: ${result.error?.code||'request_failed'}`);
  return result;
}
const target=await request(`/v13/deployments/${new URL(deployment).hostname}`);
if(target.projectId!==project.projectId || target.target==='production' || target.readyState!=='READY')throw new Error('Expected a Ready Preview in the existing project.');
const existing=await request(`/v4/aliases/${alias}`,'GET',undefined,true);
if(existing && existing.projectId!==project.projectId)throw new Error('Alias belongs to another project. No change made.');
if(existing?.deploymentId!==target.id)await request(`/v2/deployments/${target.id}/aliases`,'POST',{alias});
const verified=await request(`/v4/aliases/${alias}`);
if(verified.deploymentId!==target.id)throw new Error('Alias verification failed.');
console.log(`Verified Preview alias: https://${alias}`);
