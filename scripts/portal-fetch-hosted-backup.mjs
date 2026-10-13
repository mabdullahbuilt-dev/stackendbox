// Download only encrypted artifacts for an isolated owner-authorized restore.
import {readFile,realpath,mkdtemp} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {join,resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {assertPrivatePermissions,sha256File} from './lib/offsite-backup.mjs';
const owner='mabdullah.built@gmail.com',folder='1myfe2U3XTBILqOVp77dTbSMDGwRkUj7m';
try{
  const [credentialFile,outputRoot,runId]=process.argv.slice(2);
  if(!credentialFile||!outputRoot||!/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(runId))throw Error('backup_download_scope_invalid');
  const repo=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..')),root=await realpath(outputRoot),credential=await realpath(credentialFile);
  if([root,credential].some(path=>path===repo||path.startsWith(repo+sep)))throw Error('backup_download_private_path_required');
  const saved=JSON.parse(await readFile(credential,'utf8'));
  if(saved.owner!==owner||saved.folder!==folder||saved.scope!=='https://www.googleapis.com/auth/drive.file')throw Error('backup_download_owner_invalid');
  const request=async(url,options={})=>{const result=await fetch(url,{...options,signal:AbortSignal.timeout(120000)});if(!result.ok)throw Error('backup_download_provider_failed');return result;};
  const auth=await (await request('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:saved.client_id,client_secret:saved.client_secret,refresh_token:saved.refresh_token,grant_type:'refresh_token'})})).json();
  const headers={Authorization:`Bearer ${auth.access_token}`};
  const drive=async(path)=>(await request(`https://www.googleapis.com/drive/v3/${path}`,{headers})).json();
  if((await drive('about?fields=user(emailAddress)')).user?.emailAddress!==owner)throw Error('backup_download_owner_invalid');
  const permissions=await drive(`files/${folder}/permissions?fields=permissions(type,role,emailAddress),nextPageToken`);
  if(permissions.nextPageToken)throw Error('backup_permissions_incomplete');assertPrivatePermissions(permissions.permissions||[],owner);
  const query=`'${folder}' in parents and trashed=false and name='backup-${runId}' and appProperties has { key='system' and value='stackendbox-encrypted-backup' } and appProperties has { key='state' and value='complete' }`;
  const generations=await drive(`files?q=${encodeURIComponent(query)}&fields=files(id),nextPageToken&pageSize=100`);
  if(generations.nextPageToken||generations.files?.length!==1)throw Error('backup_verified_generation_missing');
  const files=await drive(`files?q=${encodeURIComponent(`'${generations.files[0].id}' in parents and trashed=false`)}&fields=files(id,name,size,sha256Checksum),nextPageToken&pageSize=1000`);
  if(files.nextPageToken||!files.files?.length||!['database.dump.enc','manifest.enc','summary.json.enc'].every(name=>files.files.some(file=>file.name===name)))throw Error('backup_artifacts_incomplete');
  const destination=await mkdtemp(join(root,`hosted-${runId}-`)),verified=[];
  for(const file of files.files){
    if(!/^(database\.dump\.enc|manifest\.enc|summary\.json\.enc|object-\d+\.enc)$/.test(file.name)||!Number.isSafeInteger(Number(file.size))||Number(file.size)<1)throw Error('backup_artifact_invalid');
    const result=await request(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,{headers});
    const path=join(destination,file.name);await pipeline(Readable.fromWeb(result.body),createWriteStream(path,{flags:'wx',mode:0o600}));
    const digest=await sha256File(path);
    if(typeof file.sha256Checksum!=='string'||digest!==file.sha256Checksum)throw Error('backup_download_checksum_mismatch');
    verified.push({name:file.name,sha256:digest,bytes:Number(file.size)});
  }
  console.log(JSON.stringify({status:'downloaded',runId,directory:destination,files:verified,privateFolderVerified:true,googleChecksumVerified:true}));
}catch{console.error('Hosted backup download failed safely. No credential or provider response body is logged.');process.exitCode=1;}
