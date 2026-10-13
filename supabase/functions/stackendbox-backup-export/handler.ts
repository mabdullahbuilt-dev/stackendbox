// Backup-specific service boundary. No SQL, Auth, email, payment or registrar API.
const projectUrl='https://irzjkdxxfvobtabwkqmz.supabase.co';
type Config={token:string;serviceKey:string;url:string};
const response=(status:number,body:unknown)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function matches(a:string,b:string){
  if(a.length!==b.length)return false;
  const [x,y]=await Promise.all([a,b].map(value=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))));
  const left=new Uint8Array(x),right=new Uint8Array(y);let difference=0;
  for(let i=0;i<left.length;i++)difference|=left[i]^right[i];return difference===0;
}
function name(value:unknown){return typeof value==='string'&&value.length>0&&value.length<=1024&&!value.includes('\0')&&!value.split('/').some(part=>part==='..');}
export function backupHandler(config:Config,providerFetch:typeof fetch=fetch){
  return async(req:Request)=>{
    if(config.url!==projectUrl||config.token.length<43||!config.serviceKey)return response(503,{error:'backup_endpoint_unconfigured'});
    if(req.headers.has('origin')||!await matches(req.headers.get('authorization')||'',`Bearer ${config.token}`))return response(401,{error:'backup_authorization_required'});
    if(req.method!=='POST')return response(405,{error:'backup_method_unavailable'});
    try{
      const raw=await req.text();if(raw.length>8192)return response(413,{error:'backup_request_too_large'});
      const data=JSON.parse(raw),headers={apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`};
      const upstream=async(path:string,options:RequestInit={})=>{
        const result=await providerFetch(`${projectUrl}/${path}`,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(90000)});
        if(!result.ok)throw Error('backup_provider_unavailable');return result;
      };
      if(data.operation==='buckets')return response(200,await (await upstream('storage/v1/bucket')).json());
      if(data.operation==='list'){
        if(!name(data.bucket)||typeof data.prefix!=='string'||data.prefix.length>1024||data.prefix.split('/').includes('..')||!Number.isSafeInteger(data.offset)||data.offset<0||data.offset>100000)return response(400,{error:'backup_inventory_invalid'});
        const result=await upstream(`storage/v1/object/list/${encodeURIComponent(data.bucket)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefix:data.prefix,offset:data.offset,limit:100,sortBy:{column:'name',order:'asc'}})});
        return response(200,await result.json());
      }
      if(data.operation==='download'){
        if(!name(data.bucket)||!name(data.path))return response(400,{error:'backup_object_invalid'});
        const result=await upstream(`storage/v1/object/authenticated/${encodeURIComponent(data.bucket)}/${data.path.split('/').map(encodeURIComponent).join('/')}`);
        return new Response(result.body,{headers:{'Content-Type':'application/octet-stream','Cache-Control':'no-store'}});
      }
      if(data.operation==='record'){
        if(typeof data.runId!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(data.runId)||!Number.isSafeInteger(data.bytes)||data.bytes<1||!Number.isSafeInteger(data.objects)||data.objects<0||typeof data.sha256!=='string'||!/^[a-f0-9]{64}$/.test(data.sha256)||typeof data.generation!=='string'||!/^[A-Za-z0-9_-]{10,100}$/.test(data.generation))return response(400,{error:'backup_record_invalid'});
        const existing=await (await upstream(`rest/v1/portal_backup_runs?kind=eq.backup&destination_ref=eq.${encodeURIComponent(data.runId)}&select=id&limit=1`)).json();
        if(existing.length)return response(200,{recorded:true,alreadyRecorded:true});
        await upstream('rest/v1/portal_backup_runs',{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({kind:'backup',status:'completed',completed_at:new Date().toISOString(),bytes:data.bytes,artifact_sha256:data.sha256,destination_ref:data.runId,includes_auth:true,includes_objects:true,detail:{offsite:true,objects:data.objects,drive_generation:data.generation,checksum_readback_verified:true}})});
        return response(200,{recorded:true});
      }
      return response(400,{error:'backup_operation_unavailable'});
    }catch{return response(502,{error:'backup_export_failed'});}
  };
}
