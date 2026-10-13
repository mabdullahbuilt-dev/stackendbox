import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {Readable} from 'node:stream';
import {fileURLToPath} from 'node:url';
import {encryptStream,sha256File,assertPrivatePermissions,retirementCandidates} from './lib/offsite-backup.mjs';
const project='irzjkdxxfvobtabwkqmz',owner='mabdullah.built@gmail.com';
const names=['BACKUP_DATABASE_URL','BACKUP_SUPABASE_SECRET_KEY','BACKUP_PUBLIC_KEY','BACKUP_DRIVE_CLIENT_ID','BACKUP_DRIVE_CLIENT_SECRET','BACKUP_DRIVE_REFRESH_TOKEN','BACKUP_DRIVE_FOLDER_ID'];
async function request(url,options={}){
  const response=await fetch(url,{...options,signal:AbortSignal.timeout(120000)});
  if(!response.ok)throw Error(`backup_provider_http_${response.status}`);return response;
}
export async function runOffsiteBackup(env=process.env){
  for(const name of names)if(!env[name]?.trim())throw Error('backup_credential_missing');
  if(env.BACKUP_DRIVE_FOLDER_ID!=='1myfe2U3XTBILqOVp77dTbSMDGwRkUj7m')throw Error('backup_destination_mismatch');
  const connection=new URL(env.BACKUP_DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(connection.protocol)||!(/\.supabase\.(co|com)$/.test(connection.hostname))||!decodeURIComponent(connection.username).includes(project)&&connection.hostname!==`db.${project}.supabase.co`)throw Error('backup_database_scope_invalid');
  const root=await mkdtemp(join(tmpdir(),'stackendbox-cloud-backup-'));
  const runId=new Date().toISOString().replace(/[:.]/g,'-');let token;
  try{
    const auth=await (await request('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.BACKUP_DRIVE_CLIENT_ID,client_secret:env.BACKUP_DRIVE_CLIENT_SECRET,refresh_token:env.BACKUP_DRIVE_REFRESH_TOKEN,grant_type:'refresh_token'})})).json();
    if(typeof auth.access_token!=='string')throw Error('backup_oauth_failed');token=auth.access_token;
    const driveHeaders={Authorization:`Bearer ${token}`};
    const drive=async(path,options={})=>(await request(`https://www.googleapis.com/drive/v3/${path}`,{...options,headers:{...driveHeaders,...options.headers}})).json();
    const permissions=await drive(`files/${env.BACKUP_DRIVE_FOLDER_ID}/permissions?fields=permissions(type,role,emailAddress),nextPageToken`);
    if(permissions.nextPageToken)throw Error('backup_permissions_incomplete');assertPrivatePermissions(permissions.permissions||[],owner);
    const generation=await drive('files?fields=id',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:`backup-${runId}`,mimeType:'application/vnd.google-apps.folder',parents:[env.BACKUP_DRIVE_FOLDER_ID],appProperties:{system:'stackendbox-encrypted-backup',state:'incomplete'}})});
    const files=[],objects=[];
    async function save(name,source){
      const path=join(root,name),digest=await encryptStream(source,path,env.BACKUP_PUBLIC_KEY);
      const init=await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id',{method:'POST',headers:{...driveHeaders,'Content-Type':'application/json','X-Upload-Content-Type':'application/octet-stream','X-Upload-Content-Length':String(digest.bytes)},body:JSON.stringify({name,parents:[generation.id]})});
      const location=init.headers.get('location');
      if(!location||new URL(location).hostname!=='www.googleapis.com'||new URL(location).protocol!=='https:')throw Error('backup_upload_location_invalid');
      // An ambiguous upload stops the generation. Never claim completion or
      // retire a previous generation after an unknown write outcome.
      const uploaded=await (await request(location,{method:'PUT',headers:{...driveHeaders,'Content-Type':'application/octet-stream','Content-Length':String(digest.bytes)},body:createReadStream(path),duplex:'half'})).json();
      const downloaded=await request(`https://www.googleapis.com/drive/v3/files/${uploaded.id}?alt=media`,{headers:driveHeaders});
      const verifiedPath=join(root,`${name}.readback`);
      const {createWriteStream}=await import('node:fs');const {pipeline}=await import('node:stream/promises');
      await pipeline(Readable.fromWeb(downloaded.body),createWriteStream(verifiedPath,{flags:'wx',mode:0o600}));
      if(await sha256File(verifiedPath)!==digest.sha256)throw Error('backup_upload_checksum_mismatch');
      files.push({name,...digest});return name;
    }
    const pgEnv={...process.env,PGHOST:connection.hostname,PGPORT:connection.port||'5432',PGUSER:decodeURIComponent(connection.username),PGPASSWORD:decodeURIComponent(connection.password),PGDATABASE:connection.pathname.slice(1)||'postgres',PGSSLMODE:'verify-full',PGSSLROOTCERT:'system',PGCONNECT_TIMEOUT:'20'};
    const args=['--format=custom','--no-owner','--schema=public','--schema=auth','--schema=storage','--schema=supabase_migrations'];
    const child=spawn('docker',['run','--rm',...['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE','PGSSLROOTCERT','PGCONNECT_TIMEOUT'].flatMap(n=>['-e',n]),'postgres:17','pg_dump',...args],{env:pgEnv,stdio:['ignore','pipe','pipe']});
    child.stderr.resume();const ended=new Promise((res,rej)=>{child.on('error',()=>rej(Error('backup_dump_start_failed')));child.on('close',code=>code===0?res():rej(Error('backup_dump_failed')));});
    await Promise.all([save('database.dump.enc',child.stdout),ended]);
    const storageHeaders={apikey:env.BACKUP_SUPABASE_SECRET_KEY,Authorization:`Bearer ${env.BACKUP_SUPABASE_SECRET_KEY}`};
    const storage=async(path,options={})=>request(`https://${project}.supabase.co/storage/v1/${path}`,{...options,headers:{...storageHeaders,...options.headers}});
    const buckets=await (await storage('bucket')).json();if(!Array.isArray(buckets))throw Error('backup_bucket_inventory_invalid');
    for(const bucket of buckets){
      if(typeof bucket.id!=='string')throw Error('backup_bucket_inventory_invalid');
      async function walk(prefix=''){
        for(let offset=0;;offset+=100){
          const items=await (await storage(`object/list/${encodeURIComponent(bucket.id)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefix,offset,limit:100,sortBy:{column:'name',order:'asc'}})})).json();
          if(!Array.isArray(items))throw Error('backup_object_inventory_invalid');
          for(const item of items){
            if(typeof item.name!=='string')throw Error('backup_object_inventory_invalid');
            const objectPath=prefix?`${prefix}/${item.name}`:item.name;
            if(!item.id){await walk(objectPath);continue;}
            const response=await storage(`object/authenticated/${encodeURIComponent(bucket.id)}/${objectPath.split('/').map(encodeURIComponent).join('/')}`);
            const file=await save(`object-${objects.length}.enc`,Readable.fromWeb(response.body));objects.push({bucket:bucket.id,path:objectPath,file,id:item.id});
          }
          if(items.length<100)break;
        }
      }
      await walk();
    }
    const manifest={version:1,project,runId,status:'completed',includesAuth:true,includesObjects:true,files:[...files],objects};
    await save('manifest.enc',Readable.from([Buffer.from(JSON.stringify(manifest))]));
    await save('summary.json.enc',Readable.from([Buffer.from(JSON.stringify({runId,status:'completed',encrypted:true,includesAuth:true,objects:objects.length,files:[...files],restoreTested:false}))]));
    await drive(`files/${generation.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({appProperties:{system:'stackendbox-encrypted-backup',state:'complete'}})});
    await request(`https://${project}.supabase.co/rest/v1/portal_backup_runs`,{method:'POST',headers:{...storageHeaders,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({kind:'backup',status:'completed',completed_at:new Date().toISOString(),bytes:files.reduce((total,file)=>total+file.bytes,0),artifact_sha256:files[0].sha256,destination_ref:runId,includes_auth:true,includes_objects:true,detail:{offsite:true,objects:objects.length,drive_generation:generation.id,checksum_readback_verified:true}})});
    const listing=[];let page='';
    do{
      const q=`'${env.BACKUP_DRIVE_FOLDER_ID}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder' and appProperties has { key='system' and value='stackendbox-encrypted-backup' }`;
      const result=await drive(`files?q=${encodeURIComponent(q)}&fields=files(id,name,appProperties),nextPageToken&pageSize=100${page?`&pageToken=${encodeURIComponent(page)}`:''}`);listing.push(...(result.files||[]));page=result.nextPageToken||'';
    }while(page);
    // Recoverable Trash only. Never touch manually uploaded custody packages,
    // incomplete runs or files outside this exact app-owned folder scope.
    const retired=retirementCandidates(listing,14);
    for(const file of retired)await drive(`files/${file.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});
    return {status:'completed',runId,encryptedFiles:files.length,objects:objects.length,retired:retired.length,offsite:true,checksumReadbackVerified:true};
  }finally{
    // Exact mkdtemp child only, no user directory or decrypted material.
    if(dirname(root)!==resolve(tmpdir())||!root.startsWith(join(resolve(tmpdir()),'stackendbox-cloud-backup-')))throw Error('backup_cleanup_scope_invalid');
    await rm(root,{recursive:true,force:true});token=undefined;
  }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(await runOffsiteBackup()));}
  catch{console.error('Encrypted offsite backup failed. No credential, database content or provider error body is logged. Previous verified generations are retained.');process.exitCode=1;}
}
